// Local review harness for #71. Fixtures live only in tests/debate-preview/.
// Remove this harness when interactive design review is no longer needed.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const upstream = "http://localhost:3000";
const port = Number(process.env.DEBATE_PREVIEW_PORT || 3100);
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/__preview__/bridge.js", ["bridge.js", "application/javascript; charset=utf-8"]],
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${port}`);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Security-Policy", "connect-src 'self' http://localhost:3000 ws://localhost:3000; form-action 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405).end("Preview only: external writes are disabled.");
      return;
    }
    if (files.has(url.pathname)) {
      const [file, type] = files.get(url.pathname);
      response.setHeader("Content-Type", type);
      response.end(await readFile(new URL(file, import.meta.url)));
      return;
    }
    // API fixtures are intercepted in the test frame, never proxied to the real backend.
    if (url.pathname.startsWith("/api/") || !["/debates/preview", "/favicon.ico"].includes(url.pathname) && !/^\/(?:_next|images)\//.test(url.pathname)) {
      response.writeHead(404).end("This path is not part of the local preview.");
      return;
    }
    if (url.pathname === "/_next/image" && !url.searchParams.get("url")?.startsWith("/")) {
      response.writeHead(403).end("Remote images are disabled in preview.");
      return;
    }
    const headers = { Accept: request.headers.accept || "*/*", "Accept-Encoding": "identity" };
    for (const name of ["rsc", "next-router-state-tree", "next-router-prefetch", "next-url"]) {
      if (request.headers[name]) headers[name] = request.headers[name];
    }
    const result = await fetch(new URL(url.pathname + url.search, upstream), { headers, redirect: "manual" });
    if (result.status >= 300 && result.status < 400) {
      response.writeHead(502).end("Unexpected redirect from the frontend server.");
      return;
    }
    const type = result.headers.get("content-type") || "application/octet-stream";
    response.writeHead(result.status, { "Content-Type": type });
    if (type.includes("text/html")) {
      const html = await result.text();
      response.end(html.replace("<head>", '<head><script src="/__preview__/bridge.js"></script>'));
    } else {
      response.end(Buffer.from(await result.arrayBuffer()));
    }
  } catch (error) {
    if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`프론트 서버(localhost:3000)를 먼저 실행해주세요.\n${error.message}`);
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Debate review sample: http://localhost:${port}\nUses the actual frontend on ${upstream}; API and STOMP fixtures stay inside the sample frame.`));

import { NextResponse } from "next/server";

import { revokeToken } from "@/lib/auth-store/memory";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token) {
    revokeToken(token);
  }

  return NextResponse.json({ ok: true });
}

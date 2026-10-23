import localFont from "next/font/local";

// Scoped to the landing page's <main>; shared navigation keeps its existing font.
export const homeFont = localFont({
  src: "./fonts/pangyeori-home.woff2",
  variable: "--font-home",
  weight: "400 700",
  display: "swap",
  fallback: ["Arial"],
});

import type { Metadata } from "next";
import { AtelierHome } from "@/features/home/atelier/AtelierHome";

export const metadata: Metadata = {
  title: "판겨리 — 디자인 다듬기 시안",
  robots: { index: false, follow: false },
};

export default function RefinedHomePage() {
  return <AtelierHome refined />;
}

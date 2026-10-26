import type { Metadata } from "next";
import { AtelierHome } from "@/features/home/atelier/AtelierHome";
export const metadata: Metadata = { title: "판겨리 — 만화 법정 시안", robots: { index: false, follow: false } };
export default function ComicHomePage() { return <AtelierHome />; }

import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";

export default function MyPageLayout({ children }: { children: ReactNode }) {
  return <>{children}<SiteFooter /></>;
}

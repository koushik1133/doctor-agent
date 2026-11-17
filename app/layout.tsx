import "./globals.css";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";

const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-bricolage", display: "swap" });

export const metadata: Metadata = {
  title: "Referral Desk — find the right specialist from your records",
  description:
    "Upload your medical records. We read them, work out which specialist you need, and rank nearby doctors using public CMS quality and outcome data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${atkinson.variable} ${bricolage.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <SiteHeader />
        <div id="main">{children}</div>
      </body>
    </html>
  );
}

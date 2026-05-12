import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Doctor Agent — After-hours triage",
  description: "Voice-first AI triage for after-hours patient calls.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

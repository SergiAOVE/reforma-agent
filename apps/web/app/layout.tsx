import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "reforma-agent",
  description: "Phase 0 foundation for an open source renovation tracking PWA"
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "reforma-agent",
  description: "Intelligent home renovation tracking",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          padding: "2rem",
          maxWidth: "42rem",
          marginInline: "auto",
          lineHeight: 1.6,
        }}
      >
        {children}
      </body>
    </html>
  );
}

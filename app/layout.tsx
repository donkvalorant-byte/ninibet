import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NINIBET",
  description: "Play coin casino",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

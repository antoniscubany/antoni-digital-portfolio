import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SONIC DIAGNOSTIC — AI Audio Analysis",
  description:
    "AI-powered predictive maintenance through real-time audio frequency analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

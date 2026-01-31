import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/providers/SmoothScrollProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ANTO-LAB | Architecting Digital Velocity",
  description:
    "Precision-engineered AI systems for high-stakes business growth. We don't just design; we build engines.",
  keywords: ["AI", "Digital Agency", "Web Development", "Machine Learning", "Automation"],
  authors: [{ name: "ANTO-LAB" }],
  openGraph: {
    title: "ANTO-LAB | Architecting Digital Velocity",
    description:
      "Precision-engineered AI systems for high-stakes business growth.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#030303]`}
      >
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}

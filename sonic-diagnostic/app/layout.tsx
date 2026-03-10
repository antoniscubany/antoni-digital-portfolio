import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export const metadata: Metadata = {
  title: "SONIC DIAGNOSTIC — AI Audio Analysis",
  description:
    "AI-powered predictive maintenance through real-time audio frequency analysis.",
};

export const maxDuration = 60; // Ustawia limit na 60 sekund (wymaga konta Vercel Pro dla >15s)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased">
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}

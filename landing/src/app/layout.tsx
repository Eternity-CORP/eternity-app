import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-Y Wallet — Web3 for Everyone",
  description: "Send crypto to @usernames instead of addresses. Multi-chain support, BLIK payment codes, intelligent cross-chain routing — all in one self-custody wallet.",
  keywords: ["crypto wallet", "web3", "ethereum", "polygon", "arbitrum", "multi-chain", "BLIK", "EY-ID"],
  openGraph: {
    title: "E-Y Wallet — Web3 for Everyone",
    description: "Send crypto to @usernames. BLIK payment codes. Intelligent cross-chain routing. Self-custody.",
    type: "website",
    siteName: "E-Y Wallet",
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Y Wallet — Web3 for Everyone",
    description: "Send crypto to @usernames. BLIK payment codes. Intelligent cross-chain routing. Self-custody.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OKUN Systems – Client Portal",
  description: "OKUN Systems B2B Client Portal",
  icons: {
    icon: "/okun-icon.svg",
    apple: "/okun-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#080c14] text-[#eef2f7]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

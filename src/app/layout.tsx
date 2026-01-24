import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grace Caretakers Timesheet",
  description: "Official employee time card submission portal for Grace Caretakers.",
  openGraph: {
    title: "Grace Caretakers Timesheet",
    description: "Official employee time card submission portal for Grace Caretakers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grace Caretakers Timesheet",
    description: "Official employee time card submission portal for Grace Caretakers.",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

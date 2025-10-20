import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "@/providers/auth";
import { Toaster } from "@/components/ui/sonner"
import Script from "next/script";
import { TrackJS } from "@/components/track-js";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vibe3 - Building Apps Easily with AI",
  description: "Transform your ideas into apps in seconds with Vibe3's AI-powered development platform. Build web applications, calculators, blogs, and more with just a simple prompt.",
  keywords: ["AI", "app development", "web development", "no-code", "low-code", "artificial intelligence", "web applications"],
  authors: [{ name: "Vibe3 Team" }],
  creator: "Vibe3",
  publisher: "Vibe3",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Vibe3",
    title: "Vibe3 - Building Apps Easily with AI",
    description: "Transform your ideas into apps in seconds with Vibe3's AI-powered development platform. Build web applications, calculators, blogs, and more with just a simple prompt.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vibe3 - AI-Powered App Development Platform",
        type: "image/png",
      },
    ],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {
          process.env.NODE_ENV === "production" && (
            <>
              <Script
                defer
                data-domain="vibe3.me"
                src="https://analytics.wamo.club/js/script.hash.outbound-links.js"
              />
              <Script id="plausible-init" strategy="afterInteractive">
                {`
                  window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }
                `}
              </Script>
            </>
          )
        }
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <AuthProvider>
          <TrackJS />
          <Toaster />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

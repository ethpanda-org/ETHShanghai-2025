// app/layout.tsx
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NOMOS",
  description: "Proof → Score → UBI",
  openGraph: {
    title: "NOMOS",
    description: "Share your on-chain NOMOS identity.",
    url: "https://你的域名",
    type: "website",
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${pixel.variable} bg-black text-white`}>{children}</div>;
}

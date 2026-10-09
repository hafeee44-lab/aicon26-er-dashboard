import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Nastaliq_Urdu, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "ER Command · AICON'26",
  description: "AI-assisted emergency department operations dashboard for safer triage, allocation and surge response.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${nastaliq.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans, Noto_Nastaliq_Urdu } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const ui = Plus_Jakarta_Sans({ variable: "--font-ui", subsets: ["latin"], display: "swap" });
const data = Geist_Mono({ variable: "--font-data", subsets: ["latin"], display: "swap" });
const nastaliq = Noto_Nastaliq_Urdu({ variable: "--font-nastaliq", subsets: ["arabic"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "ER Command · Nothing gets missed",
  description:
    "Hospital operations for overloaded wards: the AI reads the notes and charts, code turns them into tasks with an owner and a due time, and anything overdue is escalated.",
};

export const viewport: Viewport = {
  themeColor: "#f3f6f5",
};

const restoreTheme = `try{var t=localStorage.getItem("erc-care-theme");if(t==="paper"||t==="monitor")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="paper"
      suppressHydrationWarning
      className={`${ui.variable} ${data.variable} ${nastaliq.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: restoreTheme }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

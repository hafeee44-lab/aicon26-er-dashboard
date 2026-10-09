import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Caveat, Noto_Nastaliq_Urdu } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const ui = Atkinson_Hyperlegible_Next({ variable: "--font-ui", subsets: ["latin"] });
const data = Atkinson_Hyperlegible_Mono({ variable: "--font-data", subsets: ["latin"] });
const pen = Caveat({ variable: "--font-pen", subsets: ["latin"] });
const nastaliq = Noto_Nastaliq_Urdu({ variable: "--font-nastaliq", subsets: ["arabic"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "ER Command · Nothing gets missed",
  description:
    "Hospital operations for overloaded wards: the AI reads the notes and charts, code turns them into tasks with an owner and a due time, and anything overdue is escalated.",
};

export const viewport: Viewport = {
  themeColor: "#050707",
};

const restoreTheme = `try{var t=localStorage.getItem("erc-theme");if(t==="paper"||t==="monitor")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="monitor"
      suppressHydrationWarning
      className={`${ui.variable} ${data.variable} ${pen.variable} ${nastaliq.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: restoreTheme }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

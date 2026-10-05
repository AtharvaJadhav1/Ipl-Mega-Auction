import type { Metadata } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import { PrefsPanel } from "@/components/PrefsPanel";
import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "IPL Mega Auction Simulator",
  description: "Run an IPL franchise through a live mega-auction simulation using verified 2026 data.",
};

// Applies saved display preferences before first paint so the theme never flashes.
const PREFS_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("ipl-prefs")||"{}");var r=document.documentElement;r.dataset.theme=p.theme==="light"?"light":"dark";r.dataset.motion=p.reducedMotion?"reduced":"full";r.dataset.cb=p.colorBlind?"1":"0"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" data-motion="full" data-cb="0" suppressHydrationWarning className={`${display.variable} ${body.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
          Skip to content
        </a>
        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>
        <PrefsPanel />
      </body>
    </html>
  );
}

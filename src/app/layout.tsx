import type { ReactNode } from "react";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "منظومة تتبع القضايا — اللجنة العليا للمسئولية الطبية",
  description: "نظام إلكتروني لتتبع قضايا المسئولية الطبية — اللجنة العليا للمسئولية الطبية",
  robots: "noindex, nofollow",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${tajawal.variable}`} suppressHydrationWarning>
      <body className="font-body text-[15px] bg-slate-50 text-slate-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${tajawal.variable}`}>
      <body className="font-body text-[15px] bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

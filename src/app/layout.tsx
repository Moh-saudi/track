import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "منظومة تتبع القضايا — اللجنة العليا للمسئولية الطبية",
  description: "نظام إلكتروني لتتبع قضايا المسئولية الطبية — اللجنة العليا للمسئولية الطبية",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

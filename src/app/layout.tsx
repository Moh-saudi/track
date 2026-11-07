import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "منظومة تتبع القضايا — اللجنة العليا للمسئولية الطبية",
  description: "نظام إلكتروني لتتبع قضايا المسئولية الطبية — اللجنة العليا للمسئولية الطبية",
  robots: "noindex, nofollow",
  icons: {
    icon: [{ url: "/logo.svg?v=eagle-20260918", type: "image/svg+xml" }],
    shortcut: "/logo.svg?v=eagle-20260918",
    apple: "/logo.svg?v=eagle-20260918",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body text-[15px] bg-slate-50 text-slate-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// 👇 Keep page metadata here (without themeColor)
export const metadata: Metadata = {
  title: {
    default: "DIU Routine Assist",
    template: "%s · DIU Routine Assist",
  },
  description: "Upload XLSX/CSV to view class routines, teacher info, and empty rooms.",
  // (Optional) meta tags
  other: { "color-scheme": "light" },
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "DIU Routine Assist",
    description: "View DIU routines from XLSX/CSV in your browser.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DIU Routine Assist",
    description: "View DIU routines from XLSX/CSV in your browser.",
  },
};

// 👇 Move themeColor to the viewport export (this silences the warning)
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

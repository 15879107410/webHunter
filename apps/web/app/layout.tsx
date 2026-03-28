import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Website Analyzer",
  description: "输入一个网址，快速看懂它卖什么、卖给谁、怎么收费、为什么有人付费。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}


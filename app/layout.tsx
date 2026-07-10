import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : undefined;
  const socialImage = origin ? `${origin}/og.png` : undefined;

  return {
    title: "Abby Talks | 阅读与数学游戏",
    description: "为 iPad 设计的亲子阅读冒险和数学对战游戏。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Abby Talks",
      description: "在阅读冒险和数学对战中快乐成长。",
      type: "website",
      ...(origin ? { url: origin } : {}),
      ...(socialImage ? { images: [{ url: socialImage, width: 1536, height: 1024, alt: "Abby Talks 阅读与数学游戏" }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: "Abby Talks",
      description: "在阅读冒险和数学对战中快乐成长。",
      ...(socialImage ? { images: [socialImage] } : {}),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff8df",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

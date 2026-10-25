import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ha-ma.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "濵屋雄太｜AI・DX × 地方創生",
    template: "%s｜濵屋雄太",
  },
  description:
    "北海道・根室を拠点に、AI・DXの知識で地方の活力を高める。株式会社AmpTech・タスカルカンパニー・ヘラルド代表取締役。0→1の事業開発、PM・テックリード、AI導入支援。",
  openGraph: {
    type: "profile",
    locale: "ja_JP",
    siteName: "濵屋雄太",
    title: "濵屋雄太｜AI・DX × 地方創生",
    description: "北海道・根室を拠点に、AI・DXの知識で地方の活力を高める。0→1の事業開発、PM・テックリード、AI導入支援。",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

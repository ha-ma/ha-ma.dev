import Link from "next/link";
import type { ReactNode } from "react";
import { profile } from "@/content/profile";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ha-ma.dev";

/** /daily 系ページの共通枠（ヘッダー・著者ブロック・フッター） */
export function DailyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full text-base">
      <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-8">
        <Link href="/" className="font-en text-[15px] font-bold tracking-wide text-ink no-underline">
          YUTA HAMAYA
        </Link>
        <nav aria-label="日報ナビゲーション" className="flex gap-0.5">
          <Link href="/daily" className="rounded-full px-3.5 py-2 text-[13px] font-medium text-ink no-underline hover:bg-navy-tint hover:text-navy">
            Daily
          </Link>
          <a href="/daily/feed.xml" className="rounded-full px-3.5 py-2 text-[13px] font-medium text-ink no-underline hover:bg-navy-tint hover:text-navy">
            RSS
          </a>
          <Link href="/#contact" className="rounded-full bg-navy px-3.5 py-2 text-[13px] font-medium text-white no-underline">
            Contact
          </Link>
        </nav>
      </div>
      <main className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-4 md:px-8">{children}</main>
    </div>
  );
}

export function AuthorBlock() {
  return (
    <aside className="mt-12 flex items-center gap-4 rounded-[10px] border border-line bg-white p-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/profile.jpg" alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 text-sm">
        <p className="font-bold">{profile.name}</p>
        <p className="text-ink-3">{profile.titles[0]}・北海道根室市</p>
        <p className="mt-1 text-xs">
          <Link href="/" className="text-navy">
            プロフィールと実績を見る →
          </Link>
        </p>
      </div>
    </aside>
  );
}

export function personJsonLd() {
  return {
    "@type": "Person",
    "@id": `${siteUrl}/#person`,
    name: profile.name,
    alternateName: profile.nameEn,
    url: siteUrl,
    image: `${siteUrl}/images/profile.jpg`,
    jobTitle: profile.titles,
    address: { "@type": "PostalAddress", addressLocality: "根室市", addressRegion: "北海道", addressCountry: "JP" },
  };
}

export { siteUrl };

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDailyIndex } from "@/lib/daily/public";
import { jstLabel, jstLong } from "@/lib/daily/common";
import { AuthorBlock, DailyShell, siteUrl } from "@/components/public/DailyShell";

export const metadata: Metadata = {
  title: "日報",
  description: "濵屋雄太が毎朝読んだニュースへのコメント。地方創生・協力隊・観光・生成AI・福祉・教育・音楽。根室から。",
  alternates: { canonical: `${siteUrl}/daily`, types: { "application/rss+xml": `${siteUrl}/daily/feed.xml` } },
  openGraph: { type: "website", title: "日報｜濵屋雄太", description: "毎朝読んだニュースへのコメント。根室から。" },
};

export default function DailyIndexPage({ searchParams }: PageProps<"/daily">) {
  return (
    <DailyShell>
      <header className="mb-8">
        <p className="font-en mb-3 text-xs font-semibold tracking-[0.12em] text-orange">DAILY</p>
        <h1 className="mb-2 text-[26px] font-bold leading-snug">日報</h1>
        <p className="text-[15px] leading-relaxed text-ink-2">
          毎朝、関心のあるニュースを読んでコメントを書いています。地方創生・地域おこし協力隊・観光・生成AI・福祉・教育・音楽。出典は見出しからたどれます。
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-ink-3">読み込み中…</p>}>
        <DayList searchParams={searchParams} />
      </Suspense>
      <AuthorBlock />
    </DailyShell>
  );
}

async function DayList({ searchParams }: { searchParams: PageProps<"/daily">["searchParams"] }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const { days, hasNext } = await getDailyIndex(page);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${siteUrl}/daily#blog`,
    name: "濵屋雄太の日報",
    url: `${siteUrl}/daily`,
    inLanguage: "ja",
    author: { "@id": `${siteUrl}/#person` },
    blogPost: days.map((d) => ({ "@type": "BlogPosting", headline: `${jstLong(d.date)}の日報`, url: `${siteUrl}/daily/${d.date}`, datePublished: d.date, dateModified: d.lastUpdated })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {days.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line bg-white p-8 text-center text-sm text-ink-3">まだ公開された日報はありません。</p>
      ) : (
        <ol className="flex flex-col divide-y divide-line-2 border-y border-line-2">
          {days.map((d) => (
            <li key={d.date}>
              <Link href={`/daily/${d.date}`} className="group flex flex-col gap-1 py-4 no-underline md:flex-row md:items-baseline md:gap-6">
                <time dateTime={d.date} className="font-en shrink-0 text-[15px] font-bold text-navy group-hover:underline">
                  {d.date.replace(/-/g, ".")} <span className="font-sans text-xs font-medium text-ink-4">{jstLabel(d.date).slice(-3)}</span>
                </time>
                <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink-2">
                  {d.lead}
                  {d.lead.length >= 90 ? "…" : ""}
                </span>
                <span className="shrink-0 text-xs text-ink-4">{d.count}件</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <nav className="mt-6 flex justify-between text-sm" aria-label="ページ送り">
        {page > 1 ? (
          <Link href={page === 2 ? "/daily" : `/daily?page=${page - 1}`} className="text-navy">
            ← 新しい日報
          </Link>
        ) : (
          <span />
        )}
        {hasNext && (
          <Link href={`/daily?page=${page + 1}`} className="text-navy">
            前の日報 →
          </Link>
        )}
      </nav>
    </>
  );
}

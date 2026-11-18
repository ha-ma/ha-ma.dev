import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDailyDay } from "@/lib/daily/public";
import { jstLabel, jstLong } from "@/lib/daily/common";
import { AuthorBlock, DailyShell, personJsonLd, siteUrl } from "@/components/public/DailyShell";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({ params }: PageProps<"/daily/[date]">): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return {};
  const day = await getDailyDay(date);
  if (!day) return { title: `${jstLong(date)}の日報` };
  const first = day.entries[0]?.comment.public_text?.replace(/\s+/g, " ").slice(0, 110) ?? "";
  return {
    title: `${jstLong(date)}の日報`,
    description: first,
    alternates: { canonical: `${siteUrl}/daily/${date}` },
    openGraph: { type: "article", title: `${jstLong(date)}の日報｜濵屋雄太`, description: first, publishedTime: day.entries[0]?.comment.published_at ?? undefined, modifiedTime: day.updatedAt },
  };
}

export default function DailyDayPage({ params }: PageProps<"/daily/[date]">) {
  return (
    <DailyShell>
      <Suspense fallback={<p className="text-sm text-ink-3">読み込み中…</p>}>
        <DayContent params={params} />
      </Suspense>
    </DailyShell>
  );
}

async function DayContent({ params }: { params: PageProps<"/daily/[date]">["params"] }) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();
  const day = await getDailyDay(date);
  if (!day) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${siteUrl}/daily/${date}#post`,
    headline: `${jstLong(date)}の日報`,
    url: `${siteUrl}/daily/${date}`,
    inLanguage: "ja",
    datePublished: day.entries[0]?.comment.published_at ?? date,
    dateModified: day.updatedAt,
    author: personJsonLd(),
    publisher: { "@id": `${siteUrl}/#person` },
    isPartOf: { "@id": `${siteUrl}/daily#blog` },
    about: Array.from(new Set(day.entries.flatMap((e) => e.comment.tags))),
    citation: day.entries.map((e) => ({ "@type": "CreativeWork", name: e.item.title, url: e.item.url, publisher: e.source?.name })),
    articleBody: day.entries.map((e) => `${e.item.title}\n${e.comment.public_text}`).join("\n\n"),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "濵屋雄太", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "日報", item: `${siteUrl}/daily` },
      { "@type": "ListItem", position: 3, name: jstLong(date), item: `${siteUrl}/daily/${date}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <nav className="mb-6 text-xs text-ink-3" aria-label="パンくず">
        <Link href="/" className="text-ink-3">
          濵屋雄太
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/daily" className="text-ink-3">
          日報
        </Link>
        <span className="mx-1.5">/</span>
        <span>{jstLong(date)}</span>
      </nav>
      <header className="mb-8">
        <p className="font-en mb-3 text-xs font-semibold tracking-[0.12em] text-orange">DAILY</p>
        <h1 className="mb-1 text-[26px] font-bold leading-snug">
          <time dateTime={date}>{jstLong(date)}</time>
          <span className="ml-2 text-base font-medium text-ink-4">{jstLabel(date).slice(-3)}</span>
        </h1>
        <p className="text-sm text-ink-3">{day.entries.length}件にコメント</p>
      </header>

      <div className="flex flex-col gap-8">
        {day.entries.map((e, i) => (
          <article key={e.item.id} id={`e${i + 1}`} className="scroll-mt-20">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
              {e.source?.name && <span>{e.source.name}</span>}
              {e.item.author && e.item.author !== e.source?.name && <span className="text-ink-4">{e.item.author}</span>}
              {e.comment.tags.map((t) => (
                <span key={t} className="rounded-full bg-navy-tint px-2 py-0.5 text-[11px] font-medium text-navy">
                  {t}
                </span>
              ))}
            </div>
            <h2 className="text-[18px] font-bold leading-snug">
              <a href={e.item.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-navy">
                {e.item.title}
                <span className="ml-1 text-sm font-medium text-ink-4">↗</span>
              </a>
            </h2>
            {e.item.summary && <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{e.item.summary.split("\n").slice(0, 2).join(" ")}</p>}
            <div className="mt-3 border-l-[3px] border-orange pl-4">
              <p className="whitespace-pre-line text-[15.5px] leading-[1.9] text-ink">{e.comment.public_text}</p>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-10 text-xs text-ink-4">引用は見出し・出典リンク・要約のみ。コメントは濵屋個人の見解で、所属する組織の見解ではありません。</p>
      <AuthorBlock />
      <nav className="mt-8 text-sm">
        <Link href="/daily" className="text-navy">
          ← 日報の一覧へ
        </Link>
      </nav>
    </>
  );
}

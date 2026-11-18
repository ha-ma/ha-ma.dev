import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { Container, PageHeader } from "@/components/admin/ui";
import { jstDate, jstLabel } from "@/lib/daily/common";
import type { Comment, DailyItem, DailyRun } from "@/types/database";
import { CommentCard } from "./CommentCard";

export const metadata = { title: "日報" };

type ItemRow = DailyItem & { sources: { name: string; url: string | null } | null };

function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export default async function DailyAdminPage({ searchParams }: PageProps<"/admin/daily">) {
  const sp = await searchParams;
  const today = jstDate();
  const dParam = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : today;
  const onlyCommented = sp.f === "commented";
  const { supabase } = await requireAdmin();

  const [{ data: items, error }, { data: comments }, { data: run }, { data: recent }] = await Promise.all([
    supabase.from("daily_items").select("*, sources(name, url)").eq("run_date", dParam).eq("status", "digest").order("rank"),
    supabase.from("comments").select("*").eq("run_date", dParam),
    supabase.from("daily_runs").select("*").eq("run_date", dParam).maybeSingle(),
    supabase.from("daily_runs").select("run_date, digest_count, mailed_at").order("run_date", { ascending: false }).limit(14),
  ]);
  if (error) throw new Error(error.message);
  const byItem = new Map((comments ?? []).map((c) => [c.item_id, c as Comment]));
  const list = ((items ?? []) as ItemRow[]).filter((it) => !onlyCommented || byItem.get(it.id)?.public_text);
  const r = run as DailyRun | null;
  const stages = (r?.stages ?? {}) as Record<string, { error?: number; sources?: number; finished_at?: string } | undefined>;
  const commentedCount = (comments ?? []).filter((c) => c.public_text).length;

  return (
    <Container className="max-w-[760px]">
      <PageHeader title={`日報 ${jstLabel(dParam)}`}>
        <p className="text-xs text-ink-3">
          気になった件にだけコメントを。公開コメントは保存と同時に /daily に出ます。
          {r
            ? ` ／ ${r.mode === "degraded" ? "縮退運転" : "通常"}・収集 ${r.items_collected} 件・採点 ${r.items_scored} 件・コメント ${commentedCount} 件・AI費 $${Number(r.cost_usd).toFixed(2)}`
            : " ／ この日の実行記録はありません"}
          {stages.collect?.error ? `・ソース失敗 ${stages.collect.error} 件` : ""}
        </p>
      </PageHeader>

      <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm" aria-label="日付">
        <Link href={`/admin/daily?d=${shiftDate(dParam, -1)}${onlyCommented ? "&f=commented" : ""}`} className="rounded-full border border-line px-3 py-1 no-underline hover:border-navy">
          ← 前日
        </Link>
        {dParam !== today && (
          <Link href={`/admin/daily?d=${shiftDate(dParam, 1)}${onlyCommented ? "&f=commented" : ""}`} className="rounded-full border border-line px-3 py-1 no-underline hover:border-navy">
            翌日 →
          </Link>
        )}
        <Link href={`/admin/daily?d=${today}`} className="rounded-full border border-line px-3 py-1 no-underline hover:border-navy">
          今日
        </Link>
        <Link
          href={`/admin/daily?d=${dParam}${onlyCommented ? "" : "&f=commented"}`}
          className={`rounded-full px-3 py-1 no-underline ${onlyCommented ? "bg-navy text-white" : "border border-line hover:border-navy"}`}
        >
          コメントした件だけ
        </Link>
        <a href={`/daily/${dParam}`} target="_blank" rel="noreferrer" className="ml-auto text-xs text-navy no-underline hover:underline">
          公開ページ ↗
        </a>
      </nav>

      {list.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line bg-white p-8 text-center text-sm text-ink-3">
          {onlyCommented ? "この日のコメントはまだありません。" : "この日のレポートはありません。Mac mini のバッチが 5:30 に生成します。"}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((it) => (
            <CommentCard
              key={it.id}
              item={{
                id: it.id,
                title: it.title,
                url: it.url,
                summary: it.summary,
                angle: it.angle,
                tags: it.tags,
                rank: it.rank,
                score: it.score,
                sourceName: it.sources?.name ?? it.source_id,
                runDate: dParam,
              }}
              comment={byItem.get(it.id) ?? null}
            />
          ))}
        </div>
      )}

      {recent && recent.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-sm font-bold text-ink-3">直近の実行</h2>
          <ul className="flex flex-wrap gap-2 text-xs">
            {recent.map((x) => (
              <li key={x.run_date}>
                <Link href={`/admin/daily?d=${x.run_date}`} className={`rounded-full px-3 py-1 no-underline ${x.run_date === dParam ? "bg-navy text-white" : "border border-line hover:border-navy"}`}>
                  {x.run_date.slice(5)}・{x.digest_count}件{x.mailed_at ? "" : "・未送信"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}

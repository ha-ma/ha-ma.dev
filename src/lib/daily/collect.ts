import type { Source, SourceKind } from "@/types/database";
import type { Adapter, RawItem } from "@/lib/daily/types";
import { feedAdapter, resolveYouTubeFeed } from "@/lib/daily/adapters/feed";
import { pageAdapter } from "@/lib/daily/adapters/page";
import { canonicalize } from "@/lib/daily/url";
import { looksJapanese } from "@/lib/daily/text";
import { fetchText, pool, recordStage, type Db, type Logger } from "@/lib/daily/common";

export type CollectOptions = {
  db: Db;
  runDate: string;
  /** 対象 kind（省略で全て）。縮退運転では x と page を外す */
  kinds?: SourceKind[];
  /** tier の上限（縮退運転で 2 に絞る） */
  maxTier?: number;
  /** 追加アダプタ（x は scripts 側で Playwright 実装を注入する） */
  adapters?: Partial<Record<SourceKind, Adapter>>;
  concurrency?: number;
  log?: Logger;
  dryRun?: boolean;
};

export type CollectSummary = { sources: number; ok: number; empty: number; error: number; inserted: number; skippedLearning: number; errors: { id: string; error: string }[] };

const BASE_ADAPTERS: Partial<Record<SourceKind, Adapter>> = {
  rss: feedAdapter,
  note: feedAdapter,
  yt: feedAdapter,
  gnews: feedAdapter,
  gnews_en: feedAdapter,
  page: pageAdapter,
};

export async function collect(opts: CollectOptions): Promise<CollectSummary> {
  const log = opts.log ?? (() => {});
  const adapters = { ...BASE_ADAPTERS, ...(opts.adapters ?? {}) };
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let q = opts.db.from("sources").select("*").eq("enabled", true);
  if (opts.kinds) q = q.in("kind", opts.kinds);
  if (opts.maxTier) q = q.lte("tier", opts.maxTier);
  const { data: sources, error } = await q.order("tier").order("id");
  if (error) throw new Error(`sources の取得に失敗: ${error.message}`);

  const summary: CollectSummary = { sources: sources.length, ok: 0, empty: 0, error: 0, inserted: 0, skippedLearning: 0, errors: [] };
  await recordStage(opts.db, opts.runDate, "collect", { started_at: new Date().toISOString(), sources: sources.length });

  await pool(sources as Source[], opts.concurrency ?? 16, async (src) => {
    const adapter = adapters[src.kind];
    if (!adapter) {
      log(`[skip] ${src.id}: kind=${src.kind} のアダプタなし`);
      return;
    }
    // YouTube: フィード未解決なら @handle から channel_id を引く
    if (src.kind === "yt" && !src.feed && src.url) {
      const feed = await resolveYouTubeFeed(src.url, fetchText);
      if (feed) {
        src.feed = feed;
        if (!opts.dryRun) await opts.db.from("sources").update({ feed }).eq("id", src.id);
      }
    }
    const t0 = Date.now();
    const res = await adapter(src, { since, fetchText, log });
    const learning = src.kind === "page" && !src.last_fetched_at; // 初回は学習のみ
    let inserted = 0;
    if (res.items.length && !opts.dryRun) {
      inserted = await insertItems(opts.db, src, res.items, opts.runDate, learning ? "skipped" : "new");
      if (learning) summary.skippedLearning += res.items.length;
    }
    summary.inserted += inserted;
    summary[res.status] += 1;
    if (res.status === "error") summary.errors.push({ id: src.id, error: res.error ?? "unknown" });
    log(`[${res.status}] ${src.id} items=${res.items.length} new=${inserted} ${Date.now() - t0}ms${res.error ? " " + res.error : ""}`);
    if (!opts.dryRun) {
      await opts.db
        .from("sources")
        .update({
          last_fetched_at: new Date().toISOString(),
          last_status: res.status,
          last_error: res.status === "error" ? (res.error ?? "").slice(0, 500) : null,
          fail_count: res.status === "error" ? src.fail_count + 1 : 0,
        })
        .eq("id", src.id);
    }
  });

  await recordStage(
    opts.db,
    opts.runDate,
    "collect",
    { finished_at: new Date().toISOString(), ok: summary.ok, empty: summary.empty, error: summary.error, inserted: summary.inserted, errors: summary.errors.slice(0, 50) },
    { items_collected: summary.inserted },
  );
  return summary;
}

/** canonical_url で重複を捨てながら保存。戻り値は新規挿入件数 */
async function insertItems(db: Db, src: Source, items: RawItem[], runDate: string, status: "new" | "skipped"): Promise<number> {
  const seen = new Set<string>();
  const rows = [];
  for (const it of items) {
    const canonical = canonicalize(it.url);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    rows.push({
      source_id: src.id,
      run_date: runDate,
      canonical_url: canonical,
      url: it.url,
      title: it.title.slice(0, 300),
      author: it.author ?? null,
      published_at: it.publishedAt ?? null,
      excerpt: it.excerpt,
      lang: it.lang ?? (looksJapanese(it.title + it.excerpt) ? "ja" : "en"),
      status,
    });
  }
  if (!rows.length) return 0;
  // 既存の canonical_url は無視（ignoreDuplicates）。挿入件数を知るため先に存在確認する
  const { data: existing } = await db
    .from("daily_items")
    .select("canonical_url")
    .in(
      "canonical_url",
      rows.map((r) => r.canonical_url),
    );
  const exists = new Set((existing ?? []).map((r) => r.canonical_url));
  const fresh = rows.filter((r) => !exists.has(r.canonical_url));
  if (!fresh.length) return 0;
  const { error } = await db.from("daily_items").upsert(fresh, { onConflict: "canonical_url", ignoreDuplicates: true });
  if (error) throw new Error(`daily_items の保存に失敗 (${src.id}): ${error.message}`);
  return fresh.length;
}

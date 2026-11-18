import type { DailyItem } from "@/types/database";
import { DAILY_TAGS } from "@/types/database";
import type { ScoreResult, Usage } from "@/lib/daily/types";
import { SCORE_BATCH } from "@/lib/daily/types";
import { askJson, DEFAULT_MODEL_SCORE, estimateCostUsd, newUsage } from "@/lib/daily/llm";
import { scoreSystem, scoreUser } from "@/lib/daily/prompts";
import { getBlockedTerms, getInterestProfile, getSettings, pool, recordStage, settingString, type Db, type Logger } from "@/lib/daily/common";

export type ScoreOptions = { db: Db; runDate: string; log?: Logger; dryRun?: boolean; model?: string };
export type ScoreSummary = { scored: number; batches: number; usage: Usage; costUsd: number; failed: number };

type ItemWithSource = Pick<DailyItem, "id" | "title" | "excerpt" | "lang" | "source_id"> & { sources: { name: string; tier: number } | null };

/** status='new' のアイテムを興味プロフィールで採点する */
export async function score(opts: ScoreOptions): Promise<ScoreSummary> {
  const log = opts.log ?? (() => {});
  const { db, runDate } = opts;
  const [profile, blocked, settings] = await Promise.all([getInterestProfile(db), getBlockedTerms(db), getSettings(db)]);
  const model = opts.model ?? settingString(settings, "model_score", DEFAULT_MODEL_SCORE);
  const usage = newUsage();
  await recordStage(db, runDate, "score", { started_at: new Date().toISOString(), model });

  const { data, error } = await db.from("daily_items").select("id, title, excerpt, lang, source_id, sources(name, tier)").eq("status", "new").order("fetched_at", { ascending: false }).limit(2000);
  if (error) throw new Error(`採点対象の取得に失敗: ${error.message}`);
  const items = (data ?? []) as unknown as ItemWithSource[];
  log(`採点対象 ${items.length} 件 / model=${model}`);

  const batches: ItemWithSource[][] = [];
  for (let i = 0; i < items.length; i += SCORE_BATCH) batches.push(items.slice(i, i + SCORE_BATCH));
  const system = scoreSystem(profile, blocked);
  let scored = 0;
  let failed = 0;

  await pool(batches, 4, async (batch, bi) => {
    const user = scoreUser(batch.map((it) => ({ id: it.id, title: it.title, source: it.sources?.name ?? it.source_id, excerpt: it.excerpt, lang: it.lang })));
    let results: ScoreResult[] = [];
    try {
      results = await withRetry(() => askJson<ScoreResult[]>({ model, system, user, usage, maxTokens: 3000 }), 3);
    } catch (e) {
      failed += batch.length;
      log(`[score] batch ${bi} 失敗: ${e instanceof Error ? e.message : e}`);
      return;
    }
    const byId = new Map(results.map((r) => [r.id, r]));
    for (const it of batch) {
      const r = byId.get(it.id);
      const tier = it.sources?.tier ?? 2;
      const adj = tier === 1 ? 10 : tier === 3 ? -10 : 0;
      const raw = r ? clamp(Math.round(Number(r.score) || 0), 0, 100) : 0;
      const final = clamp(raw + adj, 0, 100);
      const tags = Array.isArray(r?.tags) ? r!.tags.filter((t): t is (typeof DAILY_TAGS)[number] => (DAILY_TAGS as readonly string[]).includes(t)) : [];
      if (!opts.dryRun) {
        const { error: ue } = await db
          .from("daily_items")
          .update({
            score: final,
            score_reason: r?.reason?.slice(0, 200) ?? (r ? null : "採点結果なし"),
            cluster_key: r?.cluster_key?.slice(0, 40) ?? null,
            tags,
            status: "scored",
          })
          .eq("id", it.id);
        if (ue) log(`[score] 更新失敗 ${it.id}: ${ue.message}`);
      }
      scored += 1;
    }
    log(`[score] batch ${bi + 1}/${batches.length} done`);
  });

  const costUsd = estimateCostUsd(usage);
  await recordStage(db, runDate, "score", { finished_at: new Date().toISOString(), scored, failed, batches: batches.length, usage: { ...usage } }, { items_scored: scored });
  await addCost(db, runDate, costUsd);
  return { scored, batches: batches.length, usage, costUsd, failed };
}

export async function addCost(db: Db, runDate: string, costUsd: number) {
  const { data } = await db.from("daily_runs").select("cost_usd").eq("run_date", runDate).maybeSingle();
  const prev = Number(data?.cost_usd ?? 0);
  await db
    .from("daily_runs")
    .update({ cost_usd: Number((prev + costUsd).toFixed(4)) })
    .eq("run_date", runDate);
}

export async function withRetry<T>(fn: () => Promise<T>, times: number): Promise<T> {
  let last: unknown;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

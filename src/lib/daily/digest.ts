import type { DailyItem } from "@/types/database";
import type { DigestResult, Usage } from "@/lib/daily/types";
import { BODY_CHARS, DEFAULT_DIGEST_SIZE, PER_SOURCE_CAP } from "@/lib/daily/types";
import { askJson, DEFAULT_MODEL_DIGEST, estimateCostUsd, newUsage } from "@/lib/daily/llm";
import { digestSystem, digestUser } from "@/lib/daily/prompts";
import { extractArticleText, truncate } from "@/lib/daily/text";
import { maskBlockedTerms } from "@/lib/daily/guard";
import { fetchText, getBlockedTerms, getSettings, pool, recordStage, settingNumber, settingString, type Db, type Logger } from "@/lib/daily/common";
import { addCost, withRetry } from "@/lib/daily/score";

export type DigestOptions = { db: Db; runDate: string; log?: Logger; dryRun?: boolean; model?: string; size?: number };
export type DigestSummary = { picked: number; usage: Usage; costUsd: number };

const MIN_SCORE = 30;

type Scored = Pick<DailyItem, "id" | "title" | "url" | "excerpt" | "score" | "cluster_key" | "source_id" | "lang"> & { sources: { name: string } | null };

/**
 * 採点済みから上位 N 件を選び、本文を取得して要約と論点を付ける。
 * 同じ cluster_key は1件、同じソースは PER_SOURCE_CAP 件まで。
 * 既にその日の digest がある場合は、残り枠だけ追加する（再実行しても増殖しない）。
 */
export async function digest(opts: DigestOptions): Promise<DigestSummary> {
  const log = opts.log ?? (() => {});
  const { db, runDate } = opts;
  const [blocked, settings] = await Promise.all([getBlockedTerms(db), getSettings(db)]);
  const model = opts.model ?? settingString(settings, "model_digest", DEFAULT_MODEL_DIGEST);
  const size = opts.size ?? settingNumber(settings, "digest_size", DEFAULT_DIGEST_SIZE);
  const usage = newUsage();
  await recordStage(db, runDate, "digest", { started_at: new Date().toISOString(), model, size });

  const { data: already } = await db.from("daily_items").select("id, cluster_key, source_id").eq("run_date", runDate).eq("status", "digest");
  const usedClusters = new Set((already ?? []).map((r) => r.cluster_key).filter(Boolean) as string[]);
  const perSource = new Map<string, number>();
  for (const r of already ?? []) perSource.set(r.source_id, (perSource.get(r.source_id) ?? 0) + 1);
  const room = Math.max(0, size - (already?.length ?? 0));
  if (room === 0) {
    log(`本日の digest は既に ${already?.length} 件あります`);
    return { picked: 0, usage, costUsd: 0 };
  }

  // 過去48時間に収集した採点済みから選ぶ（前日夜の記事も拾う）
  const { data, error } = await db
    .from("daily_items")
    .select("id, title, url, excerpt, score, cluster_key, source_id, lang, sources(name)")
    .eq("status", "scored")
    .gte("fetched_at", new Date(Date.now() - 48 * 3600e3).toISOString())
    .gte("score", MIN_SCORE)
    .order("score", { ascending: false })
    .limit(300);
  if (error) throw new Error(`digest 候補の取得に失敗: ${error.message}`);

  const picked: Scored[] = [];
  for (const it of (data ?? []) as unknown as Scored[]) {
    if (picked.length >= room) break;
    if (it.cluster_key && usedClusters.has(it.cluster_key)) continue;
    if ((perSource.get(it.source_id) ?? 0) >= PER_SOURCE_CAP) continue;
    picked.push(it);
    if (it.cluster_key) usedClusters.add(it.cluster_key);
    perSource.set(it.source_id, (perSource.get(it.source_id) ?? 0) + 1);
  }
  log(`digest 候補 ${data?.length ?? 0} 件 → ${picked.length} 件を選択`);

  const system = digestSystem(blocked);
  const startRank = (already?.length ?? 0) + 1;
  await pool(picked, 4, async (it, i) => {
    let body = "";
    try {
      const html = await fetchText(it.url);
      body = truncate(extractArticleText(html), BODY_CHARS);
    } catch (e) {
      log(`[digest] 本文取得失敗 ${it.url}: ${e instanceof Error ? e.message : e}`);
    }
    if (body.length < 200) body = `${it.excerpt}\n\n（本文を取得できなかったため、冒頭のみ）`;
    let result: DigestResult = { summary: it.excerpt, angle: "" };
    try {
      result = await withRetry(
        () => askJson<DigestResult>({ model, system, user: digestUser({ title: it.title, source: it.sources?.name ?? it.source_id, url: it.url, body }), usage, maxTokens: 800 }),
        3,
      );
    } catch (e) {
      log(`[digest] 要約失敗 ${it.id}: ${e instanceof Error ? e.message : e}`);
    }
    const summary = maskBlockedTerms(String(result.summary ?? "").trim(), blocked).slice(0, 600);
    const angle = maskBlockedTerms(String(result.angle ?? "").trim(), blocked).slice(0, 300);
    if (!opts.dryRun) {
      const { error: ue } = await db
        .from("daily_items")
        .update({ status: "digest", rank: startRank + i, summary, angle, body: body.slice(0, BODY_CHARS + 50), run_date: runDate })
        .eq("id", it.id);
      if (ue) log(`[digest] 更新失敗 ${it.id}: ${ue.message}`);
    }
    log(`[digest] #${startRank + i} ${it.title.slice(0, 40)} (score ${it.score})`);
  });

  const costUsd = estimateCostUsd(usage);
  await recordStage(db, runDate, "digest", { finished_at: new Date().toISOString(), picked: picked.length, usage: { ...usage } }, { digest_count: (already?.length ?? 0) + picked.length });
  await addCost(db, runDate, costUsd);
  return { picked: picked.length, usage, costUsd };
}

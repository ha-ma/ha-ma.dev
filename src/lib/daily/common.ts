// バッチ共通: 日付、HTTP 取得、設定読み出し、実行記録
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export type Db = SupabaseClient<Database>;
export type Logger = (msg: string) => void;

/** JST の日付文字列 YYYY-MM-DD */
export function jstDate(d: Date = new Date()): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** JST の表示用 "11/18（火）" */
export function jstLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}（${w}）`;
}

/** "2026年11月18日" */
export function jstLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

const UA = "Mozilla/5.0 (compatible; ha-ma.dev daily/1.0; +https://ha-ma.dev)";

/** 文字コードを見てテキスト化する fetch。2MB 超は切り捨て、20秒でタイムアウト */
export async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, {
      ...init,
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.8", ...(init.headers as Record<string, string> | undefined) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer()).subarray(0, 2 * 1024 * 1024);
    const ct = res.headers.get("content-type") ?? "";
    let charset = ct.match(/charset=([\w-]+)/i)?.[1];
    if (!charset) {
      const head = buf.subarray(0, 4096).toString("latin1");
      charset = head.match(/charset=["']?([\w-]+)/i)?.[1] ?? head.match(/encoding=["']([\w-]+)["']/i)?.[1];
    }
    const enc = (charset ?? "utf-8").toLowerCase().replace("shift-jis", "shift_jis").replace("x-sjis", "shift_jis");
    try {
      return new TextDecoder(enc).decode(buf);
    } catch {
      return buf.toString("utf8");
    }
  } finally {
    clearTimeout(timer);
  }
}

/** リダイレクト先の最終 URL（Google ニュース展開の保険） */
export async function resolveFinalUrl(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": UA } });
    return res.url && res.url !== url ? res.url : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 並列数を絞って実行 */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function getSettings(db: Db): Promise<Record<string, Json>> {
  const { data } = await db.from("daily_settings").select("key, value");
  const map: Record<string, Json> = {};
  for (const r of data ?? []) map[r.key] = r.value;
  return map;
}

export function settingString(map: Record<string, Json>, key: string, fallback: string): string {
  const v = map[key];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

export function settingNumber(map: Record<string, Json>, key: string, fallback: number): number {
  const v = map[key];
  return typeof v === "number" ? v : typeof v === "string" && v.trim() && !Number.isNaN(Number(v)) ? Number(v) : fallback;
}

export async function getBlockedTerms(db: Db): Promise<string[]> {
  const { data } = await db.from("blocked_terms").select("term");
  return (data ?? []).map((r) => r.term);
}

export async function getInterestProfile(db: Db): Promise<string> {
  const { data } = await db.from("interest_profile").select("body").order("id", { ascending: false }).limit(1).maybeSingle();
  return data?.body ?? "";
}

/** daily_runs の段階記録をマージ更新する */
export async function recordStage(db: Db, runDate: string, stage: string, patch: Record<string, Json>, extra: Partial<Database["public"]["Tables"]["daily_runs"]["Update"]> = {}) {
  const { data } = await db.from("daily_runs").select("stages").eq("run_date", runDate).maybeSingle();
  const stages = ((data?.stages as Record<string, Json> | null) ?? {}) as Record<string, Json>;
  const prev = (stages[stage] as Record<string, Json> | null) ?? {};
  stages[stage] = { ...prev, ...patch };
  const { error } = await db.from("daily_runs").upsert({ run_date: runDate, stages, ...extra }, { onConflict: "run_date" });
  if (error) throw new Error(`daily_runs の更新に失敗: ${error.message}`);
}

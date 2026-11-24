// X の公式 API（v2・従量課金）でリストの投稿を読む。1日の取得件数に上限を設ける。
//   GET /2/lists/:id/tweets   … 投稿の読み取り（1件 $0.005、同じ投稿は UTC の同日内は再課金されない）
//   GET /2/lists/:id/members  … メンバーの読み取り（1件 $0.010）。author_id → ハンドルの対応表を作るために
//                               初回と、未知の投稿者が出たとき（7日に1回まで）だけ呼ぶ
// 認証は OAuth 1.0a（自分のアカウントの Access Token。非公開リストも読める）か、Bearer（公開リストのみ）。
import type { Adapter, RawItem } from "@/lib/daily/types";
import { EXCERPT_CHARS } from "@/lib/daily/types";
import { truncate } from "@/lib/daily/text";
import { recordStage, type Db } from "@/lib/daily/common";
import { oauth1Header, pctEncode as enc } from "@/lib/daily/oauth1";

export const X_POST_READ_USD = 0.005;
export const X_USER_READ_USD = 0.01;
export const DEFAULT_X_DAILY_CAP = 30;

type XCreds = { apiKey: string; apiSecret: string; accessToken: string; accessSecret: string } | { bearer: string };

export function xCredsFromEnv(): XCreds | null {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET, X_BEARER_TOKEN } = process.env;
  if (X_API_KEY && X_API_SECRET && X_ACCESS_TOKEN && X_ACCESS_TOKEN_SECRET) {
    return { apiKey: X_API_KEY, apiSecret: X_API_SECRET, accessToken: X_ACCESS_TOKEN, accessSecret: X_ACCESS_TOKEN_SECRET };
  }
  if (X_BEARER_TOKEN) return { bearer: X_BEARER_TOKEN };
  return null;
}

export function listIdFromUrl(url: string): string | null {
  return url.match(/lists\/(\d+)/)?.[1] ?? (/^\d+$/.test(url.trim()) ? url.trim() : null);
}

async function xGet<T>(creds: XCreds, path: string, query: Record<string, string>): Promise<T> {
  const baseUrl = `https://api.x.com${path}`;
  const qs = Object.keys(query)
    .map((k) => `${enc(k)}=${enc(query[k])}`)
    .join("&");
  const auth = "bearer" in creds ? `Bearer ${creds.bearer}` : oauth1Header("GET", baseUrl, query, creds);
  const res = await fetch(`${baseUrl}?${qs}`, { headers: { Authorization: auth, "User-Agent": "ha-ma.dev daily/1.0" } });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`X API ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

type XTweet = {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  entities?: { urls?: { expanded_url?: string; unwound_url?: string }[] };
  note_tweet?: { text?: string };
  referenced_tweets?: { type: string; id: string }[];
};
type TweetsResponse = { data?: XTweet[]; meta?: { next_token?: string; result_count?: number } };
type MembersResponse = { data?: { id: string; username: string; name: string }[]; meta?: { next_token?: string } };
type UserMap = { fetched_at: string; users: Record<string, { u: string; n: string }> };

export type XApiOptions = { db: Db; runDate: string; listUrl: string; dailyCap: number; creds: XCreds; dryRun?: boolean };

/** リストを1回だけ読み、各ソース（x_handle）に振り分けるアダプタを作る */
export function createXApiAdapter(opts: XApiOptions): Adapter {
  let cache: Promise<{ tweets: XTweet[]; users: UserMap["users"] }> | null = null;

  async function load(since: Date, log: (m: string) => void) {
    const listId = listIdFromUrl(opts.listUrl);
    if (!listId) throw new Error(`リスト URL から ID を読み取れません: ${opts.listUrl}`);
    const cap = Math.max(1, Math.min(500, opts.dailyCap));

    // 投稿を上限まで読む（新しい順）。since より古い投稿に達したら止める
    const tweets: XTweet[] = [];
    let token: string | undefined;
    let charged = 0;
    while (tweets.length < cap) {
      const want = Math.min(100, cap - charged);
      if (want <= 0) break;
      const q: Record<string, string> = { max_results: String(Math.max(1, want)), "tweet.fields": "created_at,author_id,entities,note_tweet,referenced_tweets" };
      if (token) q.pagination_token = token;
      const res = await xGet<TweetsResponse>(opts.creds, `/2/lists/${listId}/tweets`, q);
      const page = res.data ?? [];
      charged += page.length;
      let reachedOld = false;
      for (const t of page) {
        if (t.created_at && Date.parse(t.created_at) < since.getTime()) {
          reachedOld = true;
          continue;
        }
        tweets.push(t);
      }
      token = res.meta?.next_token;
      if (!token || reachedOld || page.length === 0) break;
    }

    // author_id → ハンドルの対応表（daily_settings に保存して使い回す）
    const { data: saved } = await opts.db.from("daily_settings").select("value").eq("key", "x_user_map").maybeSingle();
    let map = (saved?.value as unknown as UserMap | null) ?? { fetched_at: "", users: {} };
    const unknown = tweets.some((t) => t.author_id && !map.users[t.author_id]);
    const stale = !map.fetched_at || Date.now() - Date.parse(map.fetched_at) > 7 * 24 * 3600e3;
    let userReads = 0;
    if (Object.keys(map.users).length === 0 || (unknown && stale)) {
      const users: UserMap["users"] = {};
      let mt: string | undefined;
      for (let i = 0; i < 10; i++) {
        const q: Record<string, string> = { max_results: "100", "user.fields": "username,name" };
        if (mt) q.pagination_token = mt;
        const res = await xGet<MembersResponse>(opts.creds, `/2/lists/${listId}/members`, q);
        for (const u of res.data ?? []) users[u.id] = { u: u.username, n: u.name };
        userReads += res.data?.length ?? 0;
        mt = res.meta?.next_token;
        if (!mt) break;
      }
      map = { fetched_at: new Date().toISOString(), users };
      if (!opts.dryRun) await opts.db.from("daily_settings").upsert({ key: "x_user_map", value: map as never }, { onConflict: "key" });
      log(`[x] リストのメンバー ${userReads} 人を取得（対応表を更新）`);
    }

    const estUsd = Number((charged * X_POST_READ_USD + userReads * X_USER_READ_USD).toFixed(4));
    log(`[x] 投稿 ${charged} 件を読み取り（24時間以内 ${tweets.length} 件、上限 ${cap}）／推定 $${estUsd}`);
    if (!opts.dryRun) await recordStage(opts.db, opts.runDate, "x", { posts_read: charged, posts_kept: tweets.length, user_reads: userReads, est_usd: estUsd, cap });
    return { tweets, users: map.users };
  }

  return async (source, ctx) => {
    if (!source.x_handle) return { items: [], status: "empty" };
    try {
      cache ??= load(ctx.since, ctx.log).catch(async (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.log(`[x] 取得に失敗（X ソースは今回スキップ）: ${msg}`);
        if (!opts.dryRun) await recordStage(opts.db, opts.runDate, "x", { error: msg.slice(0, 300) }).catch(() => {});
        return { tweets: [] as XTweet[], users: {} as UserMap["users"] };
      });
      const { tweets, users } = await cache;
      const handle = source.x_handle.replace(/^@/, "").toLowerCase();
      const items: RawItem[] = [];
      for (const t of tweets) {
        const user = t.author_id ? users[t.author_id] : undefined;
        if (!user || user.u.toLowerCase() !== handle) continue;
        if (t.referenced_tweets?.some((r) => r.type === "retweeted")) continue; // RT は本人の発信ではないので除く
        const text = (t.note_tweet?.text ?? t.text ?? "").trim();
        const ext = (t.entities?.urls ?? []).map((u) => u.unwound_url ?? u.expanded_url ?? "").find((u) => u && !/^https?:\/\/(x|twitter)\.com\//.test(u) && !/^https?:\/\/t\.co\//.test(u));
        const postUrl = `https://x.com/${user.u}/status/${t.id}`;
        items.push({
          url: ext ?? postUrl,
          title:
            truncate(
              text
                .replace(/https?:\/\/t\.co\/\S+/g, "")
                .replace(/\s+/g, " ")
                .trim(),
              80,
            ) || `@${user.u} の投稿`,
          author: `${user.n} (@${user.u})`,
          publishedAt: t.created_at ?? null,
          excerpt: truncate(`${ext ? `[@${user.u} が共有 ${postUrl}] ` : ""}${text}`, EXCERPT_CHARS),
          lang: source.lang,
        });
      }
      return { items, status: items.length ? "ok" : "empty" };
    } catch (e) {
      return { items: [], status: "error", error: e instanceof Error ? e.message : String(e) };
    }
  };
}

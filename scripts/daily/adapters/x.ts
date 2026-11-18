// X（旧Twitter）のリストをログイン済みブラウザで読む。Mac mini 専用（Playwright）。
// 公式 API は従量制で基準を超えるため使わない。取得は自分のアカウントで閲覧できる範囲に限る。
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { Adapter, RawItem } from "@/lib/daily/types";
import { EXCERPT_CHARS } from "@/lib/daily/types";
import { truncate } from "@/lib/daily/text";
import { firstExternalUrl } from "@/lib/daily/url";

export const X_PROFILE_DIR = process.env.X_PROFILE_DIR ?? resolve(homedir(), ".ha-ma-daily", "x-profile");

type Tweet = { url: string; text: string; author: string; handle: string; time: string | null };

let cache: { listUrl: string; tweets: Tweet[]; since: number } | null = null;

/** リストのタイムラインを1回だけ読み、ソース（x_handle）ごとに振り分ける */
export const xAdapter: Adapter = async (source, ctx) => {
  const listUrl = process.env.X_LIST_URL;
  if (!listUrl) return { items: [], status: "error", error: "X_LIST_URL が未設定（daily_settings の x_list_url または環境変数）" };
  if (!source.x_handle) return { items: [], status: "empty" };
  try {
    if (!cache || cache.listUrl !== listUrl) {
      cache = { listUrl, tweets: await readList(listUrl, ctx.since, ctx.log), since: ctx.since.getTime() };
      ctx.log(`[x] リストから ${cache.tweets.length} 件取得`);
    }
    const handle = source.x_handle.replace(/^@/, "").toLowerCase();
    const mine = cache.tweets.filter((t) => t.handle.toLowerCase() === handle);
    const items: RawItem[] = mine.map((t) => {
      const ext = firstExternalUrl(t.text, "x.com");
      return {
        url: ext ?? t.url,
        title: truncate(t.text.replace(/\s+/g, " "), 80) || `@${t.handle} の投稿`,
        author: `${t.author} (@${t.handle})`,
        publishedAt: t.time,
        excerpt: truncate(`${ext ? `[@${t.handle} が共有] ` : ""}${t.text}`, EXCERPT_CHARS),
        lang: source.lang,
      };
    });
    return { items, status: items.length ? "ok" : "empty" };
  } catch (e) {
    return { items: [], status: "error", error: e instanceof Error ? e.message : String(e) };
  }
};

async function readList(listUrl: string, since: Date, log: (m: string) => void): Promise<Tweet[]> {
  const { chromium } = await import("playwright");
  const context = await chromium.launchPersistentContext(X_PROFILE_DIR, {
    headless: process.env.X_HEADFUL ? false : true,
    viewport: { width: 1200, height: 1800 },
    locale: "ja-JP",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  try {
    const page = await context.newPage();
    await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3000);
    if (page.url().includes("/login") || page.url().includes("/i/flow/login")) {
      throw new Error("X にログインしていません。`npm run daily:x-login` でログインしてください");
    }
    const seen = new Map<string, Tweet>();
    let stale = 0;
    for (let i = 0; i < 60; i++) {
      const batch: Tweet[] = await page.$$eval('article[data-testid="tweet"]', (nodes) =>
        nodes.map((n) => {
          const link =
            Array.from(n.querySelectorAll('a[href*="/status/"]'))
              .map((a) => (a as HTMLAnchorElement).href)
              .find((h) => /\/status\/\d+$/.test(h)) ?? "";
          const text = (n.querySelector('[data-testid="tweetText"]') as HTMLElement | null)?.innerText ?? "";
          const nameBlock = (n.querySelector('[data-testid="User-Name"]') as HTMLElement | null)?.innerText ?? "";
          const handleMatch = nameBlock.match(/@([A-Za-z0-9_]+)/);
          const author = nameBlock.split("\n")[0] ?? "";
          const time = (n.querySelector("time") as HTMLTimeElement | null)?.getAttribute("datetime") ?? null;
          return { url: link, text, author, handle: handleMatch ? handleMatch[1] : "", time };
        }),
      );
      let added = 0;
      let oldest = Infinity;
      for (const t of batch) {
        if (!t.url || seen.has(t.url)) continue;
        if (t.time) oldest = Math.min(oldest, Date.parse(t.time));
        if (t.time && Date.parse(t.time) < since.getTime()) continue;
        seen.set(t.url, t);
        added += 1;
      }
      if (oldest !== Infinity && oldest < since.getTime()) break; // 24時間より前まで読んだ
      stale = added === 0 ? stale + 1 : 0;
      if (stale >= 4) break; // これ以上読み込まれない
      await page.mouse.wheel(0, 2400);
      await page.waitForTimeout(1200 + Math.random() * 800);
    }
    log(`[x] scroll 完了 ${seen.size} 件`);
    return Array.from(seen.values());
  } finally {
    await context.close();
  }
}

/** 手動ログイン用: ブラウザを開いてログインしてもらい、プロフィールに保存する */
export async function xLogin() {
  const { chromium } = await import("playwright");
  const context = await chromium.launchPersistentContext(X_PROFILE_DIR, { headless: false, viewport: { width: 1200, height: 900 }, locale: "ja-JP" });
  const page = await context.newPage();
  await page.goto("https://x.com/login");
  console.log("ブラウザで X にログインしてください。ホームが表示されたらこのウィンドウを閉じてください。");
  await new Promise<void>((done) => context.on("close", () => done()));
}

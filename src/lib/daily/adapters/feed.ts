import Parser from "rss-parser";
import type { Adapter, RawItem } from "@/lib/daily/types";
import { EXCERPT_CHARS } from "@/lib/daily/types";
import { stripHtml, truncate } from "@/lib/daily/text";
import { decodeGoogleNewsUrl, isGoogleNewsUrl } from "@/lib/daily/url";

type FeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  creator?: string;
  author?: string;
  isoDate?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  "content:encoded"?: string;
  "media:group"?: { "media:description"?: string[] };
};

const parser = new Parser<Record<string, unknown>, FeedItem>({
  timeout: 20000,
  headers: { "User-Agent": "ha-ma.dev daily/1.0 (+https://ha-ma.dev)" },
  customFields: { item: ["content:encoded", "media:group", "summary"] },
});

/** YouTube のチャンネル URL（@handle）からフィード URL を解決する */
export async function resolveYouTubeFeed(channelUrl: string, fetchText: (u: string) => Promise<string>): Promise<string | null> {
  try {
    const html = await fetchText(channelUrl);
    const m = html.match(/"channelId":"(UC[\w-]{20,})"/) ?? html.match(/channel_id=(UC[\w-]{20,})/);
    return m ? `https://www.youtube.com/feeds/videos.xml?channel_id=${m[1]}` : null;
  } catch {
    return null;
  }
}

/**
 * RSS / Atom / RDF を読む。kind: rss, note, yt, gnews, gnews_en
 * Google ニュースの場合は記事 URL を元記事に展開する（できなければそのまま）。
 */
export const feedAdapter: Adapter = async (source, ctx) => {
  const feedUrl = source.feed ?? source.url;
  if (!feedUrl) return { items: [], status: "error", error: "feed/url が未設定" };
  try {
    const xml = await ctx.fetchText(feedUrl, { headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" } });
    const feed = await parser.parseString(xml);
    const items: RawItem[] = [];
    for (const it of feed.items ?? []) {
      const link = (it.link ?? it.guid ?? "").trim();
      const title = (it.title ?? "").trim();
      if (!link || !title) continue;
      const published = it.isoDate ?? (it.pubDate ? new Date(it.pubDate).toISOString() : null);
      if (published && !Number.isNaN(Date.parse(published)) && new Date(published) < ctx.since) continue;
      let url = link;
      if (isGoogleNewsUrl(url)) {
        url = decodeGoogleNewsUrl(url) ?? url;
      }
      const rawBody = it["content:encoded"] ?? it.content ?? it.summary ?? it.contentSnippet ?? it["media:group"]?.["media:description"]?.[0] ?? "";
      const text = stripHtml(String(rawBody));
      // Google ニュースはタイトル末尾に「 - 媒体名」が付く。著者欄に移す
      let author: string | null = it.creator ?? it.author ?? null;
      let cleanTitle = title;
      if (source.kind === "gnews" || source.kind === "gnews_en") {
        const m = title.match(/^(.*)\s[-–]\s([^-–]+)$/);
        if (m) {
          cleanTitle = m[1].trim();
          author = m[2].trim();
        }
      }
      items.push({
        url,
        title: cleanTitle,
        author,
        publishedAt: published && !Number.isNaN(Date.parse(published)) ? published : null,
        excerpt: truncate(text, EXCERPT_CHARS),
        lang: source.lang,
      });
    }
    return { items, status: items.length ? "ok" : "empty" };
  } catch (e) {
    return { items: [], status: "error", error: e instanceof Error ? e.message : String(e) };
  }
};

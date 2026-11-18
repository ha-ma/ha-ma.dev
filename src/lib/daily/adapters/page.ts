import type { Adapter, RawItem } from "@/lib/daily/types";
import { decodeEntities, stripHtml, truncate } from "@/lib/daily/text";
import { EXCERPT_CHARS } from "@/lib/daily/types";

/**
 * ページ差分監視: 新着一覧ページからリンクを抜き出し、見たことのないものを新着として返す。
 * 「見たことがあるか」の判定は呼び出し側（daily_items の canonical_url 一意制約）に任せる。
 * 初回（source.last_fetched_at が null）は呼び出し側が status='skipped' で保存して学習だけ行う。
 *
 * selector は簡易対応: "main" / "article" / "#id" / ".class" のいずれか一つで、その要素の内側だけを対象にする。
 */
export const pageAdapter: Adapter = async (source, ctx) => {
  if (!source.url) return { items: [], status: "error", error: "url が未設定" };
  try {
    const html = await ctx.fetchText(source.url);
    const scoped = scope(html, source.selector);
    const base = new URL(source.url);
    const seen = new Set<string>();
    const items: RawItem[] = [];
    const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(scoped)) !== null) {
      let href = decodeEntities(m[1].trim());
      if (/^(javascript:|mailto:|tel:)/i.test(href)) continue;
      try {
        href = new URL(href, base).toString();
      } catch {
        continue;
      }
      const host = new URL(href).hostname;
      // 同一サイト内、またはサブドメインのリンクだけ（外部 SNS 等は除外）
      if (!host.endsWith(base.hostname.replace(/^www\./, ""))) continue;
      if (/\.(pdf|xlsx?|docx?|pptx?|zip|jpe?g|png|gif|svg|mp4|mp3)$/i.test(new URL(href).pathname) && !/\.pdf$/i.test(href)) continue;
      const text = stripHtml(m[2]).replace(/\s+/g, " ").trim();
      if (text.length < 8) continue; // ナビゲーション等の短いリンクは除外
      if (seen.has(href)) continue;
      seen.add(href);
      items.push({ url: href, title: truncate(text, 120), excerpt: truncate(text, EXCERPT_CHARS), lang: source.lang });
      if (items.length >= 60) break;
    }
    return { items, status: items.length ? "ok" : "empty" };
  } catch (e) {
    return { items: [], status: "error", error: e instanceof Error ? e.message : String(e) };
  }
};

function scope(html: string, selector: string | null): string {
  if (!selector) {
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    return main ? main[1] : html;
  }
  const sel = selector.trim();
  let re: RegExp | null = null;
  if (sel.startsWith("#")) re = new RegExp(`<[a-z][^>]*\\bid=["']${escapeRe(sel.slice(1))}["'][^>]*>([\\s\\S]*)`, "i");
  else if (sel.startsWith(".")) re = new RegExp(`<[a-z][^>]*\\bclass=["'][^"']*\\b${escapeRe(sel.slice(1))}\\b[^"']*["'][^>]*>([\\s\\S]*)`, "i");
  else re = new RegExp(`<${escapeRe(sel)}[^>]*>([\\s\\S]*?)<\\/${escapeRe(sel)}>`, "i");
  const m = html.match(re);
  return m ? m[1] : html;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

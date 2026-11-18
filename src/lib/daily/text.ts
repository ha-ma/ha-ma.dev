// HTML から本文テキストを取り出す簡易処理（外部依存なし）

const BLOCK_TAGS = /<\/(p|div|br|li|h[1-6]|tr|section|article|blockquote|pre)>/gi;

export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(BLOCK_TAGS, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t　]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

/** 記事ページ HTML から本文らしい部分を取り出す。article/main を優先し、なければ body */
export function extractArticleText(html: string): string {
  const pick = (re: RegExp) => {
    const m = html.match(re);
    return m ? m[1] : null;
  };
  const candidate = pick(/<article[^>]*>([\s\S]*?)<\/article>/i) ?? pick(/<main[^>]*>([\s\S]*?)<\/main>/i) ?? pick(/<body[^>]*>([\s\S]*?)<\/body>/i) ?? html;
  return stripHtml(candidate);
}

/** 先頭 n 文字（サロゲートペアを壊さない） */
export function truncate(s: string, n: number): string {
  const arr = Array.from(s);
  return arr.length <= n ? s : arr.slice(0, n).join("") + "…";
}

/** 日本語が含まれるか（採点時の言語判定に使う） */
export function looksJapanese(s: string): boolean {
  return /[぀-ヿ一-鿿]/.test(s);
}

// URL の正規化（重複排除のキー）と Google ニュース URL の展開

const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|yclid|mc_[a-z]+|ref|ref_src|igshid|si|s|t|feature|spm|ncid|cmpid|n_cid)$/i;

/** 重複排除用に URL を正規化する。失敗したら元の文字列を trim して返す */
export function canonicalize(input: string): string {
  const raw = input.trim();
  try {
    const u = new URL(raw);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    if (u.protocol === "http:") u.protocol = "https:";
    const keep: [string, string][] = [];
    for (const [k, v] of u.searchParams) {
      if (!TRACKING_PARAMS.test(k)) keep.push([k, v]);
    }
    keep.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    u.search = keep.length ? "?" + new URLSearchParams(keep).toString() : "";
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    u.pathname = path;
    return u.toString();
  } catch {
    return raw;
  }
}

/** 本文中の最初の外部リンク（X 投稿のリンク先などに使う） */
export function firstExternalUrl(text: string, excludeHost: string): string | null {
  const m = text.match(/https?:\/\/[^\s)\]}"'<>]+/g);
  if (!m) return null;
  for (const cand of m) {
    try {
      const h = new URL(cand).hostname;
      if (!h.endsWith(excludeHost) && h !== "t.co") return cand;
    } catch {
      /* skip */
    }
  }
  return null;
}

/**
 * Google ニュース RSS の記事 URL（news.google.com/rss/articles/CBMi…）を元記事 URL に展開する。
 * 旧形式は base64 に URL が入っている。新形式は展開できないので null を返し、呼び出し側が
 * HTTP リダイレクトでの解決を試みる。
 */
export function decodeGoogleNewsUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("news.google.com")) return null;
    const m = u.pathname.match(/\/articles\/([^/]+)/);
    if (!m) return null;
    const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    const buf = Buffer.from(b64, "base64");
    const s = buf.toString("latin1");
    // 先頭に 0x08 0x13 0x22 … に続いて長さ付きの URL が入っている（旧形式）
    const idx = s.indexOf("http");
    if (idx < 0) return null;
    let end = idx;
    while (end < s.length && s.charCodeAt(end) > 0x20 && s.charCodeAt(end) < 0x7f) end++;
    const cand = s.slice(idx, end).replace(/[\x00-\x1f].*$/, "");
    try {
      new URL(cand);
      return cand;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export function isGoogleNewsUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("news.google.com");
  } catch {
    return false;
  }
}

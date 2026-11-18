import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalize, decodeGoogleNewsUrl, firstExternalUrl } from "../src/lib/daily/url.ts";
import { findBlockedTerms, maskBlockedTerms, normalizeForMatch } from "../src/lib/daily/guard.ts";
import { extractArticleText, stripHtml, truncate } from "../src/lib/daily/text.ts";
import { parseJson } from "../src/lib/daily/llm.ts";
import { jstDate, jstLabel, jstLong } from "../src/lib/daily/common.ts";

test("canonicalize: utm と fbclid を除き、www と末尾スラッシュを揃える", () => {
  assert.equal(canonicalize("http://www.example.com/a/b/?utm_source=x&id=3&fbclid=zz#top"), "https://example.com/a/b?id=3");
  assert.equal(canonicalize("https://example.com/"), "https://example.com/");
  assert.equal(canonicalize("https://EXAMPLE.com/Path?b=2&a=1"), "https://example.com/Path?a=1&b=2");
});

test("canonicalize: 壊れた文字列はそのまま返す", () => {
  assert.equal(canonicalize("  not a url "), "not a url");
});

test("decodeGoogleNewsUrl: 旧形式の base64 から URL を取り出す", () => {
  // 0x08 0x13 0x22 <len> <url> の形を模す
  const url = "https://www.hokkaido-np.co.jp/article/1234567/";
  const payload = Buffer.concat([Buffer.from([0x08, 0x13, 0x22, url.length]), Buffer.from(url, "latin1"), Buffer.from([0xd2, 0x01, 0x00])]);
  const b64 = payload.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(decodeGoogleNewsUrl(`https://news.google.com/rss/articles/${b64}?oc=5`), url);
  assert.equal(decodeGoogleNewsUrl("https://example.com/x"), null);
});

test("firstExternalUrl: t.co と自ドメインを除く", () => {
  assert.equal(firstExternalUrl("見てね https://t.co/abc https://x.com/a/status/1 https://zenn.dev/p/1", "x.com"), "https://zenn.dev/p/1");
  assert.equal(firstExternalUrl("リンクなし", "x.com"), null);
});

test("guard: 全角半角・空白・中黒の差を吸収して検知する", () => {
  assert.equal(normalizeForMatch("山田　太郎"), "山田太郎");
  assert.deepEqual(findBlockedTerms("昨日、山田 太郎さんと話した。ＡＢＣ商事の件も。", ["山田太郎", "ABC商事", "佐藤"]), ["山田太郎", "ABC商事"]);
  assert.deepEqual(findBlockedTerms("", ["山田太郎"]), []);
  assert.equal(maskBlockedTerms("山田太郎と ABC商事", ["山田太郎", "ABC商事"]), "○○と ○○");
});

test("text: HTML から本文を取り出し、切り詰める", () => {
  const html = `<html><head><style>p{}</style><script>x()</script></head><body><nav>menu</nav><article><h1>見出し</h1><p>本文&amp;です。</p><p>二段落目</p></article></body></html>`;
  assert.equal(extractArticleText(html), "見出し\n本文&です。\n二段落目");
  assert.equal(stripHtml("<p>a</p><p>b</p>"), "a\nb");
  assert.equal(truncate("あいうえお", 3), "あいう…");
  assert.equal(truncate("abc", 3), "abc");
});

test("parseJson: フェンス付き・前置き付きでも JSON を取り出す", () => {
  assert.deepEqual(parseJson('```json\n[{"id":"a","score":80}]\n```'), [{ id: "a", score: 80 }]);
  assert.deepEqual(parseJson('結果です: {"summary":"x","angle":"y"} 以上'), { summary: "x", angle: "y" });
  assert.throws(() => parseJson("no json here"));
});

test("日付: JST で日付・ラベルを作る", () => {
  assert.equal(jstDate(new Date("2026-11-17T20:30:00Z")), "2026-11-18"); // 05:30 JST
  assert.equal(jstDate(new Date("2026-11-17T14:59:00Z")), "2026-11-17"); // 23:59 JST
  assert.equal(jstLabel("2026-11-18"), "11/18（水）");
  assert.equal(jstLong("2026-11-18"), "2026年11月18日");
});

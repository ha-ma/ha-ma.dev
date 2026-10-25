import { test } from "node:test";
import assert from "node:assert/strict";
import { checkContent, checkHoneypot, checkOrigin, hashIp, signTimestamp, verifyTimestamp, verifyTurnstile } from "../src/lib/spam.ts";

const SECRET = "test-secret";

test("timestamp: 3秒未満は拒否、3秒以上は許可、1時間超は期限切れ", () => {
  const t0 = 1_000_000;
  const token = signTimestamp(SECRET, t0);
  assert.equal(verifyTimestamp(SECRET, token, { now: t0 + 1000 }).ok, false);
  assert.equal(verifyTimestamp(SECRET, token, { now: t0 + 5000 }).ok, true);
  const late = verifyTimestamp(SECRET, token, { now: t0 + 2 * 60 * 60 * 1000 });
  assert.equal(late.ok, false);
  assert.equal(late.ok ? "" : late.reason, "form_expired");
});

test("timestamp: 署名改ざんは拒否", () => {
  const token = signTimestamp(SECRET, 1_000_000);
  const forged = token.replace(/^\d+/, "1");
  assert.equal(verifyTimestamp(SECRET, forged, { now: 2_000_000 }).ok, false);
  assert.equal(verifyTimestamp(SECRET, null).ok, false);
  assert.equal(verifyTimestamp(SECRET, "garbage").ok, false);
});

test("honeypot: 値があればsilent拒否", () => {
  assert.deepEqual(checkHoneypot(""), { ok: true });
  assert.deepEqual(checkHoneypot(null), { ok: true });
  const r = checkHoneypot("http://spam");
  assert.equal(r.ok, false);
  assert.equal(r.ok ? false : r.silent, true);
});

test("content: 通常の日本語問い合わせは許可", () => {
  const r = checkContent({ name: "山田 太郎", email: "taro@example.co.jp", message: "AI導入について相談したいです。見積作成の自動化を検討しています。詳細は打ち合わせでお話しできればと思います。" });
  assert.equal(r.ok, true);
});

test("content: URL3つ以上は拒否", () => {
  const r = checkContent({ name: "a", email: "a@b.co", message: "see https://a.com https://b.com https://c.com now" });
  assert.equal(r.ok, false);
});

test("content: キリル文字主体は拒否", () => {
  const r = checkContent({ name: "a", email: "a@b.co", message: "Привет, это тестовое сообщение спама для проверки фильтра" });
  assert.equal(r.ok, false);
});

test("content: 使い捨てメールは拒否", () => {
  const r = checkContent({ name: "a", email: "x@mailinator.com", message: "こんにちは。ご相談があります。よろしくお願いします。" });
  assert.equal(r.ok, false);
});

test("content: 英語の正常な問い合わせは許可", () => {
  const r = checkContent({ name: "John", email: "john@company.com", message: "Hello, we are looking for a PM for our inbound tourism project in Hokkaido. Could we schedule a call?" });
  assert.equal(r.ok, true);
});

test("origin: 許可ホスト以外は拒否、Originなしは許可", () => {
  assert.equal(checkOrigin(new Headers({ origin: "https://ha-ma.dev" }), ["ha-ma.dev"]).ok, true);
  assert.equal(checkOrigin(new Headers({ origin: "https://evil.example" }), ["ha-ma.dev"]).ok, false);
  assert.equal(checkOrigin(new Headers(), ["ha-ma.dev"]).ok, true);
});

test("hashIp: 生IPを含まず、日付が変わると変わる", () => {
  const a = hashIp("203.0.113.5", SECRET, new Date("2026-10-25T00:00:00Z"));
  const b = hashIp("203.0.113.5", SECRET, new Date("2026-10-26T00:00:00Z"));
  assert.notEqual(a, b);
  assert.equal(a.includes("203.0.113.5"), false);
  assert.equal(a.length, 32);
});

test("turnstile: 成功/hostname不一致/失効", async () => {
  const mk = (body) => async () => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  const now = Date.parse("2026-10-25T10:00:00Z");
  const ok = await verifyTurnstile("s", "tok", null, ["ha-ma.dev"], { now, fetchImpl: mk({ success: true, hostname: "ha-ma.dev", challenge_ts: "2026-10-25T09:59:00Z" }) });
  assert.equal(ok.ok, true);
  const badHost = await verifyTurnstile("s", "tok", null, ["ha-ma.dev"], { now, fetchImpl: mk({ success: true, hostname: "evil.example", challenge_ts: "2026-10-25T09:59:00Z" }) });
  assert.equal(badHost.ok, false);
  const stale = await verifyTurnstile("s", "tok", null, ["ha-ma.dev"], { now, fetchImpl: mk({ success: true, hostname: "ha-ma.dev", challenge_ts: "2026-10-25T09:00:00Z" }) });
  assert.equal(stale.ok, false);
  const fail = await verifyTurnstile("s", "tok", null, ["ha-ma.dev"], { now, fetchImpl: mk({ success: false, "error-codes": ["invalid-input-response"] }) });
  assert.equal(fail.ok, false);
  const missing = await verifyTurnstile("s", null, null, ["ha-ma.dev"], { now });
  assert.equal(missing.ok, false);
});

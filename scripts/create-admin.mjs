#!/usr/bin/env node
// 管理者ユーザーを作成する（サインアップは無効化しているため、このスクリプトかダッシュボードで作る）。
//   node scripts/create-admin.mjs            # .env.local の ADMIN_EMAIL で作成
//   node scripts/create-admin.mjs you@x.dev  # メールを指定
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").toLowerCase();
if (!url || !key || !email) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_EMAIL が必要です");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
if (error) {
  if (/already/i.test(error.message)) {
    console.log(`既に存在します: ${email}`);
    process.exit(0);
  }
  console.error("作成に失敗:", error.message);
  process.exit(1);
}
console.log(`管理者を作成しました: ${data.user.email} (${data.user.id})`);

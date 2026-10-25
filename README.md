# 濵屋雄太 紹介ページ（ha-ma.dev）

Next.js 16（App Router / Cache Components）＋ Supabase ＋ Resend ＋ Cloudflare Turnstile。
公開ページ・管理画面（CMS）・スパム対策付き問い合わせフォームを1つのアプリで提供する。

- 設計書・実装計画: `docs/DESIGN.md`, `docs/PLAN.md`
- 本番のみ運用（Staging なし）。ローカルは Supabase CLI（Docker）で再現する。

## 1. ローカル開発（初回）

前提: Node.js 22、Docker Desktop（Supabase CLI が使う）

```bash
npm install
cp .env.example .env.local        # 下記の値を埋める

npm run db:start                  # Supabase をローカル起動（初回はイメージ取得で数分）
#  → 出力の API URL / anon key / service_role key を .env.local に転記
#     NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#     NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#     SUPABASE_SERVICE_ROLE_KEY=...
#     ADMIN_EMAIL=me@ha-ma.dev
#     FORM_HMAC_SECRET=$(openssl rand -hex 32)
#     NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA      # 常に成功するテストキー
#     TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

npm run db:reset                  # migrations + seed.sql を適用
npm run admin:create              # ADMIN_EMAIL の管理者ユーザーを作成（サインアップは無効化済み）
npm run dev                       # http://localhost:3000
```

- 管理画面: http://localhost:3000/admin/login
  - ローカルではメールは送信されず、Mailpit（http://127.0.0.1:54324）に届く。そこからログインリンクを開く。
- Supabase Studio: http://127.0.0.1:54323
- 問い合わせフォーム: Turnstile のテストキーで常に通る。`RESEND_API_KEY` 未設定なら通知メールはスキップ（コンソールに警告）。

## 2. 本番環境（Vercel ＋ Supabase ＋ Resend ＋ Turnstile）

1. **Supabase**: 新規プロジェクト（Tokyo）。Authentication → Providers → Email で「Allow new users to sign up」を **OFF**。
   `supabase link --project-ref <ref>` → `npm run db:push` でマイグレーション適用。`seed.sql` は本番では流さず、管理画面から実データを入れる。
   管理者ユーザーは Authentication → Users → Add user（`me@ha-ma.dev`、Auto Confirm）で作成するか、本番の値を入れた `.env.local` で `npm run admin:create`。
   Authentication → URL Configuration: Site URL `https://ha-ma.dev`、Redirect URLs に `https://ha-ma.dev/admin/auth/callback`。
2. **Cloudflare Turnstile**: ウィジェット作成（Managed）。ドメインに `ha-ma.dev` を登録。
3. **Resend**: ドメイン `ha-ma.dev` を認証済み（DKIM/SPF/MX を DNS に設定済み）。API キーを発行。
   - 受信（MX）を有効にしているため、`@ha-ma.dev` 宛のメールは Resend の受信箱（Dashboard → Emails → Received）に入る。
     `inquiry@ha-ma.dev` に届く通知を普段使いのメールでも読むなら、`MAIL_TO=inquiry@ha-ma.dev,<普段のアドレス>` のようにカンマ区切りで追加する。
4. **Vercel**: リポジトリを接続。Environment Variables に `.env.example` の全項目を登録（`NEXT_PUBLIC_SITE_URL=https://ha-ma.dev`）。
   Domains に `ha-ma.dev` を追加し、ムームーDNS に Vercel が指示する A / CNAME を設定。
5. **GitHub Actions**: リポジトリの Secrets に `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`（Session mode の接続文字列）を登録 → `.github/workflows/keepalive.yml` が毎日 ping ＋ pg_dump。

## 3. よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run typecheck` | ルート型生成 ＋ `tsc` |
| `npm run test` | スパム対策の単体テスト |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run db:reset` | ローカルDBを migrations ＋ seed で作り直す |
| `npm run db:types` | Supabase から型を生成（`src/types/database.generated.ts`。手書きの `database.ts` と見比べる用） |
| `npm run db:push` | リンク済みの本番プロジェクトへマイグレーション適用 |

## 4. 構成

```
src/
├─ app/
│  ├─ page.tsx                 公開ページ（'use cache' + cacheTag('content')）
│  ├─ opengraph-image.tsx      OG画像（サブセット化した Noto Sans JP を同梱）
│  ├─ sitemap.ts / robots.ts
│  ├─ actions/inquiry.ts       問い合わせ Server Action（7層のスパム対策）
│  ├─ api/revalidate/route.ts  手動キャッシュ破棄（REVALIDATE_SECRET）
│  └─ admin/                   管理画面（Supabase Auth マジックリンク）
│     ├─ [table]/              activities / strengths / works の一覧・編集
│     ├─ settings/ inquiries/ preview/
│     └─ actions/              CRUD・並べ替え・公開切替（成功時に updateTag('content')）
├─ components/public/          公開ページのセクション
├─ components/admin/           管理画面の部品（dnd-kit の並べ替えなど）
├─ content/profile.ts          CMS化していない固定文言（経歴・スキル・実績数値など）
├─ lib/                        env / supabase クライアント / schemas(zod) / spam / mail
├─ proxy.ts                    /admin/* の認証ガード（旧 middleware）
└─ types/database.ts           DB 型
supabase/
├─ config.toml                 ローカル設定（サインアップ無効、リダイレクトURL）
├─ migrations/                 スキーマ・RLS・レート制限関数
└─ seed.sql                    初期データ（ダミー案件は published=false）
```

## 5. 運用メモ

- 公開ページは管理画面で保存した瞬間に更新される（`updateTag`）。反映されない時はダッシュボードの「キャッシュを更新」。
- 協力隊コーディネーターの行は `published=false` で投入済み。公開時は管理画面でバッジをクリックするだけ。
- 案件は固有名詞を入れない運用。`featured` を付けた6件が初期表示、残りは「もっと見る」。
- スパム判定で弾いた問い合わせも `status='spam'` で残るので、週に一度 `/admin/inquiries?status=spam` を見返して誤判定がないか確認する。
- OG画像の文言は `opengraph-image.tsx` 内で固定。フォントは使用文字のみサブセット化しているので、文言を大きく変える場合は `pyftsubset` で作り直す。

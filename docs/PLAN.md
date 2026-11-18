# 実装計画（要約）

完全版は Claude Docs「濵屋雄太 紹介ページ 詳細実装計画」を参照（Export → Markdown でこのファイルに上書き可）。
設計書「濵屋雄太 紹介ページ（一枚もの）設計書」も同様に `docs/DESIGN.md` へ。

## 決定事項（2026-10-25）

| 項目 | 決定 |
| --- | --- |
| 構成 | Next.js 16（Cache Components）＋ Supabase Free ＋ Resend Free ＋ Cloudflare Turnstile。月額0円 |
| ドメイン | `ha-ma.dev`（ムームードメインで取得・DNS管理） |
| メール | Resend でドメイン認証済み（DKIM/SPF/MX 設定済み）。通知先 `inquiry@ha-ma.dev`、送信元 `noreply@ha-ma.dev` |
| 管理者 | `me@ha-ma.dev`（Supabase Auth マジックリンク、サインアップ無効、許可メール1件） |
| 環境 | 本番のみ（Staging なし）。ローカルは `supabase start`（Docker）で再現 |
| CMS化する範囲 | 現在の活動／得意なこと／案件／サイト設定（キャッチ・SNS 4種（Facebook/X/LinkedIn/GitHub）・フッターリンク）。経歴・スキル・実績数値は `src/content/profile.ts` に固定 |
| 問い合わせ | Server Action。ハニーポット→送信時間署名→内容ヒューリスティック→レート制限→Turnstile→zod→DB保存→Resend通知の多層防御 |
| キャッシュ | `'use cache'` + `cacheTag('content')`。管理画面の保存で `updateTag('content')`。失敗時は短命キャッシュ |
| 非公開項目 | 協力隊コーディネーターは `published=false` で投入済み。公開時にトグル |

## 本番公開までの残作業

1. 写真（正方形）を `public/images/profile.jpg` に置き換え
2. Supabase 本番プロジェクト作成 → `supabase link` → `npm run db:push` → 管理者ユーザー作成
3. Turnstile ウィジェット作成（ha-ma.dev）、Resend API キー発行
4. GitHub リポジトリ作成 → Vercel 接続 → 環境変数登録 → `ha-ma.dev` を割当（ムームーDNSに A/CNAME）
5. GitHub Secrets（SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_DB_URL）登録 → keepalive ワークフロー有効化
6. 管理画面から実データ投入（案件は固有名詞なし）、ダミー案件を削除
7. README の公開前チェックリストを実施

## Resend 受信に関する注意

`ha-ma.dev` の MX を Resend に向けているため、`inquiry@ha-ma.dev` / `me@ha-ma.dev` 宛のメールは Resend の受信箱（Dashboard → Emails → Received）に入り、通常のメールクライアントには届かない。
- 管理画面のログインリンク（`me@ha-ma.dev` 宛）は Resend の受信箱から開く
- 通知を普段のメールでも受けるなら `MAIL_TO=inquiry@ha-ma.dev,<普段のアドレス>`
- 将来 Google Workspace 等でメールボックスを持つ場合は MX を切り替え、Resend 側の受信を無効化する

## 日報（フェーズ①）— 2026-11-18

設計書: Claude Docs「ha-ma.dev フェーズ① 日報の土台 設計書 v0.1」／ソース一覧「日報ソースリスト v0.1」（`config/sources.yaml`）。

| 項目 | 決定 |
| --- | --- |
| 流れ | 5:30 収集（331ソース）→ 採点（興味プロフィール）→ 上位10件を要約 → 6:00 メール → スマホでコメント → 保存と同時に `/daily/YYYY-MM-DD` に公開 |
| 実行環境 | Mac mini（launchd、`ops/macmini/`）。X は公式APIが従量制で高いため、自分のXリストをブラウザで読む。Vercel Cron（6:30 JST）は watchdog で、Mac mini の記録がなければ RSS のみで縮退運転 |
| テーブル | sources / daily_items / comments / interest_profile / daily_runs / blocked_terms / daily_settings（`20261118000000_daily.sql`） |
| 管理画面 | `/admin/daily`（コメント・音声入力・整文）、`/admin/sources`、`/admin/profile`（興味プロフィール・禁則語・配信設定） |
| 公開面 | `/daily`、`/daily/[date]`、`/daily/feed.xml`、`/llms.txt`、sitemap、JSON-LD（Blog / BlogPosting / Person @id 共通） |
| ガード | blocked_terms を保存前に照合して確認、要約プロンプトにも禁則、出力を伏せ字 |
| 追加の環境変数 | `ANTHROPIC_API_KEY`、`CRON_SECRET`（Vercel）、Mac mini のみ `SUPABASE_SERVICE_ROLE_KEY`・`REVALIDATE_SECRET`・`RESEND_API_KEY`（`.env.daily`） |
| 関門 | 14日連続でメールが届き、10日以上でコメントが公開されていること |

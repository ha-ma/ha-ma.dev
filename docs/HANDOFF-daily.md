# 日報（フェーズ①）引き継ぎメモ — Mac mini セットアップの続き

2026-11-24 時点。Mac mini 上の Claude Code がこのメモを読んで、セットアップの残りを進めるためのもの。
経緯は別セッション（設計・実装）で進めてきた。設計の全体像は `docs/PLAN.md` の「日報（フェーズ①）」、
手順は `ops/macmini/README.md`。

## 目的

毎朝 5:30 にこの Mac mini で `npm run daily` を実行し、収集 → 採点 → 上位10件を要約 → メール送信まで行う。
濵屋さんがスマホでコメントを書くと、その場で `https://ha-ma.dev/daily/YYYY-MM-DD` に公開される。

フェーズ①の関門: **14日連続でメールが届き、うち10日以上でコメントが公開されていること。**

## 済んでいること

- コード: PR #1（日報の土台）、#2（Next.js 16.4.6）、#3（フィード自動発見・X 公式 API）を main にマージ済み。Vercel 本番デプロイ済み
- Supabase: マイグレーション `20261118000000_daily.sql` 適用済み
- Vercel 環境変数: `ANTHROPIC_API_KEY` `CRON_SECRET` `REVALIDATE_SECRET` 設定済み
- GitHub Actions: keepalive & backup が成功する状態（Secrets 3つ設定済み）
- Mac mini: clone・`npm ci`・`.env.daily` 作成済み。`npm run daily:seed` 実行済み
- 管理画面 `/admin/profile`: メール宛先 `yuta.hamaya@amptech.co.jp`、X リスト URL（`lists/2125065127133364473`）、X の上限 30 を保存済み
- X: アプリ `ha-ma.dev_batch`（Pay Per Use）、クレジット $25 購入済み。**2026-11-24 に実 API で初めて成功**（メンバー95人・投稿30件）
- 2026-11-24（Mac mini）の作業（PR #5）:
  - validate の error 39件 → 0件（28件を gnews の `site:` 検索へ、YouTube 2件は channel_id を直書き、dan-shipper は X のみに、
    DNS 不達・403 の7件を yaml から外した。seed は yaml に無いソースを無効化するようにした）
  - 初回の本番実行で採点 29 バッチ中 19 が JSON 解析エラー → 構造化出力（`output_config.format`）に変更し、再採点で失敗 0
  - 本番実行: 収集 1444件、メール送信、`/admin/daily` に10件、`daily_runs` に記録あり
  - launchd 登録済み（毎朝 5:30）。`kickstart` の試運転は終了コード 0
  - 当日の `daily_runs.cost_usd`（$1.50）は旧単価（$1/$5）で計算されたもので過大。実費は約 $0.18

## 残っていること

1. **PR #5 をマージ**した後、Mac mini で `git checkout main && git pull && npm ci`（launchd は作業ツリーをそのまま実行するため。今はブランチ `fix/daily-sources-validate` のまま）
2. 2026-11-25 5:30 の自動実行のログ（`~/Library/Logs/ha-ma-daily/daily.log`）を確認
3. コメントを1件公開した後に `/daily`、`/daily/<日付>`、`/daily/feed.xml`、`/llms.txt` の表示を確認
4. 同じ日に2回実行するとメールが2通届く（二重送信の防止なし）。必要なら `mailed_at` を見て飛ばす

## X（公式 API）について — 重要

- **ブラウザの自動操作は使わない。** 当初の Playwright 方式は X 側にボットと判定され、濵屋さんのアカウントがログイン制限を受けたため廃止した。再導入しないこと
- 実装は `src/lib/daily/adapters/x-api.ts`。`GET /2/lists/:id/tweets` を OAuth 1.0a（`X_API_KEY` `X_API_SECRET` `X_ACCESS_TOKEN` `X_ACCESS_TOKEN_SECRET`）で読む。リストは非公開なので Bearer だけでは読めない
- 従量課金: 投稿の読み取り 1件 $0.005、ユーザーの読み取り 1件 $0.010。1日の上限は `/admin/profile` の「X の1日の読み取り上限」（既定30）。
  メンバー一覧（author_id→ハンドルの対応表）は初回と、未知の投稿者が出たとき（7日に1回まで）だけ取得し、`daily_settings.x_user_map` に保存
- **この実装は実際の X API に対してまだ一度も成功を確認していない**（署名は公式ドキュメントの例でテスト済み、取得ロジックは擬似データで確認済み）。
  初回実行で 401/403/402/429 などが出たら、レスポンス本文を見て原因を切り分ける。想定される原因:
  キーの貼り間違い／クレジット未購入／エンドポイントやフィールド名の差異／`max_results` の下限
- 不要な課金を避ける: デバッグで何度も叩かない。同じ投稿は UTC の同日内は再課金されない仕組みだが、「ソフトな保証」とされている
- X への申告内容（Developer Console のユースケース）に実装を合わせてある。**変えてはいけない点**:
  読み取り専用／公開ページでは X の投稿本文を出さず「投稿者名の投稿」＋リンクのみ／X 由来のデータは90日で削除（`purgeOldXItems`）／
  X のコンテンツをモデルの学習に使わない
- X が失敗しても日報全体は止まらない設計（X ソースだけスキップ）。X を無効にするには、リスト URL を空にするか上限を 0 にする

## 既知の未確認事項

- ソースの X ハンドルのうち「要確認」としたものがある（`config/sources.yaml` の note 欄）。リストに居ないハンドルは単に0件になるだけで害はない
- Claude の単価は概算値（`DAILY_PRICE_IN` / `DAILY_PRICE_OUT`）。`daily_runs.cost_usd` は目安として見る
- この作業環境（設計側のセッション）からは ha-ma.dev 本番にアクセスできず、公開ページ `/daily` `/llms.txt` の表示は未確認。
  コメントを1件公開した後に `/daily`、`/daily/<日付>`、`/daily/feed.xml`、`/llms.txt` を開いて確認する
- 禁則語（`/admin/profile` の「公開しない語」）は濵屋さんが後で登録する

## 進め方のルール

- 変更は feature ブランチ → PR → main。main へのマージで Vercel が自動デプロイする
- push 前に `npm run typecheck && npm run lint && npm test`
- `.env.daily` と各種キーはコミットしない・ログやチャットに貼らない
- 実行ログを残すときは `logs/`（Git 管理外）へ: `npm run daily 2>&1 | tee logs/daily-$(date +%F).log`
- このメモの内容が進んだら、該当箇所を更新する（済んだことを「済んでいること」へ移す）

# Mac mini での日報バッチ セットアップ

毎朝 5:30 JST に `npm run daily` を実行し、収集→採点→要約→メール送信まで行う。Vercel 側は配信と監視だけ。
SalesPilot と同じ Mac mini（Tailscale SSH で遠隔操作）に同居させる。

## 1. 前提

- macOS、Node.js 22 以上（`node -v`）、Git
- Mac mini の「システム設定 → 一般 → ログイン項目」で自動ログインが有効、スリープしない設定（省エネルギー → ディスプレイオフ時もスリープしない）
- Supabase 本番プロジェクトにマイグレーション適用済み（`npm run db:push`）

## 2. リポジトリと依存関係

```bash
mkdir -p ~/apps && cd ~/apps
git clone <ha-ma.dev のリポジトリURL> ha-ma.dev
cd ha-ma.dev
npm ci
npx playwright install chromium        # X 取得用のブラウザ（初回のみ）
```

## 3. 環境変数（`.env.daily`）

リポジトリ直下に `.env.daily` を作る（`.gitignore` 済み。Vercel には置かない値を含む）。

```bash
NEXT_PUBLIC_SITE_URL=https://ha-ma.dev
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=            # Supabase > Project Settings > API > service_role
ANTHROPIC_API_KEY=
RESEND_API_KEY=
MAIL_FROM=noreply@ha-ma.dev
REVALIDATE_SECRET=                    # Vercel と同じ値（バッチ完了後に /api/revalidate?tag=daily を叩く）
DAILY_MODEL_SCORE=claude-haiku-5-5
DAILY_MODEL_DIGEST=claude-haiku-5-5
# X_LIST_URL は管理画面（/admin/profile）の設定が優先。環境変数で上書きも可
```

`chmod 600 .env.daily` にしておく。

## 4. 初期データと到達確認

```bash
npm run daily:seed        # config/sources.yaml → sources テーブル（331件）
npm run daily:validate    # 全ソースの到達確認。error / empty を一覧で出す
```

`validate` の結果は `sources.last_status` にも入るので、管理画面 `/admin/sources` で「要差し替え」を確認できる。

## 5. X へのログイン（初回のみ・画面が必要）

```bash
npm run daily:x-login
```

Chromium が開くので X にログインし、ホームが表示されたらウィンドウを閉じる。
セッションは `~/.ha-ma-daily/x-profile` に保存され、以後はヘッドレスで動く。
ログインが切れると収集ログに「X にログインしていません」と出るので、同じコマンドでやり直す。

管理画面 `/admin/profile` の「Xリストの URL」に `https://x.com/i/lists/…` を入れておくこと。

## 6. 手動で1回動かす

```bash
npm run daily -- collect --dry     # 保存せずに件数だけ確認
npm run daily                      # 本番と同じ full 実行（メールも送る）
npm run daily -- mail --date 2026-11-18   # 段階だけやり直す
```

管理画面 `/admin/daily` に「今日の10件」が出て、メールが届けば OK。

## 7. launchd に登録（毎朝 5:30）

```bash
mkdir -p ~/Library/LaunchAgents ~/Library/Logs/ha-ma-daily
sed "s#__HOME__#$HOME#g; s#__NODE_BIN__#$(dirname "$(which node)")#g" ops/macmini/com.hamadev.daily.plist > ~/Library/LaunchAgents/com.hamadev.daily.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.hamadev.daily.plist
launchctl kickstart -k gui/$(id -u)/com.hamadev.daily      # 今すぐ試運転
tail -f ~/Library/Logs/ha-ma-daily/daily.log
```

- 変更して再登録するとき: `launchctl bootout gui/$(id -u)/com.hamadev.daily` → bootstrap し直す
- Mac が 5:30 にスリープしていた場合、launchd は起床後すぐに実行する。それも間に合わなければ 6:30 の Vercel watchdog が RSS のみで縮退運転する

## 8. 更新

```bash
cd ~/apps/ha-ma.dev && git pull && npm ci
```

`config/sources.yaml` を変えたら `npm run daily:seed` を再実行（管理画面で無効にしたソースの状態は保持される）。

## 9. 困ったとき

| 症状 | 見るところ |
|---|---|
| メールが来ない | `~/Library/Logs/ha-ma-daily/daily.log`、`/admin/daily` の実行記録（daily_runs）、Resend のダッシュボード |
| X の件数が 0 | ログの `[x]` 行。ログイン切れなら `npm run daily:x-login`。リストURL未設定なら `/admin/profile` |
| 特定ソースだけ error が続く | `/admin/sources` の「要差し替え」。フィードURLを直すか無効化 |
| AI費が想定より多い | `daily_runs.cost_usd` と `stages.score.usage`。`digest_size` やソースの tier を下げる |

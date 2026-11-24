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

## 5. X（公式 API・従量課金）

X はブラウザの自動操作ではなく、公式 API でリストを読む（自動操作はログイン制限の原因になるため廃止）。

1. https://console.x.com で開発者アカウントを作り、App を1つ作成する
2. 「Keys and tokens」で次の4つを発行し、`.env.daily` に入れる（Access Token は自分のアカウントのもの。非公開リストも読める）

```bash
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
```

3. Developer Console でクレジットを購入する（従量課金。自動チャージは切っておくと上限を超えない）
4. 管理画面 `/admin/profile` に「Xリストの URL」と「X の1日の読み取り上限」を入れる

費用: 投稿の読み取り1件 $0.005（上限30件/日で月およそ $4.5）。初回と、リストに人を足したあとに、メンバー一覧の取得（1人 $0.010）が1回走る。
読み取り件数と推定額は毎日 `daily_runs.stages.x` と実行ログの `[x]` 行に残る。リスト URL を空にするか上限を 0 にすると X は無効。

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
| X の件数が 0 | ログの `[x]` 行。401/403 はキーの誤りか権限不足、402/429 はクレジット切れ・上限。リストURL未設定なら `/admin/profile` |
| 特定ソースだけ error が続く | `/admin/sources` の「要差し替え」。フィードURLを直すか無効化 |
| AI費が想定より多い | `daily_runs.cost_usd` と `stages.score.usage`。`digest_size` やソースの tier を下げる |

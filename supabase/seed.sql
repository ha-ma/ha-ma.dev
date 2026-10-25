-- 初期データ（UIモックのダミーデータ）。公開前に管理画面で実データへ差し替える。
-- 固有名詞の入っていない案件はダミーのため published=false にしておく。

update public.site_settings set
  tagline        = 'AI・DXで、地方の活力を日本の元気に。',
  contact_email  = 'inquiry@ha-ma.dev',
  sns_facebook   = 'https://www.facebook.com/',
  sns_x          = 'https://x.com/',
  sns_linkedin   = 'https://www.linkedin.com/',
  sns_github     = 'https://github.com/',
  company_links  = '[
    {"label": "AmpTech", "url": "https://amptech.co.jp"},
    {"label": "SHIP", "url": "https://www.ship-nemuro.com"}
  ]'::jsonb
where id = 1;

insert into public.activities (group_type, org, role, summary, highlights, region, url, sort_order, published) values
('company', '株式会社AmpTech', '代表取締役', '北海道・関東を中心とした企業へのAI活用・DX支援。AI業務効率化コンサルを入口にシステム開発まで一気通貫。', '{"AI/DX","受託開発","10名弱"}', '北海道・関東', 'https://amptech.co.jp', 10, true),
('company', '株式会社タスカルカンパニー', '代表取締役', 'B型就労継続支援事業所とクライアント企業をマッチングし、利用者の技能・技術が向上する仕組み「TASKALL」を運営。', '{"福祉×IT","札幌市採択"}', '札幌', null, 20, true),
('company', '株式会社ヘラルド', '代表取締役', '地方へインバウンド観光客や人的・経済的資本が流入するサービスを開発するスタートアップ。', '{"北海道庁 STARTUP STUDIO ADVANCED 採択","STARTUP HOKKAIDO 資金調達支援プログラム 採択"}', '北海道', null, 30, true),
('company', '道東インバウンド観光 事業体', '運営', '北海道道東エリアでのインバウンド観光誘致。観光協会からの委託事業と、ツアー造成・プロモーションを両輪で推進中。', '{"観光","道東"}', '道東', null, 40, true),
('community', '根室高等学校 支援', '外部支援', '高校生のアプリ開発・プレゼンイベントを外部民間組織として支援。', '{}', '根室', null, 10, true),
('community', '「エミカケ」', '運営', '根室市で、高校生と大人が自分の人生について対話するイベントを運営。', '{}', '根室', null, 20, true),
('community', '北海道根室振興局 受託業務', '受託', '根室管内事業者向けセミナー・オンライン合同企業説明会の開催、企業紹介データ・パンフレット作成。', '{}', '根室', null, 30, true),
('community', '専門人材・ICT企業の誘致', '推進', '地方エリアへの専門人材・ICT企業の誘致と、地域内外をつなぐネットワーク構築。', '{}', '道東', null, 40, true),
('community', '根室市 地域おこし協力隊コーディネーター', '中間支援', '根室市の地域おこし協力隊の活動支援・定着支援を行う中間支援業務。', '{}', '根室', null, 50, false);

insert into public.strengths (title, body, icon, sort_order, published) values
('0→1の事業開発', 'パートナーと組んだ新規事業（主にSaaS）を7事業立ち上げ。企画・資金・開発・運用を一体で設計する', 'rocket', 10, true),
('チームの推進力になる', '目標達成に向けて社内外のメンバーを束ね、進行・品質・意思決定を前に進める', 'users', 20, true),
('ポジティブな関係づくり', 'クライアント企業・行政・金融機関など、立場の異なるステークホルダーと前向きな合意をつくる', 'handshake', 30, true),
('AIを活用した業務改革', '業務の棚卸しからAI導入まで伴走。PoC用のシステムは自らClaude Code等で開発する', 'sparkles', 40, true),
('英語・海外経験', '英日通訳の実務経験と米国留学経験。海外パートナーとの協業や英語ドキュメントに支障なし', 'globe', 50, true);

insert into public.works (category, title, phase, roles, team_size, period, summary, stack, featured, sort_order, published) values
('EC', '水産加工業向けBtoB受発注EC', '一気通貫', '{"PM","テックリード"}', '社内3名＋外部2社', '2023〜24', 'FAX受注の転記ミスが課題。受発注ECと基幹連携を構築し、受注処理時間を約6割削減。', '{"Next.js","Supabase"}', true, 10, false),
('EC', '食品メーカーのD2Cサイト新規立ち上げ', '0→1', '{"PM","ディレクター"}', '社内4名＋デザイナー1名', '2022', 'ブランド立ち上げと同時にEC・定期購入・CRMを構築。初年度で会員1万人規模。', '{"Shopify"}', true, 20, false),
('WEBシステム', '自治体向け業務管理SaaS', '一気通貫', '{"PM","テックリード"}', '社内2名＋オフショア3名', '2024〜', '紙とExcelで管理していた月次報告・経費精算をWeb化。複数自治体で運用中。', '{"Next.js","PostgreSQL"}', true, 30, false),
('SaaS', '福祉事業所向け書類自動作成SaaS', '0→1', '{"開発リーダー"}', '3社共同・計5名', '2025〜', '生成AIで個別支援計画を自動生成。パートナー2社との共同事業として立ち上げ。', '{"Next.js","Anthropic API"}', true, 40, false),
('アプリ', '観光ガイドマッチングアプリ', '0→1', '{"PM","エンジニア"}', '社内3名＋外部1名', '2024〜25', 'インバウンド旅行者とローカルガイドを結ぶアプリを企画から公開まで。決済・多言語対応。', '{"React Native","Stripe"}', true, 50, false),
('ITコンサル', '中小製造業のAI導入支援', '企画〜導入', '{"コンサル"}', '1名＋クライアント側3名', '2025', '業務棚卸しから生成AIの導入まで伴走。見積作成時間を半減。', '{"Claude","n8n"}', true, 60, false),
('WEBシステム', '製薬会社の会員向けCRM刷新', '企画', '{"コンサル","PM"}', '社内2名', '2026', '既存CRMの課題整理と要件定義、モックアップによる提案。', '{}', false, 70, false),
('新規事業', '地域人材ポータルの事業設計', '0→1', '{"共同創業","取締役"}', '共同創業者2名', '2026〜', '道東エリアの人材・企業マッチングサービスを企画し法人化。', '{}', false, 80, false);

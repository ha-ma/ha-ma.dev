// CMS化していない固定コンテンツ。変更時はここを編集してデプロイする。
// （今回のリリースでCMS化したのは「現在の活動」「得意なこと」「案件」「SNS・連絡先」）

export const profile = {
  name: "濵屋 雄太",
  nameEn: "Yuta Hamaya",
  eyebrow: "AI / DX × 地方創生",
  titles: ["株式会社AmpTech 代表取締役", "株式会社タスカルカンパニー 代表取締役", "株式会社ヘラルド 代表取締役"],
  base: "北海道根室市・札幌 ／ フルリモート稼働",
  languageNote: "英日通訳経験・米国留学経験あり。英語での業務対応可。",
  defaultTagline: "AI・DXで、地方の活力を日本の元気に。",
  mission: {
    heading: "AI・DXの知識で、日本全体が元気になるために地方の活力を高めていく。",
    body: "北海道・根室で11年、開発会社を経営しながら、地域の企業・自治体・高校生と一緒に事業をつくってきました。テクノロジーは目的ではなく、地域の人と文化を次の世代に渡すための道具だと考えています。",
    targets: [
      { title: "地域に根ざす", body: "その土地で雇用をつくり、暮らしを支えている企業・組織" },
      { title: "文化や技術を活かす", body: "古くからの文化・技術・一次産業を、次の形に更新しようとしている企業" },
      { title: "新しい事業で世の中へ寄与する", body: "新しい事業やサービスをつくり上げ、地域の外にも価値を届ける企業" },
    ],
  },
  // 案件実績（技術経歴書）に基づく実数: 2016〜2019年 30件 + 2020年〜 14件 + パートナー事業 4件 = 48件
  stats: [
    { value: "11", unit: "年", label: "会社運営" },
    { value: "20", unit: "名", label: "最大組織規模" },
    { value: "48", unit: "件", label: "参画案件" },
    { value: "30", unit: "件", label: "WEBサイト・EC構築" },
    { value: "17", unit: "件", label: "WEBシステム・SaaS" },
    { value: "7", unit: "事業", label: "新規事業立ち上げ" },
  ],
  skillGroups: [
    { name: "フロントエンド", items: [{ name: "HTML / CSS", level: 3 }, { name: "JavaScript / TypeScript", level: 3 }, { name: "Next.js", level: 3 }, { name: "Gatsby.js", level: 2 }] },
    { name: "バックエンド", items: [{ name: "Node.js / PostgreSQL", level: 3 }, { name: "Supabase / Prisma", level: 3 }, { name: "Ruby / Ruby on Rails", level: 2 }] },
    { name: "CMS・EC", items: [{ name: "WordPress", level: 3 }, { name: "EC（eコマース）", level: 3 }] },
    { name: "AI", items: [{ name: "生成AI", level: 3 }, { name: "Claude Code / MCP", level: 2 }] },
    { name: "マネジメント", items: [{ name: "PM", level: 3 }, { name: "プロダクトマネジメント", level: 3 }, { name: "ディレクション", level: 3 }] },
    { name: "デザイン・制作", items: [{ name: "UI/UXデザイン（Web）", level: 3 }, { name: "動画制作", level: 2 }] },
  ] as { name: string; items: { name: string; level: 1 | 2 | 3 }[] }[],
  tools: "Claude Code ／ MCP（Notion・GitHub・Playwright）／ n8n ／ Supabase ／ Vercel ／ PostgreSQL ／ Prisma ／ Figma ／ Notion ／ Slack",
  timeline: [
    { year: "2009", event: "根室高校卒業、国際教養大学入学。在学中に米ワシントン州ゴンザガ大学へ交換留学" },
    { year: "2013", event: "国際教養大学卒業、神戸製鋼所入社。中国市場向けプラント機器の営業" },
    { year: "2014", event: "独立。英日翻訳家・WEBデザイナーとして活動" },
    { year: "2016", event: "合同会社Malk設立（25歳）。北海道最東端のWEB制作会社として創業" },
    { year: "2018", event: "道東SDGs推進協議会 役員（環境省発注のSDGs普及活動）" },
    { year: "2020", event: "ゲストハウス・イベントスペースSHIPを根室市緑町に開業" },
    { year: "2023", event: "株式会社AmpTechへ組織変更。AI・システム開発へ事業を拡張" },
    { year: "2025", event: "株式会社ヘラルド代表取締役。北海道庁・STARTUP HOKKAIDOの各プログラムに採択" },
    { year: "2026", event: "株式会社タスカルカンパニー設立・代表取締役。道東インバウンド事業体を運営" },
  ],
  credentials: [
    { kind: "採択", text: "北海道庁主催「STARTUP STUDIO ADVANCEDプログラム」" },
    { kind: "採択", text: "STARTUP HOKKAIDO主催「資金調達支援プログラム」" },
    { kind: "受託", text: "北海道根室振興局「根室管内事業者向けセミナー・オンライン合同企業説明会開催及び企業紹介データ・パンフレット作成に係る業務」" },
    { kind: "ネットワーク", text: "北海道庁 地域フード塾 5期生" },
    { kind: "役員", text: "道東SDGs推進協議会" },
    { kind: "地域活動", text: "根室高校 アプリ開発・プレゼンイベント支援／「エミカケ」運営" },
  ],
  contact: {
    heading: "まずはお気軽にご相談ください",
    body: "PM・テックリード／AI導入支援／新規事業の共同立ち上げ／行政事業への参画など、短期のスポット相談から中長期の伴走まで。",
    replyNote: "2営業日以内にご返信します",
  },
};

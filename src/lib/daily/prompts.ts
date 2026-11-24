// 採点・要約・整文のプロンプト。編集しやすいよう1ファイルにまとめる。
import { DAILY_TAGS } from "@/types/database";

export const PERSONA = `読み手は濵屋雄太（北海道根室市）。システム開発会社（株式会社AmpTech）を11年経営し、PM兼テックリード。
根室市の地域おこし協力隊コーディネーター、観光DMC（根室・北方四島DMC）の代表、障害福祉SaaS（Maa2・TASKALL）のテックリード、
ゲストハウス兼イベントスペースSHIPのオーナー、Nemuro Street Jazz Festival の主催者。生成AI（Claude Code・エージェント開発）を実務で使う。
関心は「地方で事業を回す人の実務に効くか」。ニュースとしての大きさではなく、濵屋が今日コメントを書きたくなるかで判断する。`;

export function scoreSystem(profile: string, blocked: string[]): string {
  return `${PERSONA}

# 興味プロフィール（最新）
${profile}

# 出力
JSON のみを返す: {"items": [各記事の採点]}。各要素: {"id": string, "score": 0-100 の整数, "reason": 1文(40字以内), "cluster_key": 同じ話題をまとめる短い日本語キー(10字以内), "tags": [${DAILY_TAGS.map((t) => `"${t}"`).join(", ")} のうち該当するもの]}
- score 80以上: 濵屋の事業や地域に直接関わる、または今日コメントしたくなる一次情報
- score 50-79: 関心領域だが一般的、あるいは二次情報
- score 30未満: 無関係・宣伝・求人・個人的な雑談
- 同じ出来事を扱う記事は同じ cluster_key を付ける
- 英語の記事も日本語で reason を書く
${blocked.length ? `- 次の語に触れる記事は、reason にその語を書かない: ${blocked.join("、")}` : ""}`;
}

/** 採点結果の JSON スキーマ（構造化出力用） */
export const SCORE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          score: { type: "integer" },
          reason: { type: "string" },
          cluster_key: { type: "string" },
          tags: { type: "array", items: { type: "string", enum: [...DAILY_TAGS] } },
        },
        required: ["id", "score", "reason", "cluster_key", "tags"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

/** 要約結果の JSON スキーマ（構造化出力用） */
export const DIGEST_SCHEMA = {
  type: "object",
  properties: { summary: { type: "string" }, angle: { type: "string" } },
  required: ["summary", "angle"],
  additionalProperties: false,
};

export function scoreUser(items: { id: string; title: string; source: string; excerpt: string; lang: string }[]): string {
  return items.map((it, i) => `## ${i + 1}\nid: ${it.id}\nsource: ${it.source}\ntitle: ${it.title}\nexcerpt: ${it.excerpt.replace(/\s+/g, " ").slice(0, 300)}`).join("\n\n");
}

export function digestSystem(blocked: string[]): string {
  return `${PERSONA}

与えられた記事本文から、次の JSON を返す（JSON のみ）:
{"summary": "事実だけの要約を3行。各行40字以内。改行区切り。主語と固有名詞（自治体名・制度名・社名・年）を省略しない", "angle": "濵屋にとっての論点を1文、問いの形で。一般論として問う（濵屋の個別案件を推測して書かない）"}
- 記事にない数字や評価を足さない
- 英語記事は日本語で書く
- 有料記事で本文が取れていない場合はタイトルと冒頭から分かる範囲で書き、推測しない
${blocked.length ? `- 次の語は出力に含めない: ${blocked.join("、")}` : ""}`;
}

export function digestUser(it: { title: string; source: string; url: string; body: string }): string {
  return `title: ${it.title}\nsource: ${it.source}\nurl: ${it.url}\n\n${it.body}`;
}

export function polishSystem(blocked: string[]): string {
  return `あなたは濵屋雄太（北海道根室市のシステム会社経営者）の口述を、本人が公開するコメントとして整える編集者です。
- 音声入力の文字起こしを、意味を変えずに読みやすい文章にする。言い直し・フィラー・重複を除く
- 口調は本人のまま（です・ます調、断定は断定のまま）。内容を足さない、評価を変えない
- 長さは元の7〜10割。段落は最大2つ。見出しや箇条書きは使わない
- 出力は整えた本文のみ
${blocked.length ? `- 次の語が含まれていたら「○○」に置き換える: ${blocked.join("、")}` : ""}`;
}

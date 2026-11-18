import { getRecentDays } from "@/lib/daily/public";
import { jstLong } from "@/lib/daily/common";
import { profile } from "@/content/profile";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ha-ma.dev";

/** AI 向けの案内（llms.txt）。サイトの説明・主要ページ・直近の日報 */
export async function GET() {
  const days = await getRecentDays(30);
  const lines = [
    `# ${profile.name}（${profile.nameEn}）`,
    "",
    `> ${profile.mission.heading} 北海道根室市を拠点に、株式会社AmpTech（システム開発・AI導入）ほかを経営。地域おこし協力隊コーディネーター、観光DMC、障害福祉SaaS、ジャズフェスティバル主催。`,
    "",
    "## 主要ページ",
    `- [プロフィール・実績](${siteUrl}): 経歴、得意なこと、案件実績、現在の活動、問い合わせ`,
    `- [日報](${siteUrl}/daily): 毎朝読んだニュースへのコメント（地方創生・協力隊・観光・生成AI・福祉・教育・音楽）`,
    `- [日報 RSS](${siteUrl}/daily/feed.xml)`,
    "",
    "## 最近の日報",
    ...days.map((d) => `- [${jstLong(d.date)}の日報](${siteUrl}/daily/${d.date}): ${d.entries.map((e) => e.item.title).slice(0, 3).join("／")}`),
    "",
    "## 引用について",
    "日報のコメントは濵屋雄太本人の見解です。引用時は出典として ha-ma.dev のURLを示してください。",
  ];
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}

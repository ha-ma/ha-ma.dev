import { getRecentDays } from "@/lib/daily/public";
import { jstLong } from "@/lib/daily/common";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ha-ma.dev";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 日報の RSS（1日1エントリ） */
export async function GET() {
  const days = await getRecentDays(30);
  const items = days
    .map((d) => {
      const html = d.entries
        .map(
          (e) =>
            `<h3><a href="${esc(e.item.url)}">${esc(e.item.title)}</a></h3>${e.source?.name ? `<p><small>${esc(e.source.name)}</small></p>` : ""}<blockquote><p>${esc(e.comment.public_text ?? "").replace(/\n/g, "<br/>")}</p></blockquote>`,
        )
        .join("");
      const pub = d.entries[0]?.comment.published_at ?? `${d.date}T06:00:00+09:00`;
      return `<item>
<title>${esc(jstLong(d.date))}の日報</title>
<link>${siteUrl}/daily/${d.date}</link>
<guid isPermaLink="true">${siteUrl}/daily/${d.date}</guid>
<pubDate>${new Date(pub).toUTCString()}</pubDate>
<description>${esc(d.entries[0]?.comment.public_text?.slice(0, 200) ?? "")}</description>
<content:encoded><![CDATA[${html}]]></content:encoded>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>濵屋雄太の日報</title>
<link>${siteUrl}/daily</link>
<atom:link href="${siteUrl}/daily/feed.xml" rel="self" type="application/rss+xml"/>
<description>毎朝読んだニュースへのコメント。地方創生・協力隊・観光・生成AI・福祉・教育・音楽。根室から。</description>
<language>ja</language>
<lastBuildDate>${new Date(days[0]?.updatedAt || Date.now()).toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}

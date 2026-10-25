import type { Activity } from "@/types/database";
import { Card, GroupLabel, Pill, Section } from "./Section";

function ActivityCard({ a, muted }: { a: Activity; muted?: boolean }) {
  return (
    <Card as="li" className={muted ? "flex flex-col gap-2 bg-transparent" : "flex flex-col gap-2.5"}>
      <div className="flex items-start justify-between gap-3">
        <p className={muted ? "text-[15px] font-bold leading-snug" : "text-base font-bold leading-snug"}>
          {a.url ? (
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-ink no-underline hover:text-navy">
              {a.org}
            </a>
          ) : (
            a.org
          )}
        </p>
        {a.role && <Pill>{a.role}</Pill>}
      </div>
      {a.summary && <p className="text-[13px] leading-relaxed text-ink-2">{a.summary}</p>}
      {a.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {a.highlights.map((h) => (
            <Pill key={h} tone="orange">
              {h}
            </Pill>
          ))}
        </div>
      )}
    </Card>
  );
}

export function Now({ activities }: { activities: Activity[] }) {
  const companies = activities.filter((a) => a.group_type === "company");
  const community = activities.filter((a) => a.group_type === "community");
  if (activities.length === 0) return null;
  return (
    <Section
      id="now"
      eyebrow="NOW"
      title="現在の活動"
      lead="会社経営と地域活動の両輪で動いています。いずれも「地方に人・資本・技術が流れ込む仕組み」をつくることが共通テーマです。"
    >
      {companies.length > 0 && (
        <>
          <GroupLabel>会社・事業</GroupLabel>
          <ul className="mb-7 grid list-none gap-4 p-0 md:grid-cols-2">
            {companies.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
          </ul>
        </>
      )}
      {community.length > 0 && (
        <>
          <GroupLabel>地域活動・ネットワーク</GroupLabel>
          <ul className="grid list-none gap-4 p-0 md:grid-cols-2">
            {community.map((a) => (
              <ActivityCard key={a.id} a={a} muted />
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

import { notFound } from "next/navigation";
import { requireAdmin, TABLE_LABEL, type ContentTable } from "@/lib/admin";
import { Container, PageHeader } from "@/components/admin/ui";
import { SortableList, type Row } from "@/components/admin/SortableList";
import type { Activity, Strength, Work } from "@/types/database";

function isTable(v: string): v is ContentTable {
  return v === "activities" || v === "strengths" || v === "works";
}

export default async function ListPage({ params }: PageProps<"/admin/[table]">) {
  const { table } = await params;
  if (!isTable(table)) notFound();
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from(table).select("*").order("sort_order");
  if (error) throw new Error(error.message);

  let rows: Row[] = [];
  let groups: { label: string; rows: Row[] }[] | null = null;

  if (table === "activities") {
    const list = (data ?? []) as Activity[];
    const toRow = (a: Activity): Row => ({ id: a.id, title: a.org, subtitle: [a.role, a.region].filter(Boolean).join("・"), published: a.published });
    groups = [
      { label: "会社・事業", rows: list.filter((a) => a.group_type === "company").map(toRow) },
      { label: "地域活動・ネットワーク", rows: list.filter((a) => a.group_type === "community").map(toRow) },
    ];
  } else if (table === "strengths") {
    rows = ((data ?? []) as Strength[]).map((s) => ({ id: s.id, title: s.title, subtitle: s.body, published: s.published }));
  } else {
    rows = ((data ?? []) as Work[]).map((w) => ({ id: w.id, title: w.title, subtitle: `${w.category}／${w.phase}／${w.roles.join("・")}`, published: w.published, featured: w.featured }));
  }

  return (
    <Container>
      <PageHeader title={TABLE_LABEL[table]} action={{ href: `/admin/${table}/new`, label: "＋ 新規追加" }}>
        <p className="text-xs text-ink-3">ドラッグで並べ替え。バッジをクリックで公開／非公開を切替。変更は即時に公開ページへ反映されます。</p>
      </PageHeader>
      {groups ? (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-3 text-sm font-bold text-ink-3">{g.label}</h2>
              <SortableList table={table} rows={g.rows} />
            </section>
          ))}
        </div>
      ) : (
        <SortableList table={table} rows={rows} showFeatured={table === "works"} />
      )}
    </Container>
  );
}

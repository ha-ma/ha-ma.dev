import { requireAdmin } from "@/lib/admin";
import { Container, PageHeader } from "@/components/admin/ui";
import type { Source } from "@/types/database";
import { SourceRow, AddSourceForm } from "./SourceList";

export const metadata = { title: "ソース" };

export default async function SourcesPage({ searchParams }: PageProps<"/admin/sources">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("sources").select("*").order("group_name").order("tier").order("id");
  if (error) throw new Error(error.message);
  const all = (data ?? []) as Source[];
  const filter = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const list = filter ? all.filter((s) => `${s.name} ${s.id} ${s.group_name} ${s.kind} ${s.x_handle ?? ""}`.toLowerCase().includes(filter)) : all;
  const failing = all.filter((s) => s.enabled && s.fail_count >= 7);
  const groups = new Map<string, Source[]>();
  for (const s of list) groups.set(s.group_name, [...(groups.get(s.group_name) ?? []), s]);
  const counts = {
    total: all.length,
    enabled: all.filter((s) => s.enabled).length,
    error: all.filter((s) => s.last_status === "error").length,
    empty: all.filter((s) => s.last_status === "empty").length,
  };

  return (
    <Container>
      <PageHeader title="ソース">
        <p className="text-xs text-ink-3">
          {counts.total} 件（有効 {counts.enabled}・直近エラー {counts.error}・直近0件 {counts.empty}）。初期データは config/sources.yaml、追加はこの画面から。
        </p>
      </PageHeader>

      {failing.length > 0 && (
        <div className="mb-5 rounded-[10px] border border-red/30 bg-red/5 p-4 text-sm">
          <p className="mb-1 font-bold text-red">要差し替え（7回連続で失敗）</p>
          <ul className="flex flex-wrap gap-2 text-xs">
            {failing.map((s) => (
              <li key={s.id} className="rounded-full bg-white px-2.5 py-1">
                {s.name} <span className="text-ink-4">{s.last_error?.slice(0, 40)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="mb-5 flex gap-2" action="/admin/sources">
        <input name="q" defaultValue={filter} placeholder="名前・ID・グループ・kind で絞り込み" className="w-full max-w-md rounded-lg border border-line bg-white px-3 py-2 text-sm" />
        <button className="rounded-lg border border-line px-4 py-2 text-sm hover:border-navy">絞り込み</button>
      </form>

      <details className="mb-6 rounded-[10px] border border-line bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold">＋ ソースを追加</summary>
        <AddSourceForm />
      </details>

      <div className="flex flex-col gap-6">
        {Array.from(groups.entries()).map(([g, rows]) => (
          <section key={g}>
            <h2 className="mb-2 text-sm font-bold text-ink-3">
              {g} <span className="font-normal text-ink-4">({rows.length})</span>
            </h2>
            <div className="overflow-hidden rounded-[10px] border border-line bg-white">
              {rows.map((s) => (
                <SourceRow key={s.id} source={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}

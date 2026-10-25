import Link from "next/link";
import { requireAdmin, TABLE_LABEL, type ContentTable } from "@/lib/admin";
import { Container, PageHeader } from "@/components/admin/ui";
import { PurgeButton } from "./PurgeButton";

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const tables: ContentTable[] = ["activities", "strengths", "works"];
  const [counts, newInq] = await Promise.all([
    Promise.all(
      tables.map(async (t) => {
        const [{ count: all }, { count: pub }] = await Promise.all([
          supabase.from(t).select("id", { count: "exact", head: true }),
          supabase.from(t).select("id", { count: "exact", head: true }).eq("published", true),
        ]);
        return { table: t, all: all ?? 0, pub: pub ?? 0 };
      }),
    ),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  return (
    <Container>
      <PageHeader title="ダッシュボード" />
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/admin/inquiries" className="rounded-[10px] border border-line bg-white p-5 no-underline hover:border-navy">
          <p className="text-xs font-bold text-ink-3">未読の問い合わせ</p>
          <p className="font-en text-4xl font-bold text-orange">{newInq.count ?? 0}</p>
        </Link>
        {counts.map((c) => (
          <Link key={c.table} href={`/admin/${c.table}`} className="rounded-[10px] border border-line bg-white p-5 no-underline hover:border-navy">
            <p className="text-xs font-bold text-ink-3">{TABLE_LABEL[c.table]}</p>
            <p className="font-en text-4xl font-bold text-navy">
              {c.pub}
              <span className="ml-1 text-sm font-medium text-ink-4">/ {c.all} 公開</span>
            </p>
          </Link>
        ))}
      </div>
      <div className="mt-8 rounded-[10px] border border-line bg-white p-5">
        <p className="mb-2 text-sm font-bold">キャッシュ</p>
        <p className="mb-3 text-xs text-ink-3">保存時に自動で公開ページへ反映されます。反映されていないように見える場合だけ手動で更新してください。</p>
        <PurgeButton />
      </div>
    </Container>
  );
}

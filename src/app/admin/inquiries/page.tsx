import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { Container, PageHeader } from "@/components/admin/ui";
import type { Inquiry } from "@/types/database";
import { StatusSelect } from "./StatusSelect";

const STATUS_LABEL: Record<Inquiry["status"], string> = { new: "未読", read: "既読", replied: "返信済", spam: "スパム" };

export default async function InquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  const { status } = await searchParams;
  const filter = typeof status === "string" && status in STATUS_LABEL ? (status as Inquiry["status"]) : null;
  const { supabase } = await requireAdmin();
  let q = supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter) q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const list = (data ?? []) as Inquiry[];

  return (
    <Container>
      <PageHeader title="問い合わせ">
        <div className="mt-2 flex gap-1 text-xs">
          <Link href="/admin/inquiries" className={`rounded-full px-3 py-1 no-underline ${!filter ? "bg-navy text-white" : "border border-line text-ink"}`}>
            すべて
          </Link>
          {(Object.keys(STATUS_LABEL) as Inquiry["status"][]).map((s) => (
            <Link key={s} href={`/admin/inquiries?status=${s}`} className={`rounded-full px-3 py-1 no-underline ${filter === s ? "bg-navy text-white" : "border border-line text-ink"}`}>
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>
      </PageHeader>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-3">問い合わせはありません</p>
      ) : (
        <ul className="flex list-none flex-col gap-2 p-0">
          {list.map((i) => (
            <li key={i.id} className={`rounded-lg border border-line bg-white px-4 py-3 ${i.status === "new" ? "border-l-4 border-l-orange" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/admin/inquiries/${i.id}`} className="text-sm font-bold text-ink no-underline hover:text-navy">
                    {i.name}
                    {i.organization && <span className="ml-2 font-normal text-ink-3">{i.organization}</span>}
                  </Link>
                  <p className="text-xs text-ink-3">
                    {i.category} ・ {new Date(i.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    {i.status === "spam" && i.spam_reason && <span className="ml-2 text-red">({i.spam_reason})</span>}
                  </p>
                </div>
                <StatusSelect id={i.id} status={i.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{i.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

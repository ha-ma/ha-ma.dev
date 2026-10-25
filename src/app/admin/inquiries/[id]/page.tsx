import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { Container, PageHeader } from "@/components/admin/ui";
import type { Inquiry } from "@/types/database";
import { StatusSelect } from "../StatusSelect";

export default async function InquiryDetail({ params }: PageProps<"/admin/inquiries/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("inquiries").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  const i = data as Inquiry;

  // 未読なら既読に
  if (i.status === "new") {
    await supabase.from("inquiries").update({ status: "read" }).eq("id", id);
    i.status = "read";
  }

  const subject = encodeURIComponent(`Re: お問い合わせ（${i.category}）`);
  const body = encodeURIComponent(`${i.name} 様\n\nお問い合わせありがとうございます。\n\n\n----\n> ${i.message.split("\n").join("\n> ")}`);

  return (
    <Container>
      <PageHeader title={`${i.name} 様からの問い合わせ`}>
        <p className="text-xs text-ink-3">
          <Link href="/admin/inquiries" className="text-navy no-underline hover:underline">
            ← 一覧へ
          </Link>
        </p>
      </PageHeader>
      <div className="grid max-w-3xl gap-4 rounded-[10px] border border-line bg-white p-6">
        <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-[120px_1fr]">
          <dt className="text-ink-3">受信日時</dt>
          <dd>{new Date(i.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</dd>
          <dt className="text-ink-3">メール</dt>
          <dd>
            <a href={`mailto:${i.email}?subject=${subject}&body=${body}`} className="text-navy">
              {i.email}
            </a>
          </dd>
          <dt className="text-ink-3">組織</dt>
          <dd>{i.organization || "—"}</dd>
          <dt className="text-ink-3">種別</dt>
          <dd>{i.category}</dd>
          <dt className="text-ink-3">ステータス</dt>
          <dd>
            <StatusSelect id={i.id} status={i.status} />
            {i.spam_reason && <span className="ml-2 text-xs text-red">判定理由: {i.spam_reason}</span>}
          </dd>
        </dl>
        <div className="border-t border-line-3 pt-4">
          <p className="mb-2 text-xs font-bold text-ink-3">ご用件</p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{i.message}</p>
        </div>
        <div className="border-t border-line-3 pt-4 text-xs text-ink-4">
          <p>UA: {i.user_agent || "—"}</p>
          <p>IPハッシュ: {i.ip_hash || "—"}</p>
        </div>
        <div>
          <a href={`mailto:${i.email}?subject=${subject}&body=${body}`} className="inline-block rounded-lg bg-navy px-5 py-2.5 text-sm font-bold text-white no-underline hover:opacity-90">
            メールで返信する
          </a>
        </div>
      </div>
    </Container>
  );
}

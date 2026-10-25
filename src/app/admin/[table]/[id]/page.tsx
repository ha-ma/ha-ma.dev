import { notFound } from "next/navigation";
import { requireAdmin, TABLE_LABEL, type ContentTable } from "@/lib/admin";
import { Container, PageHeader } from "@/components/admin/ui";
import { EntityForm } from "@/components/admin/EntityForm";
import type { Activity, Strength, Work } from "@/types/database";

function isTable(v: string): v is ContentTable {
  return v === "activities" || v === "strengths" || v === "works";
}

export default async function EditPage({ params }: PageProps<"/admin/[table]/[id]">) {
  const { table, id } = await params;
  if (!isTable(table)) notFound();
  const { supabase } = await requireAdmin();

  let entity: Activity | Strength | Work | null = null;
  if (id !== "new") {
    const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) notFound();
    entity = data as Activity | Strength | Work;
  }

  const title = `${TABLE_LABEL[table]}を${entity ? "編集" : "追加"}`;
  return (
    <Container>
      <PageHeader title={title} />
      {table === "activities" && <EntityForm table="activities" entity={entity as Activity | null} />}
      {table === "strengths" && <EntityForm table="strengths" entity={entity as Strength | null} />}
      {table === "works" && <EntityForm table="works" entity={entity as Work | null} />}
    </Container>
  );
}

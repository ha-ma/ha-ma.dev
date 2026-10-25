import { requireAdmin } from "@/lib/admin";
import { Container, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "./SettingsForm";
import type { SiteSettings } from "@/types/database";

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return (
    <Container>
      <PageHeader title="サイト設定">
        <p className="text-xs text-ink-3">キャッチコピー、SNSリンク、通知先、フッターの各社リンク。</p>
      </PageHeader>
      <SettingsForm settings={data as SiteSettings} />
    </Container>
  );
}

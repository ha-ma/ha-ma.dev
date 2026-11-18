import { requireAdmin } from "@/lib/admin";
import { Container, PageHeader } from "@/components/admin/ui";
import type { BlockedTerm, DailySetting, InterestProfile } from "@/types/database";
import { BlockedTermsForm, DailySettingsForm, InterestProfileForm } from "./Forms";

export const metadata = { title: "興味プロフィール・日報設定" };

export default async function ProfilePage() {
  const { supabase } = await requireAdmin();
  const [{ data: profiles }, { data: terms }, { data: settings }] = await Promise.all([
    supabase.from("interest_profile").select("*").order("id", { ascending: false }).limit(10),
    supabase.from("blocked_terms").select("*").order("kind").order("term"),
    supabase.from("daily_settings").select("*"),
  ]);
  const latest = (profiles ?? [])[0] as InterestProfile | undefined;
  const settingMap = Object.fromEntries(((settings ?? []) as DailySetting[]).map((s) => [s.key, s.value])) as Record<string, unknown>;

  return (
    <Container className="max-w-[860px]">
      <PageHeader title="興味プロフィール・日報設定">
        <p className="text-xs text-ink-3">採点の基準になる文章と、公開しない語、配信先。変更は翌朝のバッチから反映されます。</p>
      </PageHeader>
      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-2 text-sm font-bold">興味プロフィール</h2>
          <InterestProfileForm body={latest?.body ?? ""} history={((profiles ?? []) as InterestProfile[]).slice(1).map((p) => ({ id: p.id, created_at: p.created_at, head: p.body.slice(0, 60) }))} />
        </section>
        <section>
          <h2 className="mb-2 text-sm font-bold">公開しない語（禁則辞書）</h2>
          <p className="mb-2 text-xs text-ink-3">進行中の商談・未公表の案件・触れない人名。保存前に照合して確認を求め、AIの要約からも除きます。公開済みの活動は登録しないでください。</p>
          <BlockedTermsForm terms={(terms ?? []) as BlockedTerm[]} />
        </section>
        <section>
          <h2 className="mb-2 text-sm font-bold">配信・実行の設定</h2>
          <DailySettingsForm
            values={{
              mail_to: String(settingMap.mail_to ?? ""),
              x_list_url: String(settingMap.x_list_url ?? ""),
              digest_size: Number(settingMap.digest_size ?? 10),
              model_score: String(settingMap.model_score ?? ""),
              model_digest: String(settingMap.model_digest ?? ""),
            }}
          />
        </section>
      </div>
    </Container>
  );
}

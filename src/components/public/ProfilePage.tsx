import type { Activity, SiteSettings, Strength, Work } from "@/types/database";
import { Nav } from "./Nav";
import { Sidebar } from "./Sidebar";
import { Mission } from "./Mission";
import { Now } from "./Now";
import { Strengths } from "./Strengths";
import { Stats } from "./Stats";
import { Works } from "./Works";
import { Skills } from "./Skills";
import { Career } from "./Career";
import { Contact } from "./Contact";

export interface ProfilePageData {
  activities: Activity[];
  strengths: Strength[];
  works: Work[];
  settings: SiteSettings;
}

/** 公開ページ本体。プレビュー（/admin/preview）とも共有する */
export function ProfilePage({ data, previewBanner }: { data: ProfilePageData; previewBanner?: React.ReactNode }) {
  return (
    <div className="min-h-full text-base">
      {previewBanner}
      <Nav />
      <div id="top" className="mx-auto flex w-full max-w-[1120px] flex-wrap items-start gap-10 px-4 pb-24 pt-6 md:gap-16 md:px-8">
        <Sidebar settings={data.settings} />
        <main className="min-w-0 flex-[999_1_560px]">
          <Mission />
          <Now activities={data.activities} />
          <Strengths strengths={data.strengths} />
          <Stats />
          <Works works={data.works} />
          <Skills />
          <Career />
          <Contact settings={data.settings} />
        </main>
      </div>
    </div>
  );
}

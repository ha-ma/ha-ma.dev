// config/sources.yaml を sources テーブルへ upsert する（既存の enabled / selector / 取得状態は保持）
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { Db } from "@/lib/daily/common";
import { SOURCE_KINDS, type SourceKind } from "@/types/database";

export type YamlSource = {
  id: string;
  name: string;
  group: string;
  kind: string;
  lang?: string;
  url?: string | null;
  feed?: string | null;
  x?: string | null;
  tags?: string[];
  tier?: number;
  note?: string;
  verified?: boolean;
};

export function readSourcesYaml(file: string): YamlSource[] {
  const doc = parse(readFileSync(file, "utf8")) as { sources: YamlSource[] };
  if (!doc?.sources?.length) throw new Error("sources が空です");
  return doc.sources;
}

export async function seedSources(db: Db, file: string, log: (m: string) => void) {
  const list = readSourcesYaml(file);
  const rows = list.map((s) => {
    if (!(SOURCE_KINDS as readonly string[]).includes(s.kind)) throw new Error(`不明な kind: ${s.kind} (${s.id})`);
    return {
      id: s.id,
      name: s.name,
      group_name: s.group,
      kind: s.kind as SourceKind,
      lang: s.lang ?? "ja",
      url: s.url ?? null,
      feed: s.feed ?? null,
      x_handle: s.x ?? null,
      tags: s.tags ?? [],
      tier: s.tier ?? 2,
      note: s.note ?? "",
    };
  });
  // 取得できている既存ソースのフィード URL は保持する（自動発見や管理画面での修正を yaml で上書きしない）
  const { data: existing } = await db.from("sources").select("id, feed, last_status");
  const keep = new Map((existing ?? []).filter((e) => e.feed && (e.last_status === "ok" || e.last_status === "empty")).map((e) => [e.id, e.feed]));
  for (const r of rows) {
    const k = keep.get(r.id);
    if (k) r.feed = k;
  }
  // enabled / selector / fail_count などは触らない: 指定した列だけ更新する
  const { error } = await db.from("sources").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`sources の投入に失敗: ${error.message}`);
  log(`sources: ${rows.length} 件を投入（${file}）`);
  const kinds = rows.reduce<Record<string, number>>((a, r) => ((a[r.kind] = (a[r.kind] ?? 0) + 1), a), {});
  log(JSON.stringify(kinds));
}

import type { Source } from "@/types/database";

/** アダプタが返す共通形 */
export type RawItem = {
  url: string;
  title: string;
  author?: string | null;
  publishedAt?: string | null; // ISO
  excerpt: string; // 冒頭 300 字
  lang?: string;
};

export type AdapterResult = { items: RawItem[]; status: "ok" | "empty" | "error"; error?: string };

export type Adapter = (source: Source, ctx: AdapterContext) => Promise<AdapterResult>;

export type AdapterContext = {
  /** 過去24時間より古いものは捨てる基準時刻 */
  since: Date;
  fetchText: (url: string, init?: RequestInit) => Promise<string>;
  log: (msg: string) => void;
};

export type ScoreResult = {
  id: string;
  score: number;
  reason: string;
  cluster_key: string;
  tags: string[];
};

export type DigestResult = { summary: string; angle: string };

export type Usage = { input: number; output: number; calls: number };

export const DEFAULT_DIGEST_SIZE = 10;
export const EXCERPT_CHARS = 300;
export const BODY_CHARS = 6000;
export const SCORE_BATCH = 20;
export const PER_SOURCE_CAP = 2;

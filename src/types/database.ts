// 手書きの型定義。Supabase CLI が使える環境では
//   npm run db:types
// で自動生成に置き換えてよい（同じ形になる）。

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type GroupType = "company" | "community";
export const WORK_CATEGORIES = ["EC", "WEBシステム", "アプリ", "SaaS", "ITコンサル", "制作", "新規事業"] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];
export const WORK_PHASES = ["企画", "0→1", "追加開発", "保守運用", "一気通貫", "企画〜導入"] as const;
export type WorkPhase = (typeof WORK_PHASES)[number];
export const INQUIRY_CATEGORIES = ["PM・開発支援", "AI導入", "新規事業", "行政・地域", "その他"] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];
export const INQUIRY_STATUSES = ["new", "read", "replied", "spam"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export type Activity = {
  id: string;
  group_type: GroupType;
  org: string;
  role: string;
  summary: string;
  highlights: string[];
  region: string;
  url: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type Strength = {
  id: string;
  title: string;
  body: string;
  icon: string;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type Work = {
  id: string;
  category: WorkCategory;
  title: string;
  phase: WorkPhase;
  roles: string[];
  team_size: string;
  period: string;
  summary: string;
  stack: string[];
  featured: boolean;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type CompanyLink = {
  label: string;
  url: string;
}

export type SiteSettings = {
  id: 1;
  tagline: string;
  contact_email: string;
  sns_facebook: string;
  sns_x: string;
  sns_linkedin: string;
  sns_github: string;
  company_links: CompanyLink[];
  updated_at: string;
}

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  organization: string;
  category: InquiryCategory;
  message: string;
  status: InquiryStatus;
  spam_reason: string;
  ip_hash: string;
  user_agent: string;
  turnstile: Json | null;
  created_at: string;
}


// ---- 日報（フェーズ①） ----
export const SOURCE_KINDS = ["rss", "gnews", "gnews_en", "page", "note", "yt", "x"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export const DAILY_TAGS = ["協力隊", "観光", "AI", "行政", "根室", "福祉", "教育", "音楽", "EC", "起業"] as const;
export type DailyTag = (typeof DAILY_TAGS)[number];
export type ItemStatus = "new" | "scored" | "digest" | "skipped";

export type Source = {
  id: string;
  name: string;
  group_name: string;
  kind: SourceKind;
  lang: string;
  url: string | null;
  feed: string | null;
  x_handle: string | null;
  tags: string[];
  tier: number;
  note: string;
  enabled: boolean;
  selector: string | null;
  last_fetched_at: string | null;
  last_status: string | null;
  last_error: string | null;
  fail_count: number;
  created_at: string;
  updated_at: string;
};

export type DailyItem = {
  id: string;
  source_id: string;
  run_date: string;
  canonical_url: string;
  url: string;
  title: string;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  excerpt: string;
  body: string | null;
  lang: string;
  score: number | null;
  score_reason: string | null;
  tags: string[];
  cluster_key: string | null;
  rank: number | null;
  summary: string | null;
  angle: string | null;
  status: ItemStatus;
};

export type Comment = {
  id: string;
  item_id: string;
  run_date: string;
  public_text: string | null;
  private_memo: string | null;
  tags: string[];
  podcast_flag: boolean;
  guard_overridden: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InterestProfile = { id: number; body: string; created_at: string };

export type DailyRun = {
  run_date: string;
  mode: "full" | "degraded";
  stages: Json;
  items_collected: number;
  items_scored: number;
  digest_count: number;
  cost_usd: number;
  mailed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlockedTerm = { id: number; term: string; kind: "name" | "deal" | "other"; note: string; created_at: string };
export type DailySetting = { key: string; value: Json; updated_at: string };

type Insertable<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: Activity;
        Insert: Insertable<Activity, "id" | "created_at" | "updated_at" | "sort_order" | "published" | "highlights" | "region" | "role" | "summary" | "url">;
        Update: Partial<Activity>;
        Relationships: [];
      };
      strengths: {
        Row: Strength;
        Insert: Insertable<Strength, "id" | "created_at" | "updated_at" | "sort_order" | "published" | "body" | "icon">;
        Update: Partial<Strength>;
        Relationships: [];
      };
      works: {
        Row: Work;
        Insert: Insertable<Work, "id" | "created_at" | "updated_at" | "sort_order" | "published" | "featured" | "roles" | "stack" | "team_size" | "period" | "summary">;
        Update: Partial<Work>;
        Relationships: [];
      };
      site_settings: {
        Row: SiteSettings;
        Insert: SiteSettings;
        Update: Partial<SiteSettings>;
        Relationships: [];
      };
      inquiries: {
        Row: Inquiry;
        Insert: Insertable<Inquiry, "id" | "created_at" | "status" | "spam_reason" | "ip_hash" | "user_agent" | "turnstile" | "organization">;
        Update: Partial<Inquiry>;
        Relationships: [];
      };
      rate_limits: {
        Row: { key: string; count: number; window_start: string };
        Insert: { key: string; count?: number; window_start?: string };
        Update: { key?: string; count?: number; window_start?: string };
        Relationships: [];
      };
      sources: {
        Row: Source;
        Insert: Insertable<Source, "lang" | "url" | "feed" | "x_handle" | "tags" | "tier" | "note" | "enabled" | "selector" | "last_fetched_at" | "last_status" | "last_error" | "fail_count" | "created_at" | "updated_at">;
        Update: Partial<Source>;
        Relationships: [];
      };
      daily_items: {
        Row: DailyItem;
        Insert: Insertable<DailyItem, "id" | "author" | "published_at" | "fetched_at" | "excerpt" | "body" | "lang" | "score" | "score_reason" | "tags" | "cluster_key" | "rank" | "summary" | "angle" | "status">;
        Update: Partial<DailyItem>;
        Relationships: [{ foreignKeyName: "daily_items_source_id_fkey"; columns: ["source_id"]; isOneToOne: false; referencedRelation: "sources"; referencedColumns: ["id"] }];
      };
      comments: {
        Row: Comment;
        Insert: Insertable<Comment, "id" | "public_text" | "private_memo" | "tags" | "podcast_flag" | "guard_overridden" | "published_at" | "created_at" | "updated_at">;
        Update: Partial<Comment>;
        Relationships: [{ foreignKeyName: "comments_item_id_fkey"; columns: ["item_id"]; isOneToOne: true; referencedRelation: "daily_items"; referencedColumns: ["id"] }];
      };
      interest_profile: {
        Row: InterestProfile;
        Insert: { body: string; id?: number; created_at?: string };
        Update: Partial<InterestProfile>;
        Relationships: [];
      };
      daily_runs: {
        Row: DailyRun;
        Insert: Insertable<DailyRun, "mode" | "stages" | "items_collected" | "items_scored" | "digest_count" | "cost_usd" | "mailed_at" | "created_at" | "updated_at">;
        Update: Partial<DailyRun>;
        Relationships: [];
      };
      blocked_terms: {
        Row: BlockedTerm;
        Insert: { term: string; kind?: BlockedTerm["kind"]; note?: string; id?: number; created_at?: string };
        Update: Partial<BlockedTerm>;
        Relationships: [];
      };
      daily_settings: {
        Row: DailySetting;
        Insert: { key: string; value: Json; updated_at?: string };
        Update: Partial<DailySetting>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      daily_public_dates: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: { run_date: string; item_count: number; last_updated: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

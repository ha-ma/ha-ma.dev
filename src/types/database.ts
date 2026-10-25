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
    };
    Views: Record<string, never>;
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

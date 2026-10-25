-- 濵屋雄太 紹介ページ: 初期スキーマ
-- 公開コンテンツ3テーブル + サイト設定 + 問い合わせ + レート制限

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 共通: updated_at 自動更新
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 管理者判定
--   許可メールは app_settings テーブルではなく、auth.users のメールと
--   環境変数 ADMIN_EMAIL をアプリ側で照合する。RLS 側では
--   「auth.users に存在する = 管理者」とする（サインアップは無効化し、
--   管理者ユーザーはダッシュボードから手動作成する運用）。
-- ---------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

-- ---------------------------------------------------------------
-- activities: 現在の活動
-- ---------------------------------------------------------------
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  group_type  text not null check (group_type in ('company', 'community')),
  org         text not null check (char_length(org) between 1 and 80),
  role        text not null default '' check (char_length(role) <= 40),
  summary     text not null default '' check (char_length(summary) <= 300),
  highlights  text[] not null default '{}',
  region      text not null default '' check (char_length(region) <= 40),
  url         text check (url is null or url = '' or url ~* '^https://'),
  sort_order  integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index activities_public_idx on public.activities (published, group_type, sort_order);
create trigger activities_set_updated_at before update on public.activities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- strengths: 得意なこと
-- ---------------------------------------------------------------
create table public.strengths (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 40),
  body        text not null default '' check (char_length(body) <= 200),
  icon        text not null default '' check (char_length(icon) <= 40),
  sort_order  integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index strengths_public_idx on public.strengths (published, sort_order);
create trigger strengths_set_updated_at before update on public.strengths
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- works: 携わってきた案件
-- ---------------------------------------------------------------
create table public.works (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('EC', 'WEBシステム', 'アプリ', 'SaaS', 'ITコンサル', '制作', '新規事業')),
  title       text not null check (char_length(title) between 1 and 60),
  phase       text not null check (phase in ('企画', '0→1', '追加開発', '保守運用', '一気通貫', '企画〜導入')),
  roles       text[] not null default '{}',
  team_size   text not null default '' check (char_length(team_size) <= 60),
  period      text not null default '' check (char_length(period) <= 30),
  summary     text not null default '' check (char_length(summary) <= 400),
  stack       text[] not null default '{}',
  featured    boolean not null default false,
  sort_order  integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index works_public_idx on public.works (published, featured, sort_order);
create trigger works_set_updated_at before update on public.works
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- site_settings: サイト設定（単一行）
-- ---------------------------------------------------------------
create table public.site_settings (
  id              integer primary key check (id = 1),
  tagline         text not null default '' check (char_length(tagline) <= 60),
  contact_email   text not null default '' check (char_length(contact_email) <= 120),
  sns_facebook    text not null default '' check (sns_facebook = '' or sns_facebook ~* '^https://'),
  sns_x           text not null default '' check (sns_x = '' or sns_x ~* '^https://'),
  sns_linkedin    text not null default '' check (sns_linkedin = '' or sns_linkedin ~* '^https://'),
  sns_github      text not null default '' check (sns_github = '' or sns_github ~* '^https://'),
  company_links   jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
insert into public.site_settings (id) values (1);

-- ---------------------------------------------------------------
-- inquiries: 問い合わせ
-- ---------------------------------------------------------------
create table public.inquiries (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 50),
  email           text not null check (char_length(email) between 3 and 254),
  organization    text not null default '' check (char_length(organization) <= 100),
  category        text not null check (category in ('PM・開発支援', 'AI導入', '新規事業', '行政・地域', 'その他')),
  message         text not null check (char_length(message) between 1 and 2000),
  status          text not null default 'new' check (status in ('new', 'read', 'replied', 'spam')),
  spam_reason     text not null default '',
  ip_hash         text not null default '',
  user_agent      text not null default '',
  turnstile       jsonb,
  created_at      timestamptz not null default now()
);
create index inquiries_status_idx on public.inquiries (status, created_at desc);

-- ---------------------------------------------------------------
-- rate_limits: 固定ウィンドウのレート制限
-- ---------------------------------------------------------------
create table public.rate_limits (
  key           text primary key,
  count         integer not null default 0,
  window_start  timestamptz not null default now()
);

-- 原子的にカウントし、上限を超えていれば false を返す
create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
                  when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
                  else r.count + 1
                end,
        window_start = case
                  when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
                  else r.window_start
                end
  returning count into v_count;

  -- 古いキーの掃除（確率的に実行）
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_max;
end;
$$;

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.activities    enable row level security;
alter table public.strengths     enable row level security;
alter table public.works         enable row level security;
alter table public.site_settings enable row level security;
alter table public.inquiries     enable row level security;
alter table public.rate_limits   enable row level security;

-- 公開コンテンツ: 匿名は published のみ、管理者は全操作
create policy "public read published" on public.activities
  for select to anon, authenticated using (published = true or public.is_admin());
create policy "admin write" on public.activities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read published" on public.strengths
  for select to anon, authenticated using (published = true or public.is_admin());
create policy "admin write" on public.strengths
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read published" on public.works
  for select to anon, authenticated using (published = true or public.is_admin());
create policy "admin write" on public.works
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- サイト設定: 誰でも読める、管理者のみ更新
create policy "public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "admin update" on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 問い合わせ: 匿名は何もできない（INSERT は service_role から）。管理者は閲覧・ステータス更新
create policy "admin read" on public.inquiries
  for select to authenticated using (public.is_admin());
create policy "admin update" on public.inquiries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- rate_limits: service_role のみ（ポリシーなし = 全拒否）

-- ---------------------------------------------------------------
-- 権限: anon/authenticated から rate_limits・inquiries への直接操作を遮断
-- ---------------------------------------------------------------
revoke all on public.rate_limits from anon, authenticated;
revoke insert, delete on public.inquiries from anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

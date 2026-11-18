-- 日報の土台（フェーズ①）: ソース・収集アイテム・コメント・興味プロフィール・実行記録・禁則辞書・設定
-- 設計書: ha-ma.dev フェーズ① 日報の土台 設計書 v0.1

-- ---------------------------------------------------------------
-- sources: 収集元（config/sources.yaml を upsert で投入）
-- ---------------------------------------------------------------
create table public.sources (
  id              text primary key,
  name            text not null,
  group_name      text not null,
  kind            text not null check (kind in ('rss','gnews','gnews_en','page','note','yt','x')),
  lang            text not null default 'ja',
  url             text,
  feed            text,
  x_handle        text,
  tags            text[] not null default '{}',
  tier            smallint not null default 2 check (tier between 1 and 3),
  note            text not null default '',
  enabled         boolean not null default true,
  selector        text,                 -- page 用の CSS セレクタ（null なら既定）
  last_fetched_at timestamptz,
  last_status     text,                 -- ok / empty / error
  last_error      text,
  fail_count      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger sources_updated_at before update on public.sources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- daily_items: 収集した記事（canonical_url で重複排除）
-- ---------------------------------------------------------------
create table public.daily_items (
  id             uuid primary key default gen_random_uuid(),
  source_id      text not null references public.sources(id) on delete cascade,
  run_date       date not null,
  canonical_url  text not null unique,
  url            text not null,
  title          text not null,
  author         text,
  published_at   timestamptz,
  fetched_at     timestamptz not null default now(),
  excerpt        text not null default '',
  body           text,
  lang           text not null default 'ja',
  score          smallint,
  score_reason   text,
  tags           text[] not null default '{}',
  cluster_key    text,
  rank           smallint,
  summary        text,
  angle          text,
  status         text not null default 'new' check (status in ('new','scored','digest','skipped'))
);
create index daily_items_run_rank_idx on public.daily_items (run_date, rank);
create index daily_items_source_fetched_idx on public.daily_items (source_id, fetched_at desc);
create index daily_items_status_idx on public.daily_items (status) where status = 'new';

-- ---------------------------------------------------------------
-- comments: 濵屋のコメント（public_text があれば公開）
-- ---------------------------------------------------------------
create table public.comments (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid not null unique references public.daily_items(id) on delete cascade,
  run_date         date not null,
  public_text      text,
  private_memo     text,
  tags             text[] not null default '{}',
  podcast_flag     boolean not null default false,
  guard_overridden text[] not null default '{}',
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();
create index comments_public_idx on public.comments (run_date desc) where public_text is not null;

-- ---------------------------------------------------------------
-- interest_profile: 採点に渡す興味プロフィール（履歴を残すため insert のみ）
-- ---------------------------------------------------------------
create table public.interest_profile (
  id         serial primary key,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- daily_runs: バッチの実行記録（watchdog の判定にも使う）
-- ---------------------------------------------------------------
create table public.daily_runs (
  run_date        date primary key,
  mode            text not null default 'full' check (mode in ('full','degraded')),
  stages          jsonb not null default '{}'::jsonb,
  items_collected integer not null default 0,
  items_scored    integer not null default 0,
  digest_count    integer not null default 0,
  cost_usd        numeric(10,4) not null default 0,
  mailed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger daily_runs_updated_at before update on public.daily_runs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- blocked_terms: 公開しない領域（人名・案件名・社名）
-- ---------------------------------------------------------------
create table public.blocked_terms (
  id         serial primary key,
  term       text not null unique,
  kind       text not null default 'other' check (kind in ('name','deal','other')),
  note       text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- daily_settings: key/value 設定
-- ---------------------------------------------------------------
create table public.daily_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger daily_settings_updated_at before update on public.daily_settings
  for each row execute function public.set_updated_at();

insert into public.daily_settings (key, value) values
  ('digest_size', '10'::jsonb),
  ('mail_to', '"yuta.hamaya@amptech.co.jp"'::jsonb),
  ('x_list_url', '""'::jsonb),
  ('degraded_enabled', 'true'::jsonb),
  ('model_score', '""'::jsonb),
  ('model_digest', '""'::jsonb);

insert into public.interest_profile (body) values (
$$地方創生・関係人口・地域おこし協力隊の制度・事例（総務省・自治体発表）
北海道・道東の行政・観光・水産・酪農のニュース、クルーズ・インバウンド
生成AIの実務活用（Claude Code・エージェント開発・行政DX）、SaaSの事業づくり
補助金・公募（道庁・総務省・観光庁・経産省）の新着
福祉：障害福祉・就労支援の制度改定、福祉×IT・AIの事例
教育：探究学習・高校魅力化・高校生の起業、AI×教育
音楽：ジャズ、音楽フェスの運営と地域経済、音楽ビジネス×テック$$
);

-- ---------------------------------------------------------------
-- RLS
--   公開: コメント付きの digest アイテムと公開コメントのみ anon が読める
--   それ以外は管理者（is_admin）だけ。バッチは service role で書く
-- ---------------------------------------------------------------
alter table public.sources          enable row level security;
alter table public.daily_items      enable row level security;
alter table public.comments         enable row level security;
alter table public.interest_profile enable row level security;
alter table public.daily_runs       enable row level security;
alter table public.blocked_terms    enable row level security;
alter table public.daily_settings   enable row level security;

-- 公開ページで出典名を表示するため、ソースの基本情報は誰でも読める（公開リストと同じ内容）
create policy "public read" on public.sources
  for select to anon, authenticated using (true);
create policy "admin write" on public.sources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read commented digest" on public.daily_items
  for select to anon, authenticated using (
    public.is_admin()
    or (status = 'digest' and exists (
      select 1 from public.comments c where c.item_id = daily_items.id and c.public_text is not null
    ))
  );
create policy "admin write" on public.daily_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read published" on public.comments
  for select to anon, authenticated using (public_text is not null or public.is_admin());
create policy "admin write" on public.comments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all" on public.interest_profile
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.daily_runs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.blocked_terms
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.daily_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 公開ページは「公開コメントがある日」の一覧が必要なので、日付ごとの件数を返す関数を用意する
create or replace function public.daily_public_dates(p_limit integer default 30, p_offset integer default 0)
returns table (run_date date, item_count bigint, last_updated timestamptz)
language sql
stable
security invoker
as $$
  select c.run_date, count(*)::bigint, max(c.updated_at)
  from public.comments c
  where c.public_text is not null
  group by c.run_date
  order by c.run_date desc
  limit p_limit offset p_offset;
$$;
grant execute on function public.daily_public_dates(integer, integer) to anon, authenticated;

-- =============================================================================
-- ECUP01 — Supabase schema + Row Level Security
-- Paste the whole file into Supabase SQL Editor and press RUN.
-- Fully idempotent: safe to run again and again.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------------------------------

-- Teams. `logo_url` stores the LOCAL path (e.g. '/images/Morocco.png') that the
-- app serves from public/images/. `en` / `ar` hold the bilingual names the UI
-- renders via teamName(team, lang) (falls back to `name` if empty).
create table if not exists public.teams (
  id             text primary key,              -- e.g. 'MEX'
  name           text not null,                 -- display name (English)
  en             text not null default '',
  ar             text not null default '',
  group_letter   text not null,                 -- 'A'..'L'
  logo_url       text,                          -- '/images/Morocco.png'
  matches_played integer not null default 0,
  wins           integer not null default 0,
  draws          integer not null default 0,
  losses         integer not null default 0,
  goals_for      integer not null default 0,
  goals_against  integer not null default 0,
  points         integer not null default 0,
  created_at     timestamptz not null default now()
);

-- Matches. `stage` drives both the group stage ('group') and the knockout
-- rounds ('r32' | 'r16' | 'qf' | 'sf' | 'final'). `group_letter` only applies
-- to group-stage matches. `status`: 'scheduled' | 'live' | 'finished'.
create table if not exists public.matches (
  id            text primary key,               -- e.g. 'g-A-0', 'ko-1'
  home_team_id  text not null references public.teams (id) on update cascade on delete cascade,
  away_team_id  text not null references public.teams (id) on update cascade on delete cascade,
  home_score    integer,
  away_score    integer,
  match_date    timestamptz,
  stage         text not null default 'group',
  status        text not null default 'scheduled',
  group_letter  text,
  created_at    timestamptz not null default now(),
  constraint matches_stage_check  check (stage in ('group', 'r32', 'r16', 'qf', 'sf', 'final')),
  constraint matches_status_check check (status in ('scheduled', 'live', 'finished')),
  constraint matches_same_team_check check (home_team_id <> away_team_id)
);

-- -----------------------------------------------------------------------------
-- 2. INDEXES
-- -----------------------------------------------------------------------------
create index if not exists teams_group_letter_idx  on public.teams (group_letter);
create index if not exists matches_stage_idx       on public.matches (stage);
create index if not exists matches_group_letter_idx on public.matches (group_letter);
create index if not exists matches_home_team_idx   on public.matches (home_team_id);
create index if not exists matches_away_team_idx   on public.matches (away_team_id);

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.teams   enable row level security;
alter table public.matches enable row level security;

-- Admin detection: a user is an admin when their JWT app_metadata.role is
-- 'admin'. Mark an account as admin with:
--
--   supabase.auth.admin.updateUserById('<user-uuid>', {
--     app_metadata: { role: 'admin' },
--   })
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- Public read access: anyone (even anonymous) can SELECT.
DROP POLICY IF EXISTS "teams public read" ON public.teams;
CREATE POLICY "teams public read" ON public.teams FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "matches public read" ON public.matches;
CREATE POLICY "matches public read" ON public.matches FOR SELECT TO public USING (true);

-- Write access (INSERT / UPDATE / DELETE) restricted to authenticated admins.
DROP POLICY IF EXISTS "teams admin write" ON public.teams;
CREATE POLICY "teams admin write" ON public.teams FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "matches admin write" ON public.matches;
CREATE POLICY "matches admin write" ON public.matches FOR ALL TO authenticated USING (is_admin());

-- -----------------------------------------------------------------------------
-- 4. SEED: 48 teams (kept in sync with src/data/teams.js)
--    Optional — run once. `logo_url` points at the local flag files in
--    public/images/, so the app renders them without any uploads.
-- -----------------------------------------------------------------------------
insert into public.teams
  (id, name, en, ar, group_letter, logo_url, matches_played, wins, draws, losses, goals_for, goals_against, points)
values
  ('MEX', 'Mexico', 'Mexico', 'المكسيك', 'A', '/images/Mexico.png', 0, 0, 0, 0, 0, 0, 0),
  ('CAN', 'Canada', 'Canada', 'كندا', 'A', '/images/Canada.png', 0, 0, 0, 0, 0, 0, 0),
  ('USA', 'USA', 'USA', 'الولايات المتحدة', 'A', '/images/USA.png', 0, 0, 0, 0, 0, 0, 0),
  ('PAN', 'Panama', 'Panama', 'بنما', 'A', '/images/South Africa.png', 0, 0, 0, 0, 0, 0, 0),
  ('ARG', 'Argentina', 'Argentina', 'الأرجنتين', 'B', '/images/Argentina.png', 0, 0, 0, 0, 0, 0, 0),
  ('BRA', 'Brazil', 'Brazil', 'البرازيل', 'B', '/images/Brazil.png', 0, 0, 0, 0, 0, 0, 0),
  ('URU', 'Uruguay', 'Uruguay', 'أوروغواي', 'B', '/images/Uruguay.png', 0, 0, 0, 0, 0, 0, 0),
  ('COL', 'Colombia', 'Colombia', 'كولومبيا', 'B', '/images/Colombia.png', 0, 0, 0, 0, 0, 0, 0),
  ('ECU', 'Ecuador', 'Ecuador', 'الإكوادور', 'C', '/images/Ecuador.webp', 0, 0, 0, 0, 0, 0, 0),
  ('PAR', 'Paraguay', 'Paraguay', 'باراغواي', 'C', '/images/Paraguay.png', 0, 0, 0, 0, 0, 0, 0),
  ('PER', 'Peru', 'Peru', 'بيرو', 'C', '/images/Serbia.png', 0, 0, 0, 0, 0, 0, 0),
  ('CHI', 'Chile', 'Chile', 'تشيلي', 'C', '/images/Russia.png', 0, 0, 0, 0, 0, 0, 0),
  ('FRA', 'France', 'France', 'فرنسا', 'D', '/images/France.png', 0, 0, 0, 0, 0, 0, 0),
  ('ESP', 'Spain', 'Spain', 'إسبانيا', 'D', '/images/Spain.png', 0, 0, 0, 0, 0, 0, 0),
  ('GER', 'Germany', 'Germany', 'ألمانيا', 'D', '/images/Germany.png', 0, 0, 0, 0, 0, 0, 0),
  ('POR', 'Portugal', 'Portugal', 'البرتغال', 'D', '/images/Portugal.png', 0, 0, 0, 0, 0, 0, 0),
  ('ENG', 'England', 'England', 'إنجلترا', 'E', '/images/England.png', 0, 0, 0, 0, 0, 0, 0),
  ('NED', 'Netherlands', 'Netherlands', 'هولندا', 'E', '/images/Netherlands.png', 0, 0, 0, 0, 0, 0, 0),
  ('BEL', 'Belgium', 'Belgium', 'بلجيكا', 'E', '/images/Belgium.png', 0, 0, 0, 0, 0, 0, 0),
  ('ITA', 'Italy', 'Italy', 'إيطاليا', 'E', '/images/Italy.png', 0, 0, 0, 0, 0, 0, 0),
  ('CRO', 'Croatia', 'Croatia', 'كرواتيا', 'F', '/images/Croatia.png', 0, 0, 0, 0, 0, 0, 0),
  ('SUI', 'Switzerland', 'Switzerland', 'سويسرا', 'F', '/images/Switzerland.png', 0, 0, 0, 0, 0, 0, 0),
  ('AUT', 'Austria', 'Austria', 'النمسا', 'F', '/images/Austria.png', 0, 0, 0, 0, 0, 0, 0),
  ('DEN', 'Denmark', 'Denmark', 'الدنمارك', 'F', '/images/Denmark.png', 0, 0, 0, 0, 0, 0, 0),
  ('MAR', 'Morocco', 'Morocco', 'المغرب', 'G', '/images/Morocco.png', 0, 0, 0, 0, 0, 0, 0),
  ('SEN', 'Senegal', 'Senegal', 'السنغال', 'G', '/images/Senegal.png', 0, 0, 0, 0, 0, 0, 0),
  ('NGA', 'Nigeria', 'Nigeria', 'نيجيريا', 'G', '/images/Nigeria.png', 0, 0, 0, 0, 0, 0, 0),
  ('EGY', 'Egypt', 'Egypt', 'مصر', 'G', '/images/Egypt.png', 0, 0, 0, 0, 0, 0, 0),
  ('ALG', 'Algeria', 'Algeria', 'الجزائر', 'H', '/images/Algeria.png', 0, 0, 0, 0, 0, 0, 0),
  ('TUN', 'Tunisia', 'Tunisia', 'تونس', 'H', '/images/Tunisia.png', 0, 0, 0, 0, 0, 0, 0),
  ('CMR', 'Cameroon', 'Cameroon', 'الكاميرون', 'H', '/images/Greece.png', 0, 0, 0, 0, 0, 0, 0),
  ('GHA', 'Ghana', 'Ghana', 'غانا', 'H', '/images/Ghana.png', 0, 0, 0, 0, 0, 0, 0),
  ('KSA', 'Saudi Arabia', 'Saudi Arabia', 'السعودية', 'I', '/images/Saudi Arabia.png', 0, 0, 0, 0, 0, 0, 0),
  ('QAT', 'Qatar', 'Qatar', 'قطر', 'I', '/images/Qatar.png', 0, 0, 0, 0, 0, 0, 0),
  ('JPN', 'Japan', 'Japan', 'اليابان', 'I', '/images/Japan.png', 0, 0, 0, 0, 0, 0, 0),
  ('KOR', 'South Korea', 'South Korea', 'كوريا الجنوبية', 'I', '/images/South Korea.png', 0, 0, 0, 0, 0, 0, 0),
  ('IRN', 'Iran', 'Iran', 'إيران', 'J', '/images/Iran.png', 0, 0, 0, 0, 0, 0, 0),
  ('AUS', 'Australia', 'Australia', 'أستراليا', 'J', '/images/DR Congo.png', 0, 0, 0, 0, 0, 0, 0),
  ('UZB', 'Uzbekistan', 'Uzbekistan', 'أوزبكستان', 'J', '/images/Côte d''Ivoire.png', 0, 0, 0, 0, 0, 0, 0),
  ('JOR', 'Jordan', 'Jordan', 'الأردن', 'J', '/images/Jordan.png', 0, 0, 0, 0, 0, 0, 0),
  ('NZL', 'New Zealand', 'New Zealand', 'نيوزيلندا', 'K', '/images/Curaçao.png', 0, 0, 0, 0, 0, 0, 0),
  ('NOR', 'Norway', 'Norway', 'النرويج', 'K', '/images/Norway.png', 0, 0, 0, 0, 0, 0, 0),
  ('SWE', 'Sweden', 'Sweden', 'السويد', 'K', '/images/Sweden.png', 0, 0, 0, 0, 0, 0, 0),
  ('POL', 'Poland', 'Poland', 'بولندا', 'K', '/images/Poland.png', 0, 0, 0, 0, 0, 0, 0),
  ('TUR', 'Turkey', 'Turkey', 'تركيا', 'L', '/images/Türkiye.png', 0, 0, 0, 0, 0, 0, 0),
  ('SCO', 'Scotland', 'Scotland', 'اسكتلندا', 'L', '/images/Scotland.png', 0, 0, 0, 0, 0, 0, 0),
  ('WAL', 'Wales', 'Wales', 'ويلز', 'L', '/images/Wales.png', 0, 0, 0, 0, 0, 0, 0),
  ('UKR', 'Ukraine', 'Ukraine', 'أوكرانيا', 'L', '/images/Cape Verde.png', 0, 0, 0, 0, 0, 0, 0)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. OPTIONAL: auto-sync team stats when match results change.
--    Keeps teams.matches_played / wins / ... / points in sync with the
--    `matches` table (only counting status = 'finished'), so you never update
--    them by hand. The app also computes standings live, so this mainly helps
--    the admin UI and exports.
-- -----------------------------------------------------------------------------
create or replace function public.refresh_team_stats()
returns void
language sql
as $$
  with results as (
    select
      u.team_id,
      count(*)                                   as mp,
      count(*) filter (where u.win)              as w,
      count(*) filter (where u.draw)             as d,
      count(*) filter (where u.lose)             as l,
      coalesce(sum(u.gf), 0)                     as gf,
      coalesce(sum(u.ga), 0)                     as ga
    from (
      select m.home_team_id as team_id, m.home_score as gf, m.away_score as ga,
             (m.home_score > m.away_score) as win,
             (m.home_score < m.away_score) as lose,
             (m.home_score = m.away_score) as draw
      from public.matches m
      where m.status = 'finished'
      union all
      select m.away_team_id as team_id, m.away_score as gf, m.home_score as ga,
             (m.away_score > m.home_score) as win,
             (m.away_score < m.home_score) as lose,
             (m.away_score = m.home_score) as draw
      from public.matches m
      where m.status = 'finished'
    ) u
    group by u.team_id
  )
  update public.teams t
  set matches_played = coalesce(r.mp, 0),
      wins          = coalesce(r.w, 0),
      draws         = coalesce(r.d, 0),
      losses        = coalesce(r.l, 0),
      goals_for     = coalesce(r.gf, 0),
      goals_against = coalesce(r.ga, 0),
      points        = 3 * coalesce(r.w, 0) + coalesce(r.d, 0)
  from results r
  where r.team_id = t.id;
$$;

create or replace function public.touch_matches()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_team_stats();
  return null;
end;
$$;

DROP TRIGGER IF EXISTS matches_stats_sync ON public.matches;
CREATE TRIGGER matches_stats_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.matches
  FOR EACH STATEMENT EXECUTE FUNCTION public.touch_matches();

-- Tip: reset stale stats (if any were entered before the trigger existed) with:
--   select public.refresh_team_stats();

-- =============================================================================
-- ECUP01 — Supabase schema + Row Level Security
-- Paste the whole file into Supabase SQL Editor and press RUN.
-- Fully idempotent: safe to run again and again.
--
-- TOURNAMENT LOGIC
--   48 teams · 12 groups · 4 teams per group
--   Group stage: 1st + 2nd of every group qualify (24) plus the best 8
--   third-placed teams (8) => 32 teams in the Round of 32.
--
-- DESIGN PRINCIPLES
--   * Supabase is the single source of truth. Team names, scores, winners,
--     standings, third-place ranking and the knockout bracket are ALL stored /
--     calculated in PostgreSQL, never hardcoded in the frontend.
--   * group_standings starts from `teams` and LEFT JOINs finished group
--     matches, so every team appears from day one (0 0 0 0 0 0 0 0).
--   * third_place_standings derives each group's 3rd place automatically and
--     shows N/D until that group's group stage is finished.
--   * Round of 32 is ONLY populated once all 72 group matches are finished
--     (no premature qualification). The bracket matches themselves exist from
--     the start; their team slots are NULL (shown as N/D) until qualified.
--   * Knockout winners are stored in winner_team_id (handles penalty
--     shoot-outs where the score is a draw). Results propagate automatically
--     to the next round.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. MIGRATION GUARD (legacy single-table schema from earlier versions)
--    The old schema had `teams` (text id, group_letter, hand-edited stats) and
--    `matches` (text id, group_letter). Those tables only contain the seeded
--    48 teams and no user results yet. If the old schema is detected AND no
--    finished matches exist, the old tables are dropped and re-created below.
--    If finished matches exist, the script aborts so you can export data first.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'teams'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teams' and column_name = 'group_id'
  ) then
    raise notice 'Dropping legacy public.teams (old schema, seed data only) — will be re-seeded.';
    drop table if exists public.teams cascade;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'matches'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'matches' and column_name = 'next_match_id'
  ) then
    if exists (select 1 from public.matches where status = 'finished') then
      raise exception 'Legacy public.matches contains finished results. Export them before re-running this script.';
    end if;
    raise notice 'Dropping legacy public.matches (old schema, no finished results).';
    drop table if exists public.matches cascade;
  end if;
end
$$;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------------------------------

create table if not exists public.tournaments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  status     text not null default 'active' check (status in ('active', 'finished')),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.tournaments (id) on delete cascade,
  name           text not null,                    -- 'A' .. 'L'
  display_order  int  not null default 0,
  created_at     timestamptz not null default now(),
  unique (tournament_id, name),
  unique (tournament_id, display_order)
);

-- `id` is the short code (e.g. 'MEX'). `en` / `ar` are the bilingual names the
-- UI renders via teamName(team, lang). `logo_url` stores the LOCAL path, e.g.
-- '/images/Morocco.png', served from public/images/. Stats are NOT stored:
-- they are calculated by the group_standings view from finished matches.
create table if not exists public.teams (
  id            text primary key,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  group_id      uuid references public.groups (id) on delete set null,
  name          text not null,                     -- English name
  short_name    text not null,                     -- code, e.g. 'MEX'
  en            text not null default '',
  ar            text not null default '',
  logo_url      text,
  created_at    timestamptz not null default now(),
  unique (tournament_id, id)
);

-- `stage`:        'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
-- `status`:       'scheduled' | 'live' | 'finished'
-- `winner_team_id`: the team that advances from a FINISHED knockout match.
--                  Required for penalty shoot-outs (draw score). If NULL on a
--                  decisive score the auto-winner trigger fills it.
-- `next_match_id`: for knockout matches, the match the winner should be
--                  written into (NULL for group matches and the final).
-- `next_match_slot`: 'home' | 'away' — which side of that next match receives
--                  the winner. NULL for group matches / final.
-- Scores are NULL until entered — the UI shows "—" for NULL scores
-- and "0 - 0" for a real 0-0 result.
create table if not exists public.matches (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references public.tournaments (id) on delete cascade,
  stage           text not null,
  group_id        uuid references public.groups (id) on delete set null,
  home_team_id    text references public.teams (id) on delete set null,
  away_team_id    text references public.teams (id) on delete set null,
  home_score      int,
  away_score      int,
  winner_team_id  text references public.teams (id) on delete set null,
  status          text not null default 'scheduled',
  match_date      timestamptz,
  match_order     int  not null default 0,
  next_match_id   uuid references public.matches (id) on delete set null,
  next_match_slot text check (next_match_slot in ('home', 'away')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint matches_stage_check  check (stage in ('group', 'r32', 'r16', 'qf', 'sf', 'final')),
  constraint matches_status_check check (status in ('scheduled', 'live', 'finished')),
  constraint matches_same_team_check check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id),
  constraint matches_score_pair_check check ((home_score is null and away_score is null) or (home_score is not null and away_score is not null)),
  constraint matches_winner_check check (winner_team_id is null or winner_team_id = home_team_id or winner_team_id = away_team_id)
);

-- Upgrade path for databases created before winner_team_id existed.
alter table public.matches add column if not exists winner_team_id text references public.teams (id) on delete set null;
alter table public.matches drop constraint if exists matches_winner_check;
alter table public.matches add constraint matches_winner_check check (winner_team_id is null or winner_team_id = home_team_id or winner_team_id = away_team_id);

-- -----------------------------------------------------------------------------
-- 2. INDEXES
-- -----------------------------------------------------------------------------
create index if not exists groups_tournament_idx  on public.groups (tournament_id);
create index if not exists teams_tournament_idx   on public.teams (tournament_id);
create index if not exists teams_group_idx        on public.teams (group_id);
create index if not exists matches_tournament_idx on public.matches (tournament_id);
create index if not exists matches_stage_idx      on public.matches (stage);
create index if not exists matches_group_idx      on public.matches (group_id);
create index if not exists matches_home_team_idx  on public.matches (home_team_id);
create index if not exists matches_away_team_idx  on public.matches (away_team_id);
create index if not exists matches_next_match_idx on public.matches (next_match_id);

-- -----------------------------------------------------------------------------
-- 3. GROUP STANDINGS VIEW (single source of truth — no stored stats)
--    IMPORTANT: starts from `teams` and LEFT JOINs the aggregated finished
--    group matches. Every team in every group appears from day one with
--    zeroes; only status = 'finished' group matches affect the numbers.
--    Ranking: points desc -> goal difference desc -> goals for desc -> wins desc.
--    NOTE: created with `create or replace` (no DROP) so the Round of 32
--    function and the third-place view that depend on it keep working when the
--    script is re-run. Columns are identical to the previous version.
-- -----------------------------------------------------------------------------
create or replace view public.group_standings
with (security_invoker = true)
as
with results as (
  select
    m.group_id,
    u.team_id,
    u.gf,
    u.ga,
    u.win,
    u.draw,
    u.lose
  from public.matches m
  cross join lateral (
    values
      (m.home_team_id, m.home_score, m.away_score,
       (m.home_score > m.away_score), (m.home_score = m.away_score), (m.home_score < m.away_score)),
      (m.away_team_id, m.away_score, m.home_score,
       (m.away_score > m.home_score), (m.away_score = m.home_score), (m.away_score < m.home_score))
  ) as u(team_id, gf, ga, win, draw, lose)
  where m.stage = 'group'
    and m.status = 'finished'
    and m.home_team_id is not null
    and m.away_team_id is not null
),
agg as (
  select
    r.group_id,
    r.team_id,
    count(*)                                      as played,
    count(*) filter (where r.win)                 as wins,
    count(*) filter (where r.draw)                as draws,
    count(*) filter (where r.lose)                as losses,
    coalesce(sum(r.gf), 0)                        as goals_for,
    coalesce(sum(r.ga), 0)                        as goals_against,
    coalesce(sum(r.gf) - sum(r.ga), 0)            as goal_difference,
    3 * count(*) filter (where r.win)
      + count(*) filter (where r.draw)            as points
  from results r
  group by r.group_id, r.team_id
)
select
  t.group_id,
  g.name                                        as group_name,
  t.id                                          as team_id,
  coalesce(a.played, 0)                         as played,
  coalesce(a.wins, 0)                           as wins,
  coalesce(a.draws, 0)                          as draws,
  coalesce(a.losses, 0)                         as losses,
  coalesce(a.goals_for, 0)                      as goals_for,
  coalesce(a.goals_against, 0)                  as goals_against,
  coalesce(a.goal_difference, 0)                as goal_difference,
  coalesce(a.points, 0)                         as points,
  row_number() over (
    partition by t.group_id
    order by
      coalesce(a.points, 0) desc,
      coalesce(a.goal_difference, 0) desc,
      coalesce(a.goals_for, 0) desc,
      coalesce(a.wins, 0) desc,
      t.id
  )                                             as position
from public.teams t
join public.groups g on g.id = t.group_id
left join agg a on a.group_id = t.group_id and a.team_id = t.id;

grant select on public.group_standings to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. THIRD-PLACE STANDINGS VIEW
--    Exactly 12 rows (one per group). Each group's position-3 team is taken
--    from group_standings but is only "determined" once all 6 group matches
--    of that group are finished (otherwise team_id is NULL -> UI shows N/D).
--    Ranking of the 12 across groups: points -> GD -> GF -> wins. Positions
--    1-8 are qualified, 9-12 are not.
-- -----------------------------------------------------------------------------
drop view if exists public.third_place_standings;
create or replace view public.third_place_standings
with (security_invoker = true)
as
with group_finished as (
  select
    g.id as group_id,
    coalesce(bool_and(m.id is null or m.status = 'finished'), false) as complete
  from public.groups g
  left join public.matches m on m.group_id = g.id and m.stage = 'group'
  group by g.id
),
third as (
  select
    s.group_id,
    s.team_id,
    s.played,
    s.wins,
    s.draws,
    s.losses,
    s.goals_for,
    s.goals_against,
    s.goal_difference,
    s.points
  from public.group_standings s
  where s.position = 3
),
ranked as (
  select
    t.group_id,
    g.tournament_id,
    g.name                                            as group_name,
    case when gf.complete then t.team_id else null end as team_id,
    case when gf.complete then t.played  else null end as played,
    case when gf.complete then t.wins    else null end as wins,
    case when gf.complete then t.draws   else null end as draws,
    case when gf.complete then t.losses  else null end as losses,
    case when gf.complete then t.goals_for else null end as goals_for,
    case when gf.complete then t.goals_against else null end as goals_against,
    case when gf.complete then t.goal_difference else null end as goal_difference,
    case when gf.complete then t.points  else null end as points,
    (gf.complete)                                       as determined,
    row_number() over (
      order by
        case when gf.complete then 0 else 1 end,
        t.points desc,
        t.goal_difference desc,
        t.goals_for desc,
        t.wins desc,
        g.name
    )                                                   as position
  from third t
  join public.groups g on g.id = t.group_id
  join group_finished gf on gf.group_id = t.group_id
)
select
  group_id,
  tournament_id,
  group_name,
  team_id,
  played,
  wins,
  draws,
  losses,
  goals_for,
  goals_against,
  goal_difference,
  points,
  determined,
  position,
  (position <= 8) as qualified
from ranked
order by position;

grant select on public.third_place_standings to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. KNOCKOUT FUNCTIONS & TRIGGERS
-- -----------------------------------------------------------------------------

-- Fill Round of 32 slots from the FINAL group standings (top 2 per group +
-- best 8 third-placed teams). Runs only when the group stage is complete.
--
--   * Group stage NOT finished -> qualification is not final: the knockout
--     bracket is reset to N/D (team slots NULL), results are never touched.
--   * Group stage finished -> 12 winners + 12 runners-up + 8 best thirds fill
--     the 32 slots. Safe to run repeatedly: finished matches are never
--     overwritten and no matches are created/deleted.
--
-- Slot pattern (r32 match_order 1..16):
--   W1..W8 vs T1..T8  |  W9..W12 vs R1..R4  |  R5vR6, R7vR8, R9vR10, R11vR12
create or replace function public.populate_round_of_32(p_tid uuid)
returns void
language plpgsql
as $$
declare
  v_w     text[];
  v_r     text[];
  v_t     text[];
  v_slots text[];
  v_i     int;
  v_rec   record;
begin
  -- Qualification is only allowed once EVERY group match is finished.
  if exists (
    select 1
    from public.matches m
    join public.groups g on g.id = m.group_id
    where m.stage = 'group'
      and g.tournament_id = p_tid
      and m.status <> 'finished'
  ) then
    -- Reset the bracket to N/D. Finished matches are never touched.
    update public.matches
    set home_team_id = null,
        away_team_id = null
    where tournament_id = p_tid
      and stage <> 'group'
      and status <> 'finished';
    return;
  end if;

  -- Winners (position 1) and runners-up (position 2) per group, in group order.
  select array_agg(s.team_id order by g.display_order)
    into v_w
  from public.groups g
  left join public.group_standings s on s.group_id = g.id and s.position = 1
  where g.tournament_id = p_tid;

  select array_agg(s.team_id order by g.display_order)
    into v_r
  from public.groups g
  left join public.group_standings s on s.group_id = g.id and s.position = 2
  where g.tournament_id = p_tid;

  -- Best 8 third-placed teams (globally ranked by the tournament rules).
  select array_agg(s.team_id order by s.points desc, s.goal_difference desc, s.goals_for desc, s.wins desc, s.group_name)
    into v_t
  from public.group_standings s
  where s.position = 3
    and s.group_id in (select id from public.groups where tournament_id = p_tid);

  v_slots := array[]::text[];
  for v_i in 1..8 loop
    v_slots := v_slots || v_w[v_i] || v_t[v_i];
  end loop;
  for v_i in 9..12 loop
    v_slots := v_slots || v_w[v_i] || v_r[v_i - 8];
  end loop;
  for v_i in 5..12 loop
    v_slots := v_slots || v_r[v_i];
  end loop;

  for v_rec in
    select id, match_order
    from public.matches
    where stage = 'r32' and tournament_id = p_tid
    order by match_order
  loop
    update public.matches
    set home_team_id = coalesce(v_slots[2 * v_rec.match_order - 1], home_team_id),
        away_team_id = coalesce(v_slots[2 * v_rec.match_order],     away_team_id)
    where id = v_rec.id
      and status <> 'finished';
  end loop;
end;
$$;

-- Propagate winners of finished knockout matches into the next match slot.
-- winner_team_id is authoritative (covers penalty shoot-outs with a draw
-- score); if it is NULL the decisive score decides. Loops (max 4 passes) so
-- bulk-entered results cascade r32 -> ... -> final.
create or replace function public.propagate_knockout_winner(p_tid uuid)
returns void
language plpgsql
as $$
declare
  rec      record;
  v_winner text;
  v_done   boolean;
  v_pass   int;
begin
  for v_pass in 1..4 loop
    v_done := false;
    for rec in
      select m.id, m.next_match_id, m.next_match_slot,
             m.home_team_id, m.away_team_id,
             m.home_score, m.away_score,
             m.winner_team_id
      from public.matches m
      where m.tournament_id = p_tid
        and m.stage <> 'group'
        and m.status = 'finished'
        and m.next_match_id is not null
    loop
      v_winner := rec.winner_team_id;
      if v_winner is null then
        if rec.home_score > rec.away_score then
          v_winner := rec.home_team_id;
        elsif rec.away_score > rec.home_score then
          v_winner := rec.away_team_id;
        end if;
      end if;

      if v_winner is not null then
        update public.matches
        set home_team_id = case when rec.next_match_slot = 'home' then v_winner else home_team_id end,
            away_team_id = case when rec.next_match_slot = 'away' then v_winner else away_team_id end
        where id = rec.next_match_id
          and status <> 'finished';
        if found then
          v_done := true;
        end if;
      end if;
    end loop;
    if not v_done then
      exit;
    end if;
  end loop;
end;
$$;

-- Auto-fill winner_team_id for knockout matches finished with a decisive
-- score (home != away). Penalty shoot-out draws (1-1 etc.) keep winner_team_id
-- NULL so the admin can set the advancing team manually. Existing winners are
-- never overwritten unless the row is only just being marked finished.
create or replace function public.matches_auto_winner()
returns trigger
language plpgsql
as $$
begin
  if new.stage <> 'group'
     and new.status = 'finished'
     and (TG_OP = 'INSERT' or old.status is distinct from new.status or new.winner_team_id is null)
     and new.home_team_id is not null
     and new.away_team_id is not null
     and new.home_score is not null
     and new.away_score is not null
     and new.home_score <> new.away_score then
    new.winner_team_id := case when new.home_score > new.away_score then new.home_team_id else new.away_team_id end;
  end if;
  return new;
end;
$$;

drop trigger if exists matches_auto_winner_trg on public.matches;
create trigger matches_auto_winner_trg
  before insert or update on public.matches
  for each row execute function public.matches_auto_winner();

-- Central sync trigger: after any matches change, refresh r32 slots and cascade
-- winners. Uses a transaction-local flag to prevent recursive trigger loops.
create or replace function public.matches_sync()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.sync_running', true), '') = '1' then
    return coalesce(new, old);
  end if;

  perform set_config('app.sync_running', '1', true);
  begin
    perform public.populate_round_of_32(coalesce(new.tournament_id, old.tournament_id));
    perform public.propagate_knockout_winner(coalesce(new.tournament_id, old.tournament_id));
    perform set_config('app.sync_running', '0', true);
  exception when others then
    perform set_config('app.sync_running', '0', true);
    raise;
  end;

  return coalesce(new, old);
end;
$$;

drop trigger if exists matches_sync_trg on public.matches;
create trigger matches_sync_trg
  after insert or update or delete on public.matches
  for each row execute function public.matches_sync();

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists matches_updated_at_trg on public.matches;
create trigger matches_updated_at_trg
  before update on public.matches
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.tournaments enable row level security;
alter table public.groups       enable row level security;
alter table public.teams        enable row level security;
alter table public.matches      enable row level security;

-- Admin detection: a user is an admin when their JWT app_metadata.role is
-- 'admin'. Mark an account with:
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

-- Public read access for everyone.
drop policy if exists "tournaments public read" on public.tournaments;
create policy "tournaments public read" on public.tournaments
  for select to public using (true);

drop policy if exists "groups public read" on public.groups;
create policy "groups public read" on public.groups
  for select to public using (true);

drop policy if exists "teams public read" on public.teams;
create policy "teams public read" on public.teams
  for select to public using (true);

drop policy if exists "matches public read" on public.matches;
create policy "matches public read" on public.matches
  for select to public using (true);

-- Write access restricted to authenticated admins.
drop policy if exists "tournaments admin write" on public.tournaments;
create policy "tournaments admin write" on public.tournaments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "groups admin write" on public.groups;
create policy "groups admin write" on public.groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "teams admin write" on public.teams;
create policy "teams admin write" on public.teams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "matches admin write" on public.matches;
create policy "matches admin write" on public.matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. REALTIME
--    Matches rows are published to supabase_realtime. The frontend listens to
--    the `matches` table and, on any change, re-reads the views (standings,
--    third places, knockout) so every page refreshes when a score/status is
--    edited in Supabase. Views are recalculated live so no extra publication
--    is needed.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 8. SEED (idempotent — safe to re-run)
--    Tournament + 12 groups + 48 teams, 72 scheduled group matches (no scores),
--    and the full 31-match knockout bracket linked via next_match_id.
-- -----------------------------------------------------------------------------

insert into public.tournaments (id, name, status) values
  ('00000000-0000-0000-0000-000000000001', 'EFFOTBALE World Cup 2026', 'active')
on conflict (id) do nothing;

insert into public.groups (id, tournament_id, name, display_order) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', 'A', 1),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000001', 'B', 2),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000001', 'C', 3),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000001', 'D', 4),
  ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000001', 'E', 5),
  ('00000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-000000000001', 'F', 6),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'G', 7),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'H', 8),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'I', 9),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'J', 10),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'K', 11),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'L', 12)
on conflict (id) do nothing;

insert into public.teams (id, tournament_id, group_id, name, short_name, en, ar, logo_url)
select
  t.id,
  '00000000-0000-0000-0000-000000000001',
  g.id,
  t.name,
  t.short_name,
  t.en,
  t.ar,
  t.logo_url
from (values
  ('MEX', 'Mexico', 'MEX', 'Mexico', 'المكسيك', 'A', '/images/Mexico.png'),
  ('CAN', 'Canada', 'CAN', 'Canada', 'كندا', 'A', '/images/Canada.png'),
  ('USA', 'USA', 'USA', 'USA', 'الولايات المتحدة', 'A', '/images/USA.png'),
  ('PAN', 'Panama', 'PAN', 'Panama', 'بنما', 'A', '/images/South Africa.png'),
  ('ARG', 'Argentina', 'ARG', 'Argentina', 'الأرجنتين', 'B', '/images/Argentina.png'),
  ('BRA', 'Brazil', 'BRA', 'Brazil', 'البرازيل', 'B', '/images/Brazil.png'),
  ('URU', 'Uruguay', 'URU', 'Uruguay', 'أوروغواي', 'B', '/images/Uruguay.png'),
  ('COL', 'Colombia', 'COL', 'Colombia', 'كولومبيا', 'B', '/images/Colombia.png'),
  ('ECU', 'Ecuador', 'ECU', 'Ecuador', 'الإكوادور', 'C', '/images/Ecuador.webp'),
  ('PAR', 'Paraguay', 'PAR', 'Paraguay', 'باراغواي', 'C', '/images/Paraguay.png'),
  ('PER', 'Peru', 'PER', 'Peru', 'بيرو', 'C', '/images/Serbia.png'),
  ('CHI', 'Chile', 'CHI', 'Chile', 'تشيلي', 'C', '/images/Russia.png'),
  ('FRA', 'France', 'FRA', 'France', 'فرنسا', 'D', '/images/France.png'),
  ('ESP', 'Spain', 'ESP', 'Spain', 'إسبانيا', 'D', '/images/Spain.png'),
  ('GER', 'Germany', 'GER', 'Germany', 'ألمانيا', 'D', '/images/Germany.png'),
  ('POR', 'Portugal', 'POR', 'Portugal', 'البرتغال', 'D', '/images/Portugal.png'),
  ('ENG', 'England', 'ENG', 'England', 'إنجلترا', 'E', '/images/England.png'),
  ('NED', 'Netherlands', 'NED', 'Netherlands', 'هولندا', 'E', '/images/Netherlands.png'),
  ('BEL', 'Belgium', 'BEL', 'Belgium', 'بلجيكا', 'E', '/images/Belgium.png'),
  ('ITA', 'Italy', 'ITA', 'Italy', 'إيطاليا', 'E', '/images/Italy.png'),
  ('CRO', 'Croatia', 'CRO', 'Croatia', 'كرواتيا', 'F', '/images/Croatia.png'),
  ('SUI', 'Switzerland', 'SUI', 'Switzerland', 'سويسرا', 'F', '/images/Switzerland.png'),
  ('AUT', 'Austria', 'AUT', 'Austria', 'النمسا', 'F', '/images/Austria.png'),
  ('DEN', 'Denmark', 'DEN', 'Denmark', 'الدنمارك', 'F', '/images/Denmark.png'),
  ('MAR', 'Morocco', 'MAR', 'Morocco', 'المغرب', 'G', '/images/Morocco.png'),
  ('SEN', 'Senegal', 'SEN', 'Senegal', 'السنغال', 'G', '/images/Senegal.png'),
  ('NGA', 'Nigeria', 'NGA', 'Nigeria', 'نيجيريا', 'G', '/images/Nigeria.png'),
  ('EGY', 'Egypt', 'EGY', 'Egypt', 'مصر', 'G', '/images/Egypt.png'),
  ('ALG', 'Algeria', 'ALG', 'Algeria', 'الجزائر', 'H', '/images/Algeria.png'),
  ('TUN', 'Tunisia', 'TUN', 'Tunisia', 'تونس', 'H', '/images/Tunisia.png'),
  ('CMR', 'Cameroon', 'CMR', 'Cameroon', 'الكاميرون', 'H', '/images/Greece.png'),
  ('GHA', 'Ghana', 'GHA', 'Ghana', 'غانا', 'H', '/images/Ghana.png'),
  ('KSA', 'Saudi Arabia', 'KSA', 'Saudi Arabia', 'السعودية', 'I', '/images/Saudi Arabia.png'),
  ('QAT', 'Qatar', 'QAT', 'Qatar', 'قطر', 'I', '/images/Qatar.png'),
  ('JPN', 'Japan', 'JPN', 'Japan', 'اليابان', 'I', '/images/Japan.png'),
  ('KOR', 'South Korea', 'KOR', 'South Korea', 'كوريا الجنوبية', 'I', '/images/South Korea.png'),
  ('IRN', 'Iran', 'IRN', 'Iran', 'إيران', 'J', '/images/Iran.png'),
  ('AUS', 'Australia', 'AUS', 'Australia', 'أستراليا', 'J', '/images/DR Congo.png'),
  ('UZB', 'Uzbekistan', 'UZB', 'Uzbekistan', 'أوزبكستان', 'J', '/images/Côte d''Ivoire.png'),
  ('JOR', 'Jordan', 'JOR', 'Jordan', 'الأردن', 'J', '/images/Jordan.png'),
  ('NZL', 'New Zealand', 'NZL', 'New Zealand', 'نيوزيلندا', 'K', '/images/Curaçao.png'),
  ('NOR', 'Norway', 'NOR', 'Norway', 'النرويج', 'K', '/images/Norway.png'),
  ('SWE', 'Sweden', 'SWE', 'Sweden', 'السويد', 'K', '/images/Sweden.png'),
  ('POL', 'Poland', 'POL', 'Poland', 'بولندا', 'K', '/images/Poland.png'),
  ('TUR', 'Turkey', 'TUR', 'Turkey', 'تركيا', 'L', '/images/Türkiye.png'),
  ('SCO', 'Scotland', 'SCO', 'Scotland', 'اسكتلندا', 'L', '/images/Scotland.png'),
  ('WAL', 'Wales', 'WAL', 'Wales', 'ويلز', 'L', '/images/Wales.png'),
  ('UKR', 'Ukraine', 'UKR', 'Ukraine', 'أوكرانيا', 'L', '/images/Cape Verde.png')
) as t(id, name, short_name, en, ar, grp, logo_url)
join public.groups g on g.name = t.grp
  and g.tournament_id = '00000000-0000-0000-0000-000000000001'
on conflict (id) do nothing;

-- 72 group matches (6 per group), all scheduled with no scores yet.
insert into public.matches (tournament_id, stage, group_id, home_team_id, away_team_id, status, match_order)
with ordered as (
  select
    t.id as team_id,
    g.id as gid,
    g.name as grp,
    row_number() over (partition by g.id order by t.id) - 1 as pos
  from public.teams t
  join public.groups g on g.id = t.group_id
  where g.tournament_id = '00000000-0000-0000-0000-000000000001'
),
pairings(mo, h, a) as (values (1, 0, 1), (2, 2, 3), (3, 0, 2), (4, 1, 3), (5, 0, 3), (6, 1, 2)),
grpnum as (
  select gid, row_number() over (order by grp) as gn
  from (select distinct gid, grp from ordered) x
)
select
  '00000000-0000-0000-0000-000000000001',
  'group',
  home.gid,
  home.team_id,
  away.team_id,
  'scheduled',
  (gn.gn - 1) * 6 + p.mo
from pairings p
join ordered home on home.pos = p.h
join grpnum gn on gn.gid = home.gid
join ordered away on away.pos = p.a and away.gid = home.gid
where not exists (
  select 1 from public.matches m
  where m.tournament_id = '00000000-0000-0000-0000-000000000001'
    and m.stage = 'group'
);

-- 31 knockout matches (16 r32 + 8 r16 + 4 qf + 2 sf + 1 final), teams NULL -> N/D.
insert into public.matches (tournament_id, stage, match_order, status)
select '00000000-0000-0000-0000-000000000001', s.stage, s.mo, 'scheduled'
from (values
  ('r32', 1), ('r32', 2), ('r32', 3), ('r32', 4), ('r32', 5), ('r32', 6), ('r32', 7), ('r32', 8),
  ('r32', 9), ('r32', 10), ('r32', 11), ('r32', 12), ('r32', 13), ('r32', 14), ('r32', 15), ('r32', 16),
  ('r16', 1), ('r16', 2), ('r16', 3), ('r16', 4), ('r16', 5), ('r16', 6), ('r16', 7), ('r16', 8),
  ('qf', 1), ('qf', 2), ('qf', 3), ('qf', 4),
  ('sf', 1), ('sf', 2),
  ('final', 1)
) as s(stage, mo)
where not exists (
  select 1 from public.matches m
  where m.tournament_id = '00000000-0000-0000-0000-000000000001'
    and m.stage = 'r32'
);

-- Link knockout matches: winner of match mo goes into the home/away slot of
-- ceil(mo / 2) in the NEXT round.
update public.matches m
set next_match_id = n.id,
    next_match_slot = case when m.match_order % 2 = 1 then 'home' else 'away' end
from public.matches n
where m.tournament_id = '00000000-0000-0000-0000-000000000001'
  and m.stage = 'r32' and n.stage = 'r16'
  and n.match_order = ceil(m.match_order::numeric / 2)
  and m.next_match_id is null;

update public.matches m
set next_match_id = n.id,
    next_match_slot = case when m.match_order % 2 = 1 then 'home' else 'away' end
from public.matches n
where m.tournament_id = '00000000-0000-0000-0000-000000000001'
  and m.stage = 'r16' and n.stage = 'qf'
  and n.match_order = ceil(m.match_order::numeric / 2)
  and m.next_match_id is null;

update public.matches m
set next_match_id = n.id,
    next_match_slot = case when m.match_order % 2 = 1 then 'home' else 'away' end
from public.matches n
where m.tournament_id = '00000000-0000-0000-0000-000000000001'
  and m.stage = 'qf' and n.stage = 'sf'
  and n.match_order = ceil(m.match_order::numeric / 2)
  and m.next_match_id is null;

update public.matches m
set next_match_id = n.id,
    next_match_slot = case when m.match_order % 2 = 1 then 'home' else 'away' end
from public.matches n
where m.tournament_id = '00000000-0000-0000-0000-000000000001'
  and m.stage = 'sf' and n.stage = 'final'
  and n.match_order = 1
  and m.next_match_id is null;

-- Fresh-state cleanup: if the tournament has ZERO finished matches (i.e. the
-- script is being applied to a brand new / seed-only database), make sure no
-- stale team assignments are left inside the knockout bracket (they would
-- otherwise show instead of N/D). If any result exists this is skipped so
-- legitimate progress is never deleted.
do $$
begin
  if not exists (
    select 1 from public.matches
    where tournament_id = '00000000-0000-0000-0000-000000000001'
      and status = 'finished'
  ) then
    update public.matches
    set home_team_id = null,
        away_team_id = null
    where tournament_id = '00000000-0000-0000-0000-000000000001'
      and stage <> 'group'
      and status <> 'finished';
  end if;
end
$$;

// Supabase-backed data layer — database is the single source of truth.
//
// Every function is async and returns the SAME shapes the pages already expect:
//   team objects   { id, code, group, en, ar, flag }
//   match objects  { id, stage, group, status, home, away, homeScore, awayScore,
//                    winner }  (home/away may be null -> UI shows N/D)
//   standings rows { team, pos, played, won, drawn, lost, gf, ga, gd, pts }
//
// Standings come from the `group_standings` PostgreSQL view — the frontend does
// NOT calculate them manually. Results are cached CACHE_TTL ms; clearCache() is
// called by the realtime hook whenever a matches row changes.

import { supabase } from '../lib/supabase'

const CACHE_TTL = 30_000
const TOURNAMENT_ID =
  import.meta.env.VITE_TOURNAMENT_ID || '00000000-0000-0000-0000-000000000001'

let teamsCache = { data: null, at: 0 }
let matchesCache = { data: null, at: 0 }
let groupsCache = { data: null, at: 0 }

let teamsPromise = null
let matchesPromise = null
let groupsPromise = null

export function clearCache() {
  teamsCache = { data: null, at: 0 }
  matchesCache = { data: null, at: 0 }
  groupsCache = { data: null, at: 0 }
  teamsPromise = null
  matchesPromise = null
  groupsPromise = null
}

// ---------------------------------------------------------------------------
// Raw fetchers (TTL cache + in-flight dedup via promise)
// ---------------------------------------------------------------------------

function fetchGroups(force = false) {
  const fresh = groupsCache.data && Date.now() - groupsCache.at < CACHE_TTL
  if (fresh && !force) return Promise.resolve(groupsCache.data)
  if (!groupsPromise) {
    groupsPromise = supabase
      .from('groups')
      .select('*')
      .eq('tournament_id', TOURNAMENT_ID)
      .order('display_order')
      .then(({ data, error }) => {
        if (error) throw error
        groupsCache = { data: data || [], at: Date.now() }
        return groupsCache.data
      })
      .finally(() => {
        groupsPromise = null
      })
  }
  return groupsPromise
}

async function fetchTeams(force = false) {
  const fresh = teamsCache.data && Date.now() - teamsCache.at < CACHE_TTL
  if (fresh && !force) return teamsCache.data
  if (!teamsPromise) {
    teamsPromise = (async () => {
      const [groups, { data, error }] = await Promise.all([
        fetchGroups(force),
        supabase.from('teams').select('*').eq('tournament_id', TOURNAMENT_ID).order('id'),
      ])
      if (error) throw error
      const groupById = {}
      groups.forEach((g) => {
        groupById[g.id] = g.name
      })
      teamsCache = {
        data: (data || []).map((row) => teamFromRow(row, groupById)),
        at: Date.now(),
      }
      return teamsCache.data
    })().finally(() => {
      teamsPromise = null
    })
  }
  return teamsPromise
}

async function fetchMatches(force = false) {
  const fresh = matchesCache.data && Date.now() - matchesCache.at < CACHE_TTL
  if (fresh && !force) return matchesCache.data
  if (!matchesPromise) {
    matchesPromise = (async () => {
      const [teams, groups, { data, error }] = await Promise.all([
        fetchTeams(force),
        fetchGroups(force),
        supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', TOURNAMENT_ID)
          .order('match_order'),
      ])
      if (error) throw error
      const teamsById = {}
      teams.forEach((t) => {
        teamsById[t.id] = t
      })
      const groupById = {}
      groups.forEach((g) => {
        groupById[g.id] = g.name
      })
      matchesCache = {
        data: (data || []).map((row) => matchFromRow(row, teamsById, groupById)),
        at: Date.now(),
      }
      return matchesCache.data
    })().finally(() => {
      matchesPromise = null
    })
  }
  return matchesPromise
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function teamFromRow(row, groupById) {
  return {
    id: row.id,
    code: row.id,
    group: row.group_id ? groupById[row.group_id] || null : null,
    en: row.en || row.name,
    ar: row.ar || row.name,
    flag: (row.logo_url || '').replace(/^\/images\//, ''),
  }
}

function matchFromRow(row, teamsById, groupById) {
  const home = row.home_team_id ? teamsById[row.home_team_id] || null : null
  const away = row.away_team_id ? teamsById[row.away_team_id] || null : null
  let winner = null
  if (row.winner_team_id && teamsById[row.winner_team_id]) {
    winner = teamsById[row.winner_team_id]
  } else if (
    home &&
    away &&
    typeof row.home_score === 'number' &&
    typeof row.away_score === 'number'
  ) {
    if (row.home_score > row.away_score) winner = home
    else if (row.away_score > row.home_score) winner = away
  }
  return {
    id: row.id,
    stage: row.stage,
    group: row.group_id ? groupById[row.group_id] || null : null,
    status: row.status,
    home,
    away,
    homeScore: row.home_score,
    awayScore: row.away_score,
    winner,
  }
}

// ---------------------------------------------------------------------------
// Group stage
// ---------------------------------------------------------------------------

export async function getMatchResults() {
  const matches = await fetchMatches()
  return matches.filter((m) => m.stage === 'group')
}

export async function getDraw() {
  const matches = await fetchMatches()
  const draw = {}
  matches
    .filter((m) => m.stage === 'group')
    .forEach((m) => {
      if (!m.group) return
      ;(draw[m.group] = draw[m.group] || []).push(m)
    })
  return draw
}

// ---------------------------------------------------------------------------
// Groups (drives the group selector tabs on the Standings page)
// ---------------------------------------------------------------------------

export async function getGroups() {
  const groups = await fetchGroups()
  return groups.map((g) => ({ id: g.id, name: g.name }))
}

// ---------------------------------------------------------------------------
// Standings — sourced from the group_standings SQL view (no frontend math)
// ---------------------------------------------------------------------------

export async function getStandings() {
  const [teams, { data, error }] = await Promise.all([
    fetchTeams(),
    supabase.from('group_standings').select('*').order('group_name').order('position'),
  ])
  if (error) throw error

  const teamById = {}
  teams.forEach((t) => {
    teamById[t.id] = t
  })

  const byGroup = {}
  ;(data || []).forEach((row) => {
    if (!teamById[row.team_id]) return
    const item = {
      team: teamById[row.team_id],
      pos: row.position,
      played: row.played,
      won: row.wins,
      drawn: row.draws,
      lost: row.losses,
      gf: row.goals_for,
      ga: row.goals_against,
      gd: row.goal_difference,
      pts: row.points,
    }
    ;(byGroup[row.group_name] = byGroup[row.group_name] || []).push(item)
  })

  const groups = await getGroups()
  return groups.map((g) => ({ group: g.name, rows: byGroup[g.name] || [] }))
}

export async function getThirdPlaceStandings() {
  const [teams, { data, error }] = await Promise.all([
    fetchTeams(),
    supabase
      .from('third_place_standings')
      .select('*')
      .eq('tournament_id', TOURNAMENT_ID)
      .order('position'),
  ])
  if (error) throw error

  const teamById = {}
  teams.forEach((t) => {
    teamById[t.id] = t
  })

  return (data || []).map((row) => ({
    team: row.team_id ? teamById[row.team_id] || null : null,
    group: row.group_name,
    pos: row.position,
    qualified: row.qualified,
    determined: row.determined,
    played: row.played,
    won: row.wins,
    drawn: row.draws,
    lost: row.losses,
    gf: row.goals_for,
    ga: row.goals_against,
    gd: row.goal_difference,
    pts: row.points,
  }))
}

// ---------------------------------------------------------------------------
// Knockout
// ---------------------------------------------------------------------------

const KO_STAGES = ['r32', 'r16', 'qf', 'sf', 'final']

export async function getKnockoutData() {
  const matches = await fetchMatches()
  const ko = {}
  KO_STAGES.forEach((stage) => {
    ko[stage] = matches.filter((m) => m.stage === stage)
  })
  return ko
}

export async function computeKnockoutProgression() {
  return getKnockoutData()
}

export async function getQualifiedTeams() {
  const [groupStandings, thirdPlaceRows] = await Promise.all([
    (async () => {
      const { data, error } = await supabase
        .from('group_standings')
        .select('team_id, position')
      if (error) throw error
      const teams = []
      ;(data || []).forEach((r) => {
        if (r.position === 1) teams.push({ id: r.team_id, rank: 1 })
        else if (r.position === 2) teams.push({ id: r.team_id, rank: 2 })
      })
      return teams
    })(),
    getThirdPlaceStandings(),
  ])

  const qualified = groupStandings.concat(
    thirdPlaceRows
      .filter((r) => r.team && r.qualified)
      .map((r) => ({ id: r.team.id, rank: 3 })),
  )
  const unique = [...new Map(qualified.map((t) => [t.id, t])).values()]
  return { totalQualified: unique.length, teams: unique }
}

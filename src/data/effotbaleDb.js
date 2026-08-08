// Supabase-backed data layer.
// Every function is async and returns the SAME shapes the pages already expect
// (team objects with { id, code, group, en, ar, flag }, match objects with
// { id, group, stage, status, home, away, homeScore, awayScore, winner }, and
// standings rows with { team, pos, played, won, drawn, lost, gf, ga, gd, pts }).
//
// Results are cached for CACHE_TTL ms so repeated calls (the Home page polls
// every 5s) don't hammer Supabase — teams/matches refresh at most every 30s.

import { supabase } from '../lib/supabase'

const CACHE_TTL = 30_000

let teamsCache = { data: null, at: 0 }
let matchesCache = { data: null, at: 0 }

export function clearCache() {
  teamsCache = { data: null, at: 0 }
  matchesCache = { data: null, at: 0 }
}

async function fetchTeams(force = false) {
  const fresh = teamsCache.data && Date.now() - teamsCache.at < CACHE_TTL
  if (fresh && !force) return teamsCache.data
  const { data, error } = await supabase.from('teams').select('*').order('id')
  if (error) throw error
  teamsCache = {
    data: (data || []).map(teamFromRow),
    at: Date.now(),
  }
  return teamsCache.data
}

async function fetchMatches(force = false) {
  const fresh = matchesCache.data && Date.now() - matchesCache.at < CACHE_TTL
  if (fresh && !force) return matchesCache.data

  const teams = await fetchTeams(force)
  const teamsById = {}
  teams.forEach((t) => {
    teamsById[t.id] = t
  })

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { nullsFirst: false })
    .order('id')

  if (error) throw error

  matchesCache = {
    data: (data || []).map((row) => matchFromRow(row, teamsById)),
    at: Date.now(),
  }
  return matchesCache.data
}

function teamFromRow(row) {
  return {
    id: row.id,
    code: row.id,
    group: row.group_letter,
    en: row.en || row.name,
    ar: row.ar || row.name,
    flag: (row.logo_url || '').replace(/^\/images\//, ''),
  }
}

function matchFromRow(row, teamsById) {
  const home = teamsById[row.home_team_id] || null
  const away = teamsById[row.away_team_id] || null
  let winner = null
  if (home && away && typeof row.home_score === 'number' && typeof row.away_score === 'number') {
    if (row.home_score > row.away_score) winner = home
    else if (row.away_score > row.home_score) winner = away
  }
  return {
    id: row.id,
    group: row.group_letter,
    stage: row.stage,
    status: row.status,
    home,
    away,
    homeScore: row.home_score,
    awayScore: row.away_score,
    winner,
  }
}

// ---------------------------------------------------------------------------
// Group-stage helpers
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
// Standings (computed live from finished group matches — no manual updates)
// ---------------------------------------------------------------------------

function standingsFor(letter, groupTeams, groupMatches) {
  const map = {}
  groupTeams.forEach((team) => {
    map[team.id] = { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 }
  })

  groupMatches.forEach((m) => {
    const h = map[m.home.id]
    const a = map[m.away.id]
    if (!h || !a) return
    const hs = m.homeScore ?? 0
    const as = m.awayScore ?? 0
    h.played += 1
    a.played += 1
    h.gf += hs
    h.ga += as
    a.gf += as
    a.ga += hs
    if (hs > as) {
      h.won += 1
      h.pts += 3
      a.lost += 1
    } else if (hs < as) {
      a.won += 1
      a.pts += 3
      h.lost += 1
    } else {
      h.drawn += 1
      a.drawn += 1
      h.pts += 1
      a.pts += 1
    }
  })

  const rows = Object.values(map).map((r) => ({ ...r, gd: r.gf - r.ga }))
  rows.sort(
    (x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.team.id.localeCompare(y.team.id),
  )
  rows.forEach((r, i) => {
    r.pos = i + 1
  })
  return rows
}

export async function getStandings() {
  const [teams, matches] = await Promise.all([fetchTeams(), fetchMatches()])
  const groupMatches = matches.filter((m) => m.stage === 'group')
  const letters = [...new Set(teams.map((t) => t.group).filter(Boolean))].sort()

  return letters.map((letter) => {
    const groupTeams = teams.filter((t) => t.group === letter)
    const gm = groupMatches.filter((m) => m.group === letter)
    return { group: letter, rows: standingsFor(letter, groupTeams, gm) }
  })
}

export async function getThirdPlaceStandings() {
  const groups = await getStandings()
  const rows = groups
    .map((sg) => ({ ...sg.rows[2], group: sg.group }))
    .filter((r) => r.team)
  rows.sort(
    (a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.id.localeCompare(b.team.id),
  )
  rows.forEach((r, i) => {
    r.pos = i + 1
  })
  return rows
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
  const groups = await getStandings()
  const thirds = await getThirdPlaceStandings()
  const qualified = groups
    .flatMap((sg) => sg.rows.filter((r) => r.pos <= 2).map((r) => r.team))
    .concat(thirds.slice(0, 8).map((r) => r.team))
  const unique = [...new Map(qualified.map((t) => [t.id, t])).values()]
  return { totalQualified: unique.length, teams: unique }
}

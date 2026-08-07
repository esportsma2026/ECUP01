// Mock database — replace these functions with Supabase queries later.
// They mirror the old EffotbaleDB API so the home page counters stay wired.

import { teams, GROUP_LETTERS } from './teams'

const PAIRINGS = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
]

function groupTeams(letter) {
  return teams.filter((t) => t.group === letter)
}

function buildGroupMatches() {
  const all = []
  GROUP_LETTERS.forEach((letter, gi) => {
    const g = groupTeams(letter)
    PAIRINGS.forEach(([h, a], mi) => {
      all.push({
        id: `g-${letter}-${mi}`,
        group: letter,
        home: g[h],
        away: g[a],
        homeScore: (gi * 7 + mi * 3 + 1) % 4,
        awayScore: (gi * 11 + mi * 5 + 2) % 3,
        status: 'finished',
      })
    })
  })
  return all
}

export function getMatchResults() {
  return buildGroupMatches()
}

export function getDraw() {
  const draw = {}
  GROUP_LETTERS.forEach((letter) => {
    draw[letter] = buildGroupMatches().filter((m) => m.group === letter)
  })
  return draw
}

function standingsFor(letter) {
  const map = {}
  groupTeams(letter).forEach((team) => {
    map[team.id] = {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      pts: 0,
    }
  })

  buildGroupMatches()
    .filter((m) => m.group === letter)
    .forEach((m) => {
      const h = map[m.home.id]
      const a = map[m.away.id]
      h.played += 1
      a.played += 1
      h.gf += m.homeScore
      h.ga += m.awayScore
      a.gf += m.awayScore
      a.ga += m.homeScore
      if (m.homeScore > m.awayScore) {
        h.won += 1
        h.pts += 3
        a.lost += 1
      } else if (m.homeScore < m.awayScore) {
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

export function getStandings() {
  return GROUP_LETTERS.map((letter) => ({ group: letter, rows: standingsFor(letter) }))
}

export function getThirdPlaceStandings() {
  const rows = getStandings().map((sg) => ({ ...sg.rows[2], group: sg.group }))
  rows.sort(
    (a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.id.localeCompare(b.team.id),
  )
  rows.forEach((r, i) => {
    r.pos = i + 1
  })
  return rows
}

function goals(seed) {
  return (seed * 17 + 5) % 5
}

function playMatch(home, away, seed) {
  let h = goals(seed)
  let a = goals(seed + 7)
  if (h === a) h += 1
  const winner = h > a ? home : away
  return { home, away, homeScore: h, awayScore: a, winner, status: 'finished' }
}

export function getKnockoutData() {
  const standings = getStandings()
  const winners = standings.map((sg) => sg.rows[0].team)
  const runners = standings.map((sg) => sg.rows[1].team)
  const thirds = getThirdPlaceStandings()
    .slice(0, 8)
    .map((r) => r.team)

  const slots = []
  for (let i = 0; i < 8; i++) slots.push(winners[i], thirds[i])
  for (let i = 8; i < 12; i++) slots.push(winners[i], runners[i - 8])
  for (let i = 4; i < 12; i++) slots.push(runners[i])

  const order = ['r32', 'r16', 'qf', 'sf', 'final']
  const counts = [16, 8, 4, 2, 1]
  const ko = {}
  let current = slots
  let seed = 1
  order.forEach((key, ri) => {
    const n = counts[ri]
    const matches = []
    for (let k = 0; k < n; k++) {
      matches.push(playMatch(current[2 * k], current[2 * k + 1], seed))
      seed += 1
    }
    ko[key] = matches
    current = matches.map((m) => m.winner)
  })
  return ko
}

export function computeKnockoutProgression() {
  return getKnockoutData()
}

export function getQualifiedTeams() {
  return { totalQualified: 32 }
}

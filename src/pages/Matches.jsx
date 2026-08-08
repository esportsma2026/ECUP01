import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { teamName } from '../data/teams'
import * as db from '../data/effotbaleDb'
import TeamBadge from '../components/TeamBadge'
import { useMatchesRealtime } from '../hooks/useMatchesRealtime'

const KO_ORDER = ['r32', 'r16', 'qf', 'sf', 'final']

function TeamSide({ team, win, lang }) {
  const nd = !team
  return (
    <div className={`match-team ${win ? 'win' : ''}`}>
      {nd ? (
        <span className="team-badge nd-badge" aria-hidden="true">
          ?
        </span>
      ) : (
        <TeamBadge team={team} />
      )}
      <span className="match-team-name">{nd ? 'N/D' : teamName(team, lang)}</span>
    </div>
  )
}

function MatchRow({ match, isFinal }) {
  const { t, lang } = useLanguage()
  const hasScore = match.homeScore !== null && match.awayScore !== null
  const homeWin = !!match.winner && !!match.home && match.winner.id === match.home.id
  const awayWin = !!match.winner && !!match.away && match.winner.id === match.away.id
  const statusLabel =
    match.status === 'live'
      ? t('matches.live')
      : match.status === 'finished'
        ? t('matches.ft')
        : t('matches.scheduled')

  return (
    <div className="match-row">
      <TeamSide team={match.home} win={homeWin} lang={lang} />
      <div className="match-center">
        <span className="match-score">{hasScore ? `${match.homeScore}–${match.awayScore}` : '—'}</span>
        <span className="match-status">{statusLabel}</span>
      </div>
      <div className={`match-team away ${awayWin ? 'win' : ''}`}>
        {isFinal && match.winner && (
          <span className="match-trophy" aria-hidden="true">
            🏆
          </span>
        )}
        {match.away ? (
          <TeamBadge team={match.away} />
        ) : (
          <span className="team-badge nd-badge" aria-hidden="true">
            ?
          </span>
        )}
        <span className="match-team-name">{match.away ? teamName(match.away, lang) : 'N/D'}</span>
      </div>
    </div>
  )
}

function GroupStage({ matches }) {
  const { t } = useLanguage()
  const groups = [...new Set(matches.map((m) => m.group))].sort()

  return (
    <div className="groups-grid">
      {groups.map((group) => {
        const gMatches = matches.filter((m) => m.group === group)
        return (
          <div key={group} className="group-card card-hover-glow">
            <div className="group-card-head">
              <span className="group-card-title">
                {t('standings.group')} {group}
              </span>
              <span className="group-card-sub">
                {gMatches.length} {t('matches.played')}
              </span>
            </div>
            <div className="group-card-body">
              {gMatches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KnockoutStage({ ko }) {
  const { t } = useLanguage()
  return (
    <div className="ko-matches">
      {KO_ORDER.map((stage) => {
        const matches = ko[stage] || []
        if (matches.length === 0) return null
        return (
          <section key={stage} className="ko-round">
            <h2 className="ko-round-title">{t(`round.${stage}`)}</h2>
            <div className="ko-matches-grid">
              {matches.map((match) => (
                <MatchRow key={match.id} match={match} isFinal={stage === 'final'} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Matches() {
  const { t } = useLanguage()
  const [view, setView] = useState('groups')
  const [matches, setMatches] = useState([])
  const [ko, setKo] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([db.getMatchResults(), db.getKnockoutData()])
      .then(([m, k]) => {
        if (!active) return
        setMatches(m)
        setKo(k)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        console.error('Failed to load matches', err)
        setError('Failed to load matches')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  useMatchesRealtime(() => {
    Promise.all([db.getMatchResults(), db.getKnockoutData()])
      .then(([m, k]) => {
        setMatches(m)
        setKo(k)
      })
      .catch((err) => console.error('Realtime refresh failed', err))
  })

  return (
    <main className="page-fade">
      <section className="page-header">
        <div className="container">
          <h1>{t('matches.title')}</h1>
          <p>{t('matches.subtitle')}</p>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: '60px' }}>
        <div className="matches-view">
          <button
            type="button"
            className={view === 'groups' ? 'active' : ''}
            onClick={() => setView('groups')}
          >
            {t('matches.groupStage')}
          </button>
          <button
            type="button"
            className={view === 'knockout' ? 'active' : ''}
            onClick={() => setView('knockout')}
          >
            {t('matches.knockoutStage')}
          </button>
        </div>

        {loading && <div className="load-state">…</div>}
        {!loading && error && <div className="err-state">{error}</div>}

        {!loading &&
          !error &&
          (view === 'groups' ? <GroupStage matches={matches} /> : <KnockoutStage ko={ko} />)}
      </section>
    </main>
  )
}

export default Matches

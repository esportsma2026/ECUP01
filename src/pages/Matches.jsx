import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { teamName } from '../data/teams'
import * as db from '../data/effotbaleDb'
import TeamBadge from '../components/TeamBadge'

const KO_ORDER = ['r32', 'r16', 'qf', 'sf', 'final']

function MatchRow({ match, isFinal }) {
  const { t, lang } = useLanguage()
  const homeWin = match.homeScore > match.awayScore
  const awayWin = match.awayScore > match.homeScore
  return (
    <div className="match-row">
      <div className={`match-team ${homeWin ? 'win' : ''}`}>
        <TeamBadge team={match.home} />
        <span className="match-team-name">{teamName(match.home, lang)}</span>
      </div>
      <div className="match-center">
        <span className="match-score">
          {match.homeScore}–{match.awayScore}
        </span>
        <span className="match-status">{t('matches.ft')}</span>
      </div>
      <div className={`match-team away ${awayWin ? 'win' : ''}`}>
        {isFinal && match.winner && (
          <span className="match-trophy" aria-hidden="true">
            🏆
          </span>
        )}
        <TeamBadge team={match.away} />
        <span className="match-team-name">{teamName(match.away, lang)}</span>
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
                {gMatches.length} {t('matches.unit')}
              </span>
            </div>
            <div className="match-list">
              {gMatches.map((m) => (
                <MatchRow key={m.id} match={m} />
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
    <div className="groups-grid">
      {KO_ORDER.map((key) => {
        const ms = ko[key] || []
        return (
          <div key={key} className="group-card card-hover-glow">
            <div className="group-card-head">
              <span className="group-card-title">{t(`round.${key}`)}</span>
              <span className="group-card-sub">
                {ms.length} {t('matches.unit')}
              </span>
            </div>
            <div className="match-list">
              {ms.map((m, i) => (
                <MatchRow key={`${key}-${i}`} match={m} isFinal={key === 'final'} />
              ))}
            </div>
          </div>
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

  useEffect(() => {
    let active = true
    db.getMatchResults()
      .then((m) => active && setMatches(m))
      .catch((err) => console.error('Failed to load matches', err))
    db.getKnockoutData()
      .then((k) => active && setKo(k))
      .catch((err) => console.error('Failed to load knockout', err))
    return () => {
      active = false
    }
  }, [])

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

        {view === 'groups' ? <GroupStage matches={matches} /> : <KnockoutStage ko={ko} />}
      </section>
    </main>
  )
}

export default Matches

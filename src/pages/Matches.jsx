import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { teamName } from '../data/teams'
import * as db from '../data/effotbaleDb'
import TeamBadge from '../components/TeamBadge'
import AdBanner from '../components/AdBanner'
import { useMatchesRealtime } from '../hooks/useMatchesRealtime'

const KO_ORDER = ['r32', 'r16', 'qf', 'sf', 'final']

function TeamSide({ team, win, lang }) {
  const nd = !team

  return (
    <div className={`match-team ${win ? 'win' : ''}`}>
      {nd ? (
        <span>?</span>
      ) : (
        <TeamBadge team={team} />
      )}

      {nd ? 'N/D' : teamName(team, lang)}
    </div>
  )
}

function MatchRow({ match, isFinal }) {
  const { t, lang } = useLanguage()
  const hasScore = match.homeScore !== null && match.awayScore !== null
  const homeWin =
    !!match.winner && !!match.home && match.winner.id === match.home.id
  const awayWin =
    !!match.winner && !!match.away && match.winner.id === match.away.id

  const statusLabel =
    match.status === 'live'
      ? t('matches.live')
      : match.status === 'finished'
        ? t('matches.ft')
        : t('matches.scheduled')

  return (
    <div className="match-row">
      <div className={`match-team ${homeWin ? 'win' : ''}`}>
        {match.home ? (
          <TeamBadge team={match.home} />
        ) : (
          <span>?</span>
        )}

        {match.home ? teamName(match.home, lang) : 'N/D'}
      </div>

      <div className="match-score">
        {hasScore ? `${match.homeScore}–${match.awayScore}` : '—'}
        <span>{statusLabel}</span>
      </div>

      <div className={`match-team away ${awayWin ? 'win' : ''}`}>
        {isFinal && match.winner && <span>🏆</span>}

        {match.away ? (
          <TeamBadge team={match.away} />
        ) : (
          <span>?</span>
        )}

        {match.away ? teamName(match.away, lang) : 'N/D'}
      </div>
    </div>
  )
}

function GroupStage({ matches }) {
  const { t } = useLanguage()
  const groups = [...new Set(matches.map((m) => m.group))].sort()

  return (
    <div className="groups">
      {groups.map((group) => {
        const gMatches = matches.filter((m) => m.group === group)

        return (
          <div className="group-card" key={group}>
            <div className="group-header">
              <span>
                {t('standings.group')} {group}
              </span>

              <span>
                {gMatches.length} {t('matches.played')}
              </span>
            </div>

            {gMatches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function KnockoutStage({ ko }) {
  const { t } = useLanguage()

  return (
    <div className="knockout">
      {KO_ORDER.map((stage) => {
        const matches = ko[stage] || []

        if (matches.length === 0) return null

        return (
          <div className="knockout-stage" key={stage}>
            <h2>{t(`round.${stage}`)}</h2>

            {matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                isFinal={stage === 'final'}
              />
            ))}
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAd, setShowAd] = useState(false)

  useEffect(() => {
    setShowAd(false)

    const timer = setTimeout(() => setShowAd(true), 1000)

    return () => clearTimeout(timer)
  }, [view])

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
    <main>
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

        {!loading && error && (
          <div className="err-state">{error}</div>
        )}

        {!loading &&
          !error &&
          (view === 'groups' ? (
            <GroupStage matches={matches} />
          ) : (
            <KnockoutStage ko={ko} />
          ))}
      </section>

      {/* Persistent Sponsorship Pop-up Modal */}
      {showAd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <div className="relative w-full max-w-md rounded-xl border border-[#ff0055]/20 bg-[#1a152e] shadow-2xl p-5 text-left">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowAd(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-600/20 text-red-400 transition-all hover:bg-red-600 hover:text-white font-bold cursor-pointer"
              style={{ border: 'none' }}
            >
              X
            </button>

            <div className="mt-4">
              <span className="mb-4 inline-block rounded-full bg-[#ff0055]/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-[#ff7ba9]">
                Sponsored Ad
              </span>

              {/* Google AdSense */}
              <AdBanner className="rounded-lg border border-white/10 overflow-hidden" />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Matches
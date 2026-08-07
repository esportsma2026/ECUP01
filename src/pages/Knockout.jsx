import { useLanguage } from '../context/LanguageContext'
import { teamName } from '../data/teams'
import * as db from '../data/effotbaleDb'
import TeamBadge from '../components/TeamBadge'

const ROUND_DEFS = [
  { key: 'r32', roundKey: 'round.r32', col: 1, hasPrev: false, hasNext: true },
  { key: 'r16', roundKey: 'round.r16', col: 3, hasPrev: true, hasNext: true },
  { key: 'qf', roundKey: 'round.qf', col: 5, hasPrev: true, hasNext: true },
  { key: 'sf', roundKey: 'round.sf', col: 7, hasPrev: true, hasNext: true },
  { key: 'final', roundKey: 'round.final', col: 9, hasPrev: true, hasNext: false },
]

const ROW_STARTS = [
  (k) => 4 * k + 2,
  (k) => 8 * k + 3,
  (k) => 16 * k + 5,
  (k) => 32 * k + 9,
  () => 17,
]

const SPANS = [2, 4, 8, 16, 32]

function matchStyle(roundIndex, k) {
  return { gridRow: `${ROW_STARTS[roundIndex](k)} / span ${SPANS[roundIndex]}` }
}

function connectorStyle(roundIndex, k) {
  const s0 = ROW_STARTS[roundIndex](2 * k)
  const s1 = ROW_STARTS[roundIndex](2 * k + 1)
  const c0 = s0 + (SPANS[roundIndex] - 1) / 2
  const c1 = s1 + (SPANS[roundIndex] - 1) / 2
  const total = s1 + SPANS[roundIndex] - 1 - s0 + 1
  return {
    gridRow: `${s0} / span ${total}`,
    top: `${((c0 - s0) / total) * 100}%`,
    height: `${((c1 - c0) / total) * 100}%`,
  }
}

function TeamRow({ team, score, win, lang }) {
  return (
    <div className={`bracket-team ${win ? 'win' : ''}`}>
      <TeamBadge team={team} />
      <span className="bracket-team-name">{teamName(team, lang)}</span>
      <span className="bracket-team-score">{score ?? '–'}</span>
    </div>
  )
}

function Knockout() {
  const { t, lang } = useLanguage()
  const ko = db.getKnockoutData()

  const name = (team) => teamName(team, lang)

  return (
    <main className="page-fade">
      <section className="page-header">
        <div className="container">
          <h1>{t('knockout.title')}</h1>
          <p>{t('knockout.subtitle')}</p>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: '60px' }}>
        <p className="bracket-hint">{t('knockout.scrollHint')}</p>
        <div className="bracket-scroll">
          <div className="bracket">
            {ROUND_DEFS.map((r) => (
              <div
                key={r.key}
                className={`bracket-round-head ${r.key === 'final' ? 'final' : ''}`}
                style={{ gridColumn: r.col, gridRow: 1 }}
              >
                {t(r.roundKey)}
              </div>
            ))}

            {ROUND_DEFS.slice(0, 4).map((r, ri) =>
              (ko[ROUND_DEFS[ri + 1].key] || []).map((_, k) => {
                const cs = connectorStyle(ri, k)
                return (
                  <div
                    key={`conn-${ri}-${k}`}
                    className="bracket-conn"
                    style={{ gridColumn: r.col + 1, gridRow: cs.gridRow }}
                  >
                    <span className="bracket-conn-line" style={{ top: cs.top, height: cs.height }} />
                  </div>
                )
              }),
            )}

            {ROUND_DEFS.map((r, ri) =>
              (ko[r.key] || []).map((m, k) => {
                const homeWin = m.homeScore > m.awayScore
                const awayWin = m.awayScore > m.homeScore
                return (
                  <div
                    key={m.id || `${r.key}-${k}`}
                    className={`bracket-match ${r.key === 'final' ? 'final' : ''} ${
                      r.hasPrev ? 'has-prev' : 'no-prev'
                    } ${r.hasNext ? 'has-next' : 'no-next'}`}
                    style={{ gridColumn: r.col, ...matchStyle(ri, k) }}
                  >
                    <TeamRow team={m.home} score={m.homeScore} win={homeWin} lang={lang} />
                    <TeamRow team={m.away} score={m.awayScore} win={awayWin} lang={lang} />
                    {r.key === 'final' && m.winner && (
                      <div className="bracket-champion">
                        <span aria-hidden="true">🏆</span> {t('champion')}: {name(m.winner)}
                      </div>
                    )}
                  </div>
                )
              }),
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Knockout

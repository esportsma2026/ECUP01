import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { teamName, GROUP_LETTERS } from '../data/teams'
import * as db from '../data/effotbaleDb'
import TeamBadge from '../components/TeamBadge'
import { useMatchesRealtime } from '../hooks/useMatchesRealtime'

function GroupTable({ group }) {
  const { t, lang } = useLanguage()
  return (
    <div className="group-card card-hover-glow">
      <div className="group-card-head">
        <span className="group-card-title">
          {t('standings.group')} {group.group}
        </span>
        <span className="group-card-sub">
          {group.rows.length} {t('standings.teams')}
        </span>
      </div>
      <div className="table-scroll">
        <table className="standings-table group-table">
          <thead>
            <tr>
              <th aria-label="Position">#</th>
              <th className="t-team">{t('standings.team')}</th>
              <th>{t('standings.p')}</th>
              <th>{t('standings.w')}</th>
              <th>{t('standings.d')}</th>
              <th>{t('standings.l')}</th>
              <th>{t('standings.gf')}</th>
              <th>{t('standings.ga')}</th>
              <th>{t('standings.gd')}</th>
              <th>{t('standings.pts')}</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => (
              <tr key={row.team.id} className={row.pos <= 2 ? 'q' : row.pos === 3 ? 'third' : 'elim'}>
                <td className="pos-cell">{row.pos}</td>
                <td className="t-team">
                  <span className="team-inline">
                    <TeamBadge team={row.team} />
                    <span className="team-name">{teamName(row.team, lang)}</span>
                  </span>
                </td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.gf}</td>
                <td>{row.ga}</td>
                <td className={row.gd > 0 ? 'gd-cell pos' : row.gd < 0 ? 'gd-cell neg' : ''}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className="t-pts">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ThirdPlaceTable({ rows }) {
  const { t, lang } = useLanguage()
  return (
    <div className="third-card card-hover-glow">
      <div className="third-head">
        <div>
          <h2 className="third-title">{t('standings.thirdTitle')}</h2>
          <p className="third-sub">{t('standings.thirdDesc')}</p>
        </div>
        <span className="third-note">
          <span aria-hidden="true">✔</span> {t('standings.top8')}
        </span>
      </div>
      <div className="table-scroll">
        <table className="standings-table third-table">
          <thead>
            <tr>
              <th aria-label="Position">#</th>
              <th className="t-team">{t('standings.team')}</th>
              <th>{t('standings.group')}</th>
              <th>{t('standings.p')}</th>
              <th>{t('standings.w')}</th>
              <th>{t('standings.d')}</th>
              <th>{t('standings.l')}</th>
              <th>{t('standings.pts')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const nd = !row.team
              return (
                <tr key={row.group} className={nd ? 'nd' : row.pos <= 8 ? 'q' : 'elim'}>
                  <td className="pos-cell">{row.pos}</td>
                  <td className="t-team">
                    {nd ? (
                      <span className="team-name nd-name">N/D</span>
                    ) : (
                      <span className="team-inline">
                        <TeamBadge team={row.team} />
                        <span className="team-name">{teamName(row.team, lang)}</span>
                      </span>
                    )}
                  </td>
                  <td className="group-cell">{row.group}</td>
                  <td>{nd ? '—' : row.played}</td>
                  <td>{nd ? '—' : row.won}</td>
                  <td>{nd ? '—' : row.drawn}</td>
                  <td>{nd ? '—' : row.lost}</td>
                  <td className="t-pts">{nd ? '—' : row.pts}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Standings() {
  const { t } = useLanguage()
  const [selected, setSelected] = useState('A')
  const [groups, setGroups] = useState([])
  const [thirds, setThirds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([db.getStandings(), db.getThirdPlaceStandings(), db.getGroups()])
      .then(([g, r, grpList]) => {
        if (!active) return
        setGroups(g)
        setThirds(r)
        const first = grpList[0]?.name || 'A'
        setSelected((prev) => (prev && grpList.some((x) => x.name === prev) ? prev : first))
        setError('')
      })
      .catch((err) => {
        if (!active) return
        console.error('Failed to load standings', err)
        setError('Failed to load standings')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  useMatchesRealtime(() => {
    Promise.all([db.getStandings(), db.getThirdPlaceStandings()])
      .then(([g, r]) => {
        setGroups(g)
        setThirds(r)
      })
      .catch((err) => console.error('Realtime refresh failed', err))
  })

  const current = groups.find((g) => g.group === selected) || groups[0]
  const tabs = groups.length > 0 ? groups.map((g) => g.group) : GROUP_LETTERS

  return (
    <main className="page-fade">
      <section className="page-header">
        <div className="container">
          <h1>{t('standings.title')}</h1>
          <p>{t('standings.subtitle')}</p>
        </div>
      </section>

      <section className="container standings-select-wrap">
        <p className="standings-select-label">{t('standings.selectGroup')}</p>
        <div className="group-tabs" role="tablist" aria-label={t('standings.selectGroup')}>
          {tabs.map((letter) => (
            <button
              key={letter}
              type="button"
              role="tab"
              aria-selected={selected === letter}
              className={`group-tab ${selected === letter ? 'active' : ''}`}
              onClick={() => setSelected(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
        <p className="standings-legend">
          <span className="legend-dot q" aria-hidden="true" />
          {t('standings.qualified')}
          <span className="legend-dot third" aria-hidden="true" />
          {t('standings.thirdHint')}
        </p>
      </section>

      {loading && <div className="load-state">…</div>}
      {!loading && error && <div className="err-state">{error}</div>}

      {!loading && !error && groups.length > 0 && current && (
        <section className="container" style={{ paddingBottom: '12px' }}>
          <div key={current.group} className="standings-single anim-group">
            <GroupTable group={current} />
          </div>
        </section>
      )}

      {!loading && !error && (
        <section className="container third-wrap">
          <ThirdPlaceTable rows={thirds} />
        </section>
      )}
    </main>
  )
}

export default Standings

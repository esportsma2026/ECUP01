import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { teamName, GROUP_LETTERS } from '../data/teams'
import * as db from '../data/effotbaleDb'
import TeamBadge from '../components/TeamBadge'

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
            {rows.map((row) => (
              <tr key={row.team.id} className={row.pos <= 8 ? 'q' : 'elim'}>
                <td className="pos-cell">{row.pos}</td>
                <td className="t-team">
                  <span className="team-inline">
                    <TeamBadge team={row.team} />
                    <span className="team-name">{teamName(row.team, lang)}</span>
                  </span>
                </td>
                <td className="group-cell">{row.group}</td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td className="t-pts">{row.pts}</td>
              </tr>
            ))}
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

  useEffect(() => {
    let active = true
    db.getStandings()
      .then((g) => active && setGroups(g))
      .catch((err) => console.error('Failed to load standings', err))
    db.getThirdPlaceStandings()
      .then((r) => active && setThirds(r))
      .catch((err) => console.error('Failed to load third-place standings', err))
    return () => {
      active = false
    }
  }, [])

  const current = groups.find((g) => g.group === selected) || groups[0]

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
          {GROUP_LETTERS.map((letter) => (
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

      {groups.length > 0 && current && (
        <section className="container" style={{ paddingBottom: '12px' }}>
          <div key={current.group} className="standings-single anim-group">
            <GroupTable group={current} />
          </div>
        </section>
      )}

      <section className="container third-wrap">
        <ThirdPlaceTable rows={thirds} />
      </section>
    </main>
  )
}

export default Standings

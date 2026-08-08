import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import * as db from '../data/effotbaleDb'

function useStats(lang, t) {
  const [stats, setStats] = useState({
    matches: '0/72',
    groups: '0',
    round: t('hpNotStarted'),
    qualified: '0',
  })

  useEffect(() => {
    async function update() {
      try {
        const matches = await db.getMatchResults()
        const draw = await db.getDraw()
        let ko = await db.getKnockoutData()

        const totalPlayed = matches.filter((m) => m.status === 'finished').length

        let finishedGroups = 0
        if (draw) {
          const groupKeys = Object.keys(draw).sort()
          groupKeys.forEach((key) => {
            const gMatches = matches.filter((m) => m.group === key)
            if (gMatches.length > 0 && gMatches.every((m) => m.status === 'finished')) {
              finishedGroups += 1
            }
          })
          if (finishedGroups === 12) ko = await db.computeKnockoutProgression()
        }

      const roundMap = {
        r32: lang === 'ar' ? 'دور الـ32' : 'Round of 32',
        r16: lang === 'ar' ? 'دور الـ16' : 'Round of 16',
        qf: lang === 'ar' ? 'ربع النهائي' : 'Quarter Finals',
        sf: lang === 'ar' ? 'نصف النهائي' : 'Semi Finals',
        final: lang === 'ar' ? 'النهائي' : 'Final',
      }
      const roundTeamCount = { r32: 32, r16: 16, qf: 8, sf: 4, final: 2 }

      let currentRound = t('hpNotStarted')
      let qualified = 0
      if (ko) {
        const order = ['r32', 'r16', 'qf', 'sf', 'final']
        for (let i = 0; i < order.length; i++) {
          if (ko[order[i]] && ko[order[i]].length > 0) {
            currentRound = roundMap[order[i]]
            qualified = roundTeamCount[order[i]] || ko[order[i]].length * 2
            const allDone = ko[order[i]].every((m) => m.status === 'finished')
            if (allDone && i < order.length - 1 && ko[order[i + 1]]) continue
            break
          }
        }
      }

        const qt = await db.getQualifiedTeams()
        setStats((prev) => {
          const next = {
            matches: `${totalPlayed}/72`,
            groups: finishedGroups,
            round: currentRound,
            qualified: qt ? qt.totalQualified : 0,
          }
          if (
            prev.matches === next.matches &&
            prev.groups === next.groups &&
            prev.round === next.round &&
            prev.qualified === next.qualified
          ) {
            return prev
          }
          return next
        })
      } catch (err) {
        console.error('Failed to refresh tournament stats', err)
      }
    }

    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [lang, t])

  return stats
}

function Home() {
  const { t, lang } = useLanguage()
  const stats = useStats(lang, t)

  return (
    <main className="page-fade">
      <section className="hp-hero" aria-label="Hero section">
        <div className="glow-orb g1" />
        <div className="glow-orb g2" />
        <div className="glow-orb g3" />
        <div className="container">
          <div className="hero-badge anim-scale-in">{t('heroBadge')}</div>
          <h1 className="anim-tilt-in">EFFOTBALE</h1>
          <p className="hero-subtitle anim-slide-up stagger-1">{t('tournament.subtitle')}</p>
          <p className="hero-tagline anim-fade-slide stagger-2">{t('heroTagline')}</p>
          <div className="hero-buttons anim-slide-up stagger-3">
            <Link to="/standings" className="btn btn-primary">
              🏆 <span>{t('nav.tournament')}</span>
            </Link>
            <Link to="/knockout" className="btn btn-secondary">
              ⚔️ <span>{t('nav.knockout')}</span>
            </Link>
            <Link to="/matches" className="btn btn-secondary" style={{ background: 'transparent', borderColor: 'var(--border-color)' }}>
              📋 <span>{t('nav.matches')}</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="container hot-preview reveal" aria-label="Hot preview">
        <div className="hp-badge">{t('hotPreview')}</div>
        <div className="hp-grid reveal-stagger">
          <div className="hp-item anim-slide-up card-hover-glow">
            <span className="hp-icon">🏆</span>
            <h4>{t('hpTournament')}</h4>
            <p>
              <span>{t('hpGroupProgress')}</span> —{' '}
              <span className="hp-stat stat-number">{stats.matches}</span>{' '}
              <span>{t('hpMatchesPlayed')}</span>
            </p>
          </div>
          <div className="hp-item anim-slide-up stagger-1 card-hover-glow">
            <span className="hp-icon">📊</span>
            <h4>{t('hpGroupsDone')}</h4>
            <p>
              <span className="hp-stat" style={{ fontSize: '1.5rem' }}>
                {stats.groups}
              </span>{' '}
              <span>{t('hpGroupsOf')}</span>
            </p>
          </div>
          <div className="hp-item anim-slide-up stagger-2 card-hover-glow">
            <span className="hp-icon">⚽</span>
            <h4>{t('hpKnockout')}</h4>
            <p>
              <span>{t('hpKnockoutRound')}</span>:{' '}
              <span className="hp-stat">{stats.round}</span>
            </p>
          </div>
          <div className="hp-item anim-slide-up stagger-3 card-hover-glow">
            <span className="hp-icon">🌍</span>
            <h4>{t('hpTeamsQualified')}</h4>
            <p>
              <span className="hp-stat" style={{ fontSize: '1.5rem' }}>
                {stats.qualified}
              </span>{' '}
              <span>{t('hpTeamsQualifiedDesc')}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="features" aria-label="Game features">
        <div className="container">
          <h2 className="section-title">{t('features.title')}</h2>
          <p className="section-subtitle">{t('features.subtitle')}</p>
          <div className="hp-features-alt">
            <div className="hp-fa-item anim-tilt-in card-hover-glow">
              <div className="hp-fa-icon">🏆</div>
              <h4>{t('tournament.title')}</h4>
              <p>{t('f1desc')}</p>
            </div>
            <div className="hp-fa-item anim-tilt-in stagger-1 card-hover-glow">
              <div className="hp-fa-icon">📊</div>
              <h4>{t('f2title')}</h4>
              <p>{t('f2desc')}</p>
            </div>
            <div className="hp-fa-item anim-tilt-in stagger-2 card-hover-glow">
              <div className="hp-fa-icon">🎮</div>
              <h4>{t('f3title')}</h4>
              <p>{t('f3desc')}</p>
            </div>
            <div className="hp-fa-item anim-tilt-in stagger-3 card-hover-glow">
              <div className="hp-fa-icon">👥</div>
              <h4>{t('f4title')}</h4>
              <p>{t('f4desc')}</p>
            </div>
            <div className="hp-fa-item anim-tilt-in stagger-4 card-hover-glow">
              <div className="hp-fa-icon">🎯</div>
              <h4>{t('f5title')}</h4>
              <p>{t('f5desc')}</p>
            </div>
            <div className="hp-fa-item anim-tilt-in stagger-5 card-hover-glow">
              <div className="hp-fa-icon">🏅</div>
              <h4>{t('f6title')}</h4>
              <p>{t('f6desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section reveal" aria-label="Call to action">
        <div className="container">
          <h2 className="anim-fade-slide">{t('cta.title')}</h2>
          <p className="anim-fade-slide stagger-1">{t('cta.desc')}</p>
          <Link to="/standings" className="btn btn-primary anim-pulse-glow" style={{ animation: 'scalePulse 2s ease-in-out infinite' }}>
            🏆 {t('nav.tournament')}
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Home

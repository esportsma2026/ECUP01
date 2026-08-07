import { useLanguage } from '../context/LanguageContext'

const rules = [
  { num: '01', icon: '🤝', titleKey: 'rules.r1' },
  { num: '02', icon: '📜', titleKey: 'rules.r2', descKey: 'rules.r2d' },
  { num: '03', icon: '⚽', titleKey: 'rules.r3', descKey: 'rules.r3d' },
  { num: '04', icon: '⏱️', titleKey: 'rules.r4', descKey: 'rules.r4d' },
  { num: '05', icon: '🕐', titleKey: 'rules.r5', descKey: 'rules.r5d' },
  { num: '06', icon: '➡️', titleKey: 'rules.r6', descKey: 'rules.r6d' },
  { num: '07', icon: '🥅', titleKey: 'rules.r7', descKey: 'rules.r7d' },
  { num: '08', icon: '🔌', titleKey: 'rules.r8', descKey: 'rules.r8d' },
  { num: '09', icon: '🏷️', titleKey: 'rules.r9', descKey: 'rules.r9d' },
  { num: '10', icon: '📮', titleKey: 'rules.r10', descKey: 'rules.r10d' },
]

function Rules() {
  const { t } = useLanguage()

  return (
    <main className="page-fade">
      <section className="page-header">
        <div className="container">
          <h1>{t('rules.title')}</h1>
          <p>{t('rules.subtitle')}</p>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: '60px' }}>
        <div className="rules-grid" aria-label="Tournament rules">
          {rules.map((r) => (
            <article key={r.num} className="rule-card">
              <span className="rule-num" aria-hidden="true">
                {r.num}
              </span>
              <span className="rule-icon" aria-hidden="true">
                {r.icon}
              </span>
              <h3 className="rule-title">{t(r.titleKey)}</h3>
              {r.descKey && <p className="rule-desc">{t(r.descKey)}</p>}
            </article>
          ))}
        </div>

        <p className="rules-note">
          <strong>{t('rules.note')}</strong>
        </p>
      </section>
    </main>
  )
}

export default Rules

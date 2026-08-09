import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

const SUPPORT_WHATSAPP = '212783860620'

const contactCards = [
  {
    key: 'instagram',
    href: 'https://instagram.com/mr_gt100',
    target: '_blank',
    rel: 'noopener',
    color: 'rgba(225,48,108,0.1)',
    img: '/images/Instagram.png',
    value: '@mr_gt100',
    dir: null,
  },
  {
    key: 'whatsapp',
    href: 'https://wa.me/212783860620',
    target: '_blank',
    rel: 'noopener',
    color: 'rgba(16,185,129,0.1)',
    img: '/images/whatsapp.png',
    value: '+212 7 83 86 06 20',
    dir: 'ltr',
  },
  {
    key: 'email',
    href: 'mailto:esportsma2026@gmail.com',
    target: null,
    rel: null,
    color: 'rgba(59,130,246,0.1)',
    img: '/images/Gmail.png',
    value: 'esportsma2026@gmail.com',
    dir: null,
  },
]

function Support() {
  const { t } = useLanguage()
  const [playerNum, setPlayerNum] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [sent, setSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!playerNum.trim()) {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }

    const subject = t('support.title')
    const numLine = `${t('playerNum')}: ${playerNum.trim()}`
    const msgLine = msg.trim()
      ? `${t('messageLabel').replace(/\s*\(.*?\)$/, '').trim()}: ${msg.trim()}`
      : ''

    const text = [subject, numLine, msgLine].filter(Boolean).join('\n')
    const waUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`

    setSent(true)
    window.open(waUrl, '_blank', 'noopener')
  }

  const cardClass = `report-card ${shake ? 'shake' : ''}`

  return (
    <main className="page-fade">
      <section className="page-header">
        <div className="container">
          <h1>{t('support.title')}</h1>
          <p>{t('support.desc')}</p>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: '60px' }}>
        <div className="report-wrap">
          <div className={cardClass}>
            <div className="report-head">
              <div className="report-head-icon" aria-hidden="true">
                📝
              </div>
              <div>
                <h3>{t('supportIssueTitle')}</h3>
                <p>{t('supportIssueDesc')}</p>
              </div>
            </div>

            <div className={`msg-success ${sent ? 'visible' : ''}`} role="status">
              {t('msgSent')}
            </div>

            <form id="reportForm" onSubmit={handleSubmit} noValidate>
              <div className={`field ${error ? 'error' : ''}`}>
                <label className="field-label" htmlFor="playerNum">
                  {t('playerNum')}
                </label>
                <input
                  className="msg-input"
                  type="tel"
                  id="playerNum"
                  name="playerNum"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  maxLength="30"
                  placeholder="+212 6 00 00 00 00"
                  aria-describedby="numHint numErr"
                  value={playerNum}
                  onChange={(e) => {
                    setPlayerNum(e.target.value)
                    if (error) setError(false)
                  }}
                />
                <span className="err-msg" id="numErr">
                  {t('supportNumRequired')}
                </span>
                <span className="field-hint" id="numHint">
                  {t('playerNumHint')}
                </span>
              </div>

              <div className="desc-field">
                <label className="field-label" htmlFor="msgText">
                  {t('messageLabel')} <span className="opt-tag">{t('messageOptional')}</span>
                </label>
                <div className="textarea-wrapper">
                  <textarea
                    className="textarea-textarea"
                    id="msgText"
                    name="msgText"
                    placeholder={t('messagePlaceholder')}
                    aria-describedby="descHint"
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                  />
                </div>
                <span className="field-hint" id="descHint">
                  {t('messageOptional')}
                </span>
              </div>

              <div className="send-note">
                <span className="note-icon" aria-hidden="true">
                  📌
                </span>
                <span>ملاحظة: يرجى إرسال دليل أو نتيجة المباراة كصورة في الواتساب مباشرة بعد إرسال هذه الرسالة.</span>
              </div>

              <div className="submit-row">
                <button type="submit" className="btn btn-primary">
                  📤 {t('sendMessage')}
                </button>
              </div>
            </form>

            <div className={`wa-note ${sent ? 'visible' : ''}`}>
              <span aria-hidden="true">💬</span>
              <span>
                <strong>{t('waNote')}</strong> <span>{t('waImageHint')}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="contact-grid">
          {contactCards.map((c) => (
            <a
              key={c.key}
              href={c.href}
              target={c.target || undefined}
              rel={c.rel || undefined}
              className="contact-detail card-hover-glow"
              style={{ textDecoration: 'none' }}
            >
              <div className="contact-icon" style={{ background: c.color }}>
                <img
                  src={c.img}
                  alt={t(`contact.${c.key}`)}
                  className="contact-icon-img"
                />
              </div>
              <div className="contact-info">
                <div className="contact-label">{t(`contact.${c.key}`)}</div>
                <div className="contact-value" dir={c.dir || undefined}>
                  {c.value}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}

export default Support

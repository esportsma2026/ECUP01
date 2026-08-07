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
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
    value: '@mr_gt100',
    dir: null,
  },
  {
    key: 'whatsapp',
    href: 'https://wa.me/212783860620',
    target: '_blank',
    rel: 'noopener',
    color: 'rgba(16,185,129,0.1)',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01ZM12.04 20.15c-1.52 0-3-.41-4.29-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.69 8.26-8.12 8.26Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
      </svg>
    ),
    value: '+212 7 83 86 06 20',
    dir: 'ltr',
  },
  {
    key: 'email',
    href: 'mailto:esportsma2026@gmail.com',
    target: null,
    rel: null,
    color: 'rgba(59,130,246,0.1)',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z" />
      </svg>
    ),
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
                {c.svg}
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

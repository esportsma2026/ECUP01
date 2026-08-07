import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const socials = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/mr_gt100',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/212783860620',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01ZM12.04 20.15c-1.52 0-3-.41-4.29-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.69 8.26-8.12 8.26Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
      </svg>
    ),
  },
  {
    label: 'Gmail',
    href: 'mailto:esportsma2026@gmail.com',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z" />
      </svg>
    ),
  },
]

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="nav-logo">
              <img src="/images/site-logo.jpg" alt="Effotbale" className="nav-logo-img" />
              <span className="nav-logo-text">EFFOTBALE</span>
            </Link>
            <p>{t('footerBrand')}</p>
            <div className="footer-social">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener" aria-label={s.label}>
                  {s.svg}
                </a>
              ))}
            </div>
          </div>

          <div className="footer-links">
            <h4>{t('nav.tournament')}</h4>
            <Link to="/standings">{t('wc2026')}</Link>
            <Link to="/standings">{t('standings.title')}</Link>
            <Link to="/matches">{t('nav.matches')}</Link>
            <Link to="/knockout">{t('nav.knockout')}</Link>
          </div>

          <div className="footer-links">
            <h4>{t('nav.support')}</h4>
            <Link to="/rules">{t('nav.faq')}</Link>
            <Link to="/support">{t('contactUs')}</Link>
            <a href="#">{t('community')}</a>
          </div>

          <div className="footer-links">
            <h4>{t('legal')}</h4>
            <a href="#">{t('privacy')}</a>
            <a href="#">{t('terms')}</a>
            <a href="#">{t('cookie')}</a>
            <a href="#">{t('eula')}</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © 2026 Effotbale. <span>{t('footer.rights')}</span>
          </p>
          <p>{t('footer.tagline')}</p>
        </div>
      </div>
    </footer>
  )
}

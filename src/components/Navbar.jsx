import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const links = [
  { key: 'home', to: '/' },
  { key: 'tournament', to: '/standings' },
  { key: 'knockout', to: '/knockout' },
  { key: 'matches', to: '/matches' },
  { key: 'faq', to: '/rules' },
  { key: 'support', to: '/support' },
]

export default function Navbar() {
  const { t, lang, setLang, isAr } = useLanguage()
  const [open, setOpen] = useState(false)

  const renderLink = (l) => {
    const common = {
      className: ({ isActive }) => `nav-link ${isActive ? 'active' : ''}`,
      onClick: () => setOpen(false),
    }
    if (l.to === '#') {
      return (
        <a key={l.key} href="#" className="nav-link" onClick={() => setOpen(false)}>
          {t(`nav.${l.key}`)}
        </a>
      )
    }
    return (
      <NavLink key={l.key} to={l.to} {...common}>
        {t(`nav.${l.key}`)}
      </NavLink>
    )
  }

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="container">
        <NavLink to="/" className="nav-logo" aria-label="Effotbale Home">
          <img src="/images/site-logo.jpg" alt="Effotbale" className="nav-logo-img" />
          <span className="nav-logo-text">EFFOTBALE</span>
        </NavLink>

        <div className="nav-links">
          {links.map((l) => renderLink(l))}
          <span className="nav-links-right">
            <button type="button" className="lang-toggle" onClick={() => setLang(isAr ? 'en' : 'ar')}>
              {isAr ? 'English' : 'العربية'}
            </button>
          </span>
        </div>

        <button
          type="button"
          className={`mobile-toggle ${open ? 'active' : ''}`}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <div className="nav-panel">
          {links.map((l) => renderLink(l))}
          <button type="button" className="lang-toggle" onClick={() => setLang(isAr ? 'en' : 'ar')}>
            {isAr ? 'English' : 'العربية'}
          </button>
        </div>
      )}
    </nav>
  )
}

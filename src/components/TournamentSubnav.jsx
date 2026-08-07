import { NavLink } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const tabs = [
  { to: '/standings', key: 'standings.title' },
  { to: '/matches', key: 'nav.matches' },
  { to: '/knockout', key: 'nav.knockout' },
]

export default function TournamentSubnav() {
  const { t } = useLanguage()

  return (
    <div className="tournament-subnav">
      <div className="container">
        <nav className="subnav-tabs" aria-label="Tournament sections">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `subnav-tab ${isActive ? 'active' : ''}`}
            >
              {t(tab.key)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

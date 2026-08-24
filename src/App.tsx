import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import './App.css'
import Overview from './pages/Overview'
import RiskRegister from './pages/RiskRegister'
import AssetRegister from './pages/AssetRegister'
import Remediation from './pages/Remediation'
import ScenarioRegister from './pages/ScenarioRegister'
import InsuranceRegister from './pages/InsuranceRegister'
import Reports from './pages/Reports'
import AIAnalyst from './pages/AIAnalyst'
import Audit from './pages/Audit'
import Settings from './pages/Settings'

const navigation = [
  'Overview',
  'Risk Register',
  'Assets',
  'Remediation',
  'Scenarios',
  'Insurance',
  'Reports',
  'AI Analyst',
  'Audit',
  'Settings',
]

/*
 * Single source of truth for page rendering. The former inline dashboard
 * duplicate was removed; pages/Overview.tsx is the canonical Overview.
 */
const pageRegistry: Record<string, ComponentType> = {
  Overview,
  'Risk Register': RiskRegister,
  Assets: AssetRegister,
  Remediation: Remediation,
  Scenarios: ScenarioRegister,
  Insurance: InsuranceRegister,
  Reports: Reports,
  'AI Analyst': AIAnalyst,
  Audit: Audit,
  Settings: Settings,
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('crfis-theme')

    if (saved) {
      return saved === 'dark'
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [activePage, setActivePage] = useState('Overview')

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('crfis-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const pageTitle =
    activePage === 'Overview' ? 'Executive Overview' : activePage

  const ActivePage = pageRegistry[activePage]

  return (
    <div className="crfis-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>

          <div>
            <strong>CRFIS</strong>
            <span>BCSSL</span>
          </div>
        </div>

        <div className="sidebar-label">COMMAND CENTER</div>

        <nav aria-label="Primary navigation">
          {navigation.map((item) => {
            const isActive = activePage === item

            return (
              <button
                key={item}
                className={`nav-item ${isActive ? 'active' : ''}`}
                type="button"
                onClick={() => setActivePage(item)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {isActive ? '◈' : '○'}
                </span>

                <span>{item}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <span>BCSSL</span>
          <small>From Information to Intelligence</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              CYBER RISK FINANCIAL INTELLIGENCE
            </span>

            <h1>{pageTitle}</h1>
          </div>

          <div className="topbar-actions">
            <button
              className="search"
              type="button"
              aria-label="Search (not yet available)"
            >
              <span aria-hidden="true">⌕</span>
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>

            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
            >
              <span aria-hidden="true">◌</span>
            </button>

            <button
              className="theme-button"
              type="button"
              aria-label={
                darkMode
                  ? 'Switch to light theme'
                  : 'Switch to dark theme'
              }
              onClick={() => setDarkMode((current) => !current)}
            >
              <span aria-hidden="true">{darkMode ? '☀' : '◐'}</span>
            </button>

            <div className="profile">
              <div className="avatar" aria-hidden="true">CS</div>

              <div>
                <strong>CISO Office</strong>
                <span>Executive</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          {ActivePage ? (
            <ActivePage />
          ) : (
            <section className="placeholder-page">
              <span className="status-pill">
                <span className="status-dot" />
                MODULE FOUNDATION
              </span>

              <h2>{pageTitle}</h2>

              <p>
                The {activePage} module is part of the CRFIS
                platform. Its production functionality will be
                implemented in the appropriate development phase.
              </p>

              <div className="placeholder-card">
                <strong>Module ready for development</strong>

                <span>
                  Navigation, routing foundation, theme support,
                  and application shell are already connected.
                </span>
              </div>
            </section>
          )}

          <footer>
            <span>
              CRFIS • Cyber Risk Financial Impact System
            </span>

            <span>
              BCSSL • From Information to Intelligence
            </span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App

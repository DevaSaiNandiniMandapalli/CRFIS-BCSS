import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import './App.css'
import logo from './assets/logo.png'
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchIndex, setSearchIndex] = useState(0)

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('crfis-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }

      if (event.key === 'Escape') {
        setSearchOpen(false)
        return
      }

      if (!searchOpen) {
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSearchIndex((current) =>
          filteredNavigation.length === 0
            ? 0
            : (current + 1) % filteredNavigation.length,
        )
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSearchIndex((current) =>
          filteredNavigation.length === 0
            ? 0
            : (current - 1 + filteredNavigation.length) %
              filteredNavigation.length,
        )
      }

      if (event.key === 'Enter' && filteredNavigation.length > 0) {
        event.preventDefault()
        openPageFromSearch(filteredNavigation[searchIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredNavigation = navigation.filter((item) =>
    item.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )

  const openPageFromSearch = (page: string) => {
    setActivePage(page)
    setSearchOpen(false)
    setSearchQuery('')
    setSearchIndex(0)
  }
  const pageTitle =
    activePage === 'Overview' ? 'Executive Overview' : activePage

  const ActivePage = pageRegistry[activePage]

  return (
    <div className="crfis-app">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="Blue Cloud Softech Solutions Ltd." className="brand-logo" />
          <div className="brand-company">
            <strong>Blue Cloud Softech Solutions Ltd.</strong>
            <span>Think Big | AI-First</span>
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
                  {isActive ? '\u25C8' : '\u25CB'}
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
              CYBER RISK FINANCIAL IMPACT SYSTEM
            </span>

            <h1>{pageTitle}</h1>
          </div>

          <div className="topbar-actions">
            <button
              className="search"
              type="button"
              aria-label="Search CRFIS" onClick={() => setSearchOpen(true)}
            >
              <span aria-hidden="true">&#x2315;</span>
              <span>Search</span>
              <kbd>&#x2318; K</kbd>
            </button>

            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
            >
              <span aria-hidden="true">&#x25CC;</span>
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
              <span aria-hidden="true">{darkMode ? '\u2600' : '\u25D0'}</span>
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
              CRFIS &bull; Cyber Risk Financial Impact System
            </span>

            <span>
              BCSSL &bull; From Information to Intelligence
            </span>
          </footer>
        </div>

      {searchOpen && (
        <div
          className="modal-overlay search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Search CRFIS modules"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSearchOpen(false)
            }
          }}
        >
          <div className="modal search-modal">
            <div className="modal-header">
              <h3>Search CRFIS</h3>

              <button
                className="icon-button"
                type="button"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                &times;
              </button>
            </div>

            <input
              className="search-field"
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search modules..."
              aria-label="Search modules"
            />

            <div className="search-results">
              {filteredNavigation.length > 0 ? (
                filteredNavigation.map((item) => (
                  <button
                    key={item}
                    className="search-result"
                    type="button"
                    onClick={() => openPageFromSearch(item)}
                  >
                    <span>{item}</span>
                  </button>
                ))
              ) : (
                <p className="modal-notice">
                  No matching modules found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}</main>
    </div>
  )
}

export default App

import { useEffect, useState } from 'react'
import './App.css'
import RiskRegister from './pages/RiskRegister'
import AssetRegister from './pages/AssetRegister'

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

const risks = [
  {
    risk: 'Ransomware Exposure',
    asset: 'Core Infrastructure',
    severity: 'Critical',
    exposure: '$1.25M',
    status: 'Needs action',
  },
  {
    risk: 'Credential Compromise',
    asset: 'Identity Platform',
    severity: 'High',
    exposure: '$480K',
    status: 'Under review',
  },
  {
    risk: 'Data Exfiltration',
    asset: 'Customer Database',
    severity: 'High',
    exposure: '$760K',
    status: 'Needs action',
  },
]

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

  const handleNavigation = (page: string) => {
    setActivePage(page)
  }

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
                onClick={() => handleNavigation(item)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon">
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
            <button className="search" type="button">
              <span>⌕</span>
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>

            <button
              className="icon-button"
              type="button"
              aria-label="Notifications"
            >
              ◌
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
              {darkMode ? '☀' : '◐'}
            </button>

            <div className="profile">
              <div className="avatar">CS</div>

              <div>
                <strong>CISO Office</strong>
                <span>Executive</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          {activePage === 'Overview' ? (
            <>
              <section className="welcome">
                <div>
                  <span className="status-pill">
                    <span className="status-dot" />
                    DEMO ENVIRONMENT
                  </span>

                  <h2>Financial Risk Intelligence</h2>

                  <p>
                    Translate cybersecurity exposure into financial
                    impact, prioritize remediation, and give leadership
                    a clear view of risk investment decisions.
                  </p>
                </div>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setActivePage('Risk Register')}
                >
                  View Risk Register →
                </button>
              </section>

              <section
                className="metrics"
                aria-label="Financial risk metrics"
              >
                <article className="metric-card">
                  <span>Total Financial Exposure</span>
                  <strong>$2.49M</strong>
                  <small>DEMO / PLACEHOLDER</small>

                  <div className="metric-trend">
                    Illustrative exposure
                  </div>
                </article>

                <article className="metric-card">
                  <span>Annualized Loss Expectancy</span>
                  <strong>$640K</strong>
                  <small>DEMO / PLACEHOLDER</small>

                  <div className="metric-trend">
                    Illustrative ALE
                  </div>
                </article>

                <article className="metric-card accent">
                  <span>Critical Risks</span>
                  <strong>04</strong>
                  <small>DEMO / PLACEHOLDER</small>

                  <div className="metric-trend">
                    Requires attention
                  </div>
                </article>

                <article className="metric-card">
                  <span>Remediation Opportunity</span>
                  <strong>$890K</strong>
                  <small>DEMO / PLACEHOLDER</small>

                  <div className="metric-trend">
                    Potential exposure reduction
                  </div>
                </article>
              </section>

              <section className="section-header">
                <div>
                  <span className="eyebrow">
                    PRIORITY EXPOSURES
                  </span>

                  <h2>Risk Summary</h2>
                </div>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setActivePage('Risk Register')}
                >
                  View all risks
                </button>
              </section>

              <section className="risk-panel">
                <div className="risk-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Risk</th>
                        <th>Asset</th>
                        <th>Severity</th>
                        <th>Estimated Exposure</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {risks.map((item) => (
                        <tr key={item.risk}>
                          <td>
                            <strong>{item.risk}</strong>
                          </td>

                          <td>{item.asset}</td>

                          <td>
                            <span
                              className={`severity ${item.severity.toLowerCase()}`}
                            >
                              {item.severity}
                            </span>
                          </td>

                          <td>{item.exposure}</td>

                          <td>{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="intelligence-panel">
                <div className="intelligence-icon">↗</div>

                <div>
                  <span className="eyebrow">
                    EXECUTIVE INTELLIGENCE
                  </span>

                  <h2>
                    From technical findings to financial decisions.
                  </h2>

                  <p>
                    CRFIS connects cybersecurity findings, asset
                    criticality, probability, financial loss,
                    remediation cost, and business context into one
                    decision-ready view.
                  </p>
                </div>

                <button className="secondary-button" type="button">
                  Explore CRFIS
                </button>
              </section>
            </>
          ) : activePage === 'Risk Register' ? (
  <RiskRegister />
) : activePage === 'Assets' ? (
  <AssetRegister />
) : (
            <section className="placeholder-page">
              <span className="status-pill">
                <span className="status-dot" />
                MODULE FOUNDATION
              </span>

              <h2>{pageTitle}</h2>

              <p>
                The {activePage} module is part of the CRFIS platform.
                Its production functionality will be implemented in
                the appropriate development phase.
              </p>

              <div className="placeholder-card">
                <strong>Module ready for development</strong>

                <span>
                  Navigation, routing foundation, theme support, and
                  application shell are already connected.
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
import { useState } from 'react'
import { demoSettings } from '../data/demoSettings'
import type { CRFISSettings, ThemePreference } from '../types/settings'
import { formatMoney } from '../utils/format'

function Settings() {
  const [settings, setSettings] =
  useState<CRFISSettings>(() => {
    const saved = localStorage.getItem('crfis-settings')

    if (!saved) {
      return demoSettings
    }

    try {
      return JSON.parse(saved) as CRFISSettings
    } catch {
      return demoSettings
    }
  })

  const [saved, setSaved] = useState(false)

  const updateTheme = (theme: ThemePreference) => {
    setSettings((current) => ({
      ...current,
      theme,
    }))

    setSaved(false)
  }

  const toggleGovernance = (
    key: keyof CRFISSettings['governance'],
  ) => {
    setSettings((current) => ({
      ...current,
      governance: {
        ...current.governance,
        [key]: !current.governance[key],
      },
    }))

    setSaved(false)
  }

  const toggleAI = (key: keyof CRFISSettings['ai']) => {
    setSettings((current) => ({
      ...current,
      ai: {
        ...current.ai,
        [key]: !current.ai[key],
      },
    }))

    setSaved(false)
  }

  const handleSave = () => {
    localStorage.setItem(
      'crfis-settings',
      JSON.stringify(settings),
    )

    setSaved(true)
  }

  return (
    <div className="page">
      <header className="page-intro settings-intro">
        <div>
          <span className="eyebrow">PLATFORM CONFIGURATION</span>

          <h2>Settings</h2>

          <p>
            Local configuration for CRFIS workspace preferences, risk
            thresholds, governance controls, and AI decision-support
            behavior. Settings are stored in this browser only; no server
            persistence or production-system control exists yet.
          </p>
        </div>

        <div className="settings-actions">
          <span className="status-pill">
            <span className="status-dot" />
            DEMO ENVIRONMENT
          </span>

          <button
            className="primary-button"
            type="button"
            onClick={handleSave}
          >
            Save Settings
          </button>
        </div>
      </header>

      {saved && (
        <div className="settings-saved">
          Settings saved locally for this demonstration environment.
        </div>
      )}

      <section className="notice">
        <div className="notice-icon" aria-hidden="true">i</div>

        <div>
          <strong>Local configuration only</strong>

          <p>
            These values are stored in this browser for demonstration and
            planning purposes. They do not change production risk
            calculations, security controls, or connected enterprise
            systems, and no authentication governs them yet.
          </p>
        </div>
      </section>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="eyebrow">PLATFORM</span>
            <h2>Workspace</h2>
          </div>

          <div className="settings-fields">
            <div className="settings-field">
              <span>Workspace Name</span>
              <strong>{settings.platform.workspaceName}</strong>
            </div>

            <div className="settings-field">
              <span>Environment</span>
              <strong>{settings.platform.environment}</strong>
            </div>

            <div className="settings-field">
              <span>CRFIS Version</span>
              <strong>{settings.platform.version}</strong>
            </div>

            <div className="settings-field">
              <span>Data Connection</span>
              <strong>{settings.platform.dataConnection}</strong>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <span className="eyebrow">APPEARANCE</span>
            <h2>Theme Preference</h2>
          </div>

          <div className="theme-options">
            {(['light', 'dark', 'system'] as ThemePreference[]).map(
              (theme) => (
                <button
                  key={theme}
                  className={`theme-option ${
                    settings.theme === theme ? 'selected' : ''
                  }`}
                  type="button"
                  onClick={() => updateTheme(theme)}
                >
                  <span>
                    {theme === 'light'
                      ? '☀'
                      : theme === 'dark'
                        ? '◐'
                        : '◌'}
                  </span>

                  <strong>
                    {theme.charAt(0).toUpperCase() +
                      theme.slice(1)}
                  </strong>

                  <small>
                    {theme === 'light'
                      ? 'Use the light CRFIS interface'
                      : theme === 'dark'
                        ? 'Use the dark CRFIS interface'
                        : 'Follow system preference'}
                  </small>
                </button>
              ),
            )}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <span className="eyebrow">RISK CONFIGURATION</span>
            <h2>Financial Risk Thresholds</h2>
          </div>

          <div className="settings-fields">
            <div className="settings-field">
              <span>Critical Threshold</span>
              <strong>
                {formatMoney(settings.risk.criticalThreshold.amount, {
                  compact: true,
                })}
                + · {settings.risk.criticalThreshold.description}
              </strong>
            </div>

            <div className="settings-field">
              <span>High Threshold</span>
              <strong>
                {formatMoney(settings.risk.highThreshold.amount, {
                  compact: true,
                })}
                + · {settings.risk.highThreshold.description}
              </strong>
            </div>

            <div className="settings-field settings-field-wide">
              <span>Financial Impact Model</span>
              <strong>{settings.risk.financialModel}</strong>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <span className="eyebrow">GOVERNANCE</span>
            <h2>Control Requirements</h2>
          </div>

          <div className="settings-toggle-list">
            <label className="settings-toggle">
              <div>
                <strong>Approval Required</strong>
                <span>
                  Require human approval for governance decisions.
                </span>
              </div>

              <input
                type="checkbox"
                checked={settings.governance.approvalRequired}
                onChange={() =>
                  toggleGovernance('approvalRequired')
                }
              />
            </label>

            <label className="settings-toggle">
              <div>
                <strong>Evidence Required</strong>
                <span>
                  Maintain evidence requirements for audit readiness.
                </span>
              </div>

              <input
                type="checkbox"
                checked={settings.governance.evidenceRequired}
                onChange={() =>
                  toggleGovernance('evidenceRequired')
                }
              />
            </label>

            <label className="settings-toggle">
              <div>
                <strong>Audit Tracking</strong>
                <span>
                  Track governance and audit activity across CRFIS.
                </span>
              </div>

              <input
                type="checkbox"
                checked={settings.governance.auditTracking}
                onChange={() =>
                  toggleGovernance('auditTracking')
                }
              />
            </label>
          </div>
        </section>

        <section className="settings-card settings-card-wide">
          <div className="settings-card-header">
            <span className="eyebrow">AI GOVERNANCE</span>
            <h2>Decision Support Controls</h2>
          </div>

          <div className="settings-toggle-list">
            <label className="settings-toggle">
              <div>
                <strong>Demonstration AI Mode</strong>
                <span>
                  Keep AI responses isolated from production systems.
                </span>
              </div>

              <input
                type="checkbox"
                checked={settings.ai.demoMode}
                onChange={() => toggleAI('demoMode')}
              />
            </label>

            <label className="settings-toggle">
              <div>
                <strong>Human Review</strong>
                <span>
                  Keep human review in the AI decision-support loop.
                </span>
              </div>

              <input
                type="checkbox"
                checked={settings.ai.humanReview}
                onChange={() => toggleAI('humanReview')}
              />
            </label>

            <label className="settings-toggle">
              <div>
                <strong>Decision Support Only</strong>
                <span>
                  Prevent AI from being treated as an autonomous
                  decision-maker.
                </span>
              </div>

              <input
                type="checkbox"
                checked={settings.ai.decisionSupportOnly}
                onChange={() => toggleAI('decisionSupportOnly')}
              />
            </label>
          </div>
        </section>
      </div>

      <section className="intelligence-panel">
        <div className="intelligence-icon">↗</div>

        <div>
          <span className="eyebrow">PLATFORM GOVERNANCE</span>

          <h2>
            Configuration should support accountable decisions.
          </h2>

          <p>
            CRFIS settings will eventually control enterprise
            configuration, governance workflows, financial modeling,
            integrations, access policies, and AI governance.
          </p>
        </div>

        <span className="chip chip--muted">
          HUMAN-IN-THE-LOOP
        </span>
      </section>
    </div>
  )
}

export default Settings
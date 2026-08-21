import { demoRisks } from '../data/demoRisks'
import { demoRemediations } from '../data/demoRemediations'
import { calculateTotalExposure, calculateRemediationOpportunity } from '../utils/financialMetrics'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function Overview() {
  const totalExposure = calculateTotalExposure(demoRisks)

  const criticalRisks = demoRisks.filter(
    (risk) => risk.severity === 'Critical',
  ).length

  const remediationOpportunity =
    calculateRemediationOpportunity(demoRemediations)

  return (
    <>
      <section className="welcome">
        <div>
          <span className="status-pill">
            <span className="status-dot" />
            DEMO ENVIRONMENT
          </span>

          <h2>Financial Risk Intelligence</h2>

          <p>
            Translate cybersecurity exposure into financial impact,
            prioritize remediation, and give leadership a clear view of
            risk investment decisions.
          </p>
        </div>
      </section>

      <section className="metrics" aria-label="Financial risk metrics">
        <article className="metric-card">
          <span>Total Financial Exposure</span>
          <strong>{formatCurrency(totalExposure)}</strong>
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
          <strong>{String(criticalRisks).padStart(2, '0')}</strong>
          <small>DEMO / PLACEHOLDER</small>

          <div className="metric-trend">
            Requires attention
          </div>
        </article>

        <article className="metric-card">
          <span>Remediation Opportunity</span>
          <strong>{formatCurrency(remediationOpportunity)}</strong>
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
              {demoRisks.slice(0, 3).map((risk) => (
                <tr key={risk.id}>
                  <td>
                    <strong>{risk.risk}</strong>
                  </td>

                  <td>{risk.asset}</td>

                  <td>
                    <span
                      className={`severity ${risk.severity.toLowerCase()}`}
                    >
                      {risk.severity}
                    </span>
                  </td>

                  <td>
                    {formatCurrency(risk.exposure)}
                  </td>

                  <td>{risk.status}</td>
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
            CRFIS connects cybersecurity findings, asset criticality,
            probability, financial loss, remediation cost, and business
            context into one decision-ready view.
          </p>
        </div>
      </section>
    </>
  )
}

export default Overview
import { demoRisks } from '../data/demoRisks'
import { demoRemediations } from '../data/demoRemediations'
import {
  calculateTotalExposure,
  calculateRemediationOpportunity,
  calculateRemediationCost,
  calculateNetRemediationBenefit,
  calculateReductionToCostRatio,
  calculateRemainingExposure,
} from '../utils/financialMetrics'

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

  const remediationCost =
    calculateRemediationCost(demoRemediations)

  const netRemediationBenefit =
    calculateNetRemediationBenefit(demoRemediations)

  const reductionToCostRatio =
    calculateReductionToCostRatio(demoRemediations)

  const remainingExposure =
    calculateRemainingExposure(demoRisks, demoRemediations)

  /*
   * CRFIS demo ALE assumption:
   * 25% of total financial exposure.
   *
   * This is an illustrative demonstration metric,
   * not a production loss model.
   */
  const annualizedLossExpectancy = totalExposure * 0.25

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

          <strong>{formatCurrency(annualizedLossExpectancy)}</strong>

          <small>DEMO / ILLUSTRATIVE MODEL</small>

          <div className="metric-trend">
            25% illustrative exposure factor
          </div>
        </article>

        <article className="metric-card accent">
          <span>Critical Risks</span>

          <strong>
            {String(criticalRisks).padStart(2, '0')}
          </strong>

          <small>DEMO / PLACEHOLDER</small>

          <div className="metric-trend">
            Requires attention
          </div>
        </article>

        <article className="metric-card">
          <span>Remediation Opportunity</span>

          <strong>
            {formatCurrency(remediationOpportunity)}
          </strong>

          <small>DEMO / PLACEHOLDER</small>

          <div className="metric-trend">
            Potential exposure reduction
          </div>
        </article>
      </section>

      <section className="metrics" aria-label="Remediation financial metrics">
        <article className="metric-card">
          <span>Remaining Demo Exposure</span>

          <strong>
            {formatCurrency(remainingExposure)}
          </strong>

          <small>DEMO / ILLUSTRATIVE</small>

          <div className="metric-trend">
            Exposure after modeled reductions
          </div>
        </article>

        <article className="metric-card">
          <span>Remediation Cost</span>

          <strong>
            {formatCurrency(remediationCost)}
          </strong>

          <small>DEMO / PLACEHOLDER</small>

          <div className="metric-trend">
            Estimated implementation cost
          </div>
        </article>

        <article className="metric-card">
          <span>Net Remediation Benefit</span>

          <strong>
            {formatCurrency(netRemediationBenefit)}
          </strong>

          <small>DEMO / ILLUSTRATIVE</small>

          <div className="metric-trend">
            Reduction minus remediation cost
          </div>
        </article>

        <article className="metric-card">
          <span>Reduction / Cost Ratio</span>

          <strong>
            {reductionToCostRatio.toFixed(2)}x
          </strong>

          <small>DEMO / ILLUSTRATIVE</small>

          <div className="metric-trend">
            Expected reduction per $1 of cost
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
              {demoRisks
                .slice()
                .sort((a, b) => b.exposure - a.exposure)
                .slice(0, 3)
                .map((risk) => (
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
        <div className="intelligence-icon">
          ↗
        </div>

        <div>
          <span className="eyebrow">
            EXECUTIVE INTELLIGENCE
          </span>

          <h2>
            From technical findings to financial decisions.
          </h2>

                    <p>
            Current demo modeling indicates a total exposure of{' '}
            <strong>{formatCurrency(totalExposure)}</strong>, with{' '}
            <strong>{criticalRisks}</strong> critical risks requiring
            attention.
          </p>

          <p>
            The modeled remediation portfolio represents{' '}
            <strong>{formatCurrency(remediationOpportunity)}</strong> of
            potential exposure reduction against an estimated implementation
            cost of{' '}
            <strong>{formatCurrency(remediationCost)}</strong>.
          </p>

          <p>
            That produces an illustrative net benefit of{' '}
            <strong>{formatCurrency(netRemediationBenefit)}</strong> and a{' '}
            <strong>{reductionToCostRatio.toFixed(2)}x</strong> reduction-to-cost
            ratio.
          </p>

          <p className="demo-disclaimer">
            These figures are demonstration calculations only and are not
            production financial, actuarial, security, or risk assessments.
          </p>
        </div>
      </section>
    </>
  )
}

export default Overview
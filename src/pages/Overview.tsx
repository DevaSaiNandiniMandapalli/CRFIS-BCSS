import { demoRisks } from '../data/demoRisks'
import { demoRemediations } from '../data/demoRemediations'
import { toMoney } from '../types/money'
import {
  calculateTotalExposure,
  calculateRemediationOpportunity,
  calculateRemediationCost,
  calculateNetRemediationBenefit,
  calculateReductionToCostRatio,
  calculateRemainingExposure,
  calculateAnnualizedLossExpectancy,
} from '../utils/financialMetrics'
import { formatMoneyOrDash, formatRatio, slugify } from '../utils/format'

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
  const annualizedLossExpectancy =
    calculateAnnualizedLossExpectancy(demoRisks)

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

      <section className="kpi-grid" aria-label="Financial risk metrics">
        <article className="kpi-card">
          <span className="kpi-label">Total Financial Exposure</span>

          <strong className="kpi-value">
            {formatMoneyOrDash(totalExposure)}
          </strong>

          <small className="kpi-note">Demo / placeholder</small>

          <div className="kpi-trend">
            Illustrative exposure
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Annualized Loss Expectancy</span>

          <strong className="kpi-value">
            {formatMoneyOrDash(annualizedLossExpectancy)}
          </strong>

          <small className="kpi-note">Demo / illustrative model</small>

          <div className="kpi-trend">
            25% illustrative exposure factor
          </div>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Critical Risks</span>

          <strong className="kpi-value">{criticalRisks}</strong>

          <small className="kpi-note">Requires attention</small>

          <div className="kpi-trend">
            Demo / placeholder count
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Remediation Opportunity</span>

          <strong className="kpi-value">
            {formatMoneyOrDash(remediationOpportunity)}
          </strong>

          <small className="kpi-note">Demo / placeholder</small>

          <div className="kpi-trend">
            Potential exposure reduction
          </div>
        </article>
      </section>

      <section
        className="kpi-grid"
        aria-label="Remediation financial metrics"
      >
        <article className="kpi-card">
          <span className="kpi-label">Remaining Demo Exposure</span>

          <strong className="kpi-value">
            {formatMoneyOrDash(remainingExposure)}
          </strong>

          <small className="kpi-note">Demo / illustrative</small>

          <div className="kpi-trend">
            Exposure after modeled reductions
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Remediation Cost</span>

          <strong className="kpi-value">
            {formatMoneyOrDash(remediationCost)}
          </strong>

          <small className="kpi-note">Demo / placeholder</small>

          <div className="kpi-trend">
            Estimated implementation cost
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Net Remediation Benefit</span>

          <strong className="kpi-value">
            {formatMoneyOrDash(netRemediationBenefit)}
          </strong>

          <small className="kpi-note">Demo / illustrative</small>

          <div className="kpi-trend">
            Reduction minus remediation cost
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Reduction / Cost Ratio</span>

          <strong className="kpi-value">
            {formatRatio(reductionToCostRatio)}
          </strong>

          <small className="kpi-note">Demo / illustrative</small>

          <div className="kpi-trend">
            Expected reduction per unit of cost
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

      <section className="data-panel">
        <div className="data-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Risk</th>
                <th scope="col">Asset</th>
                <th scope="col">Severity</th>
                <th scope="col" className="money">
                  Estimated Exposure
                </th>
                <th scope="col">Status</th>
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
                      <div className="cell-stack">
                        <strong>{risk.risk}</strong>
                      </div>
                    </td>

                    <td>{risk.asset}</td>

                    <td>
                      <span
                        className={`badge badge--${slugify(risk.severity)}`}
                      >
                        {risk.severity}
                      </span>
                    </td>

                    <td className="money">
                      {formatMoneyOrDash(
                        toMoney(risk.exposure, risk.currency),
                      )}
                    </td>

                    <td>{risk.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="intelligence-panel">
        <div className="intelligence-icon" aria-hidden="true">
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
            <strong>{formatMoneyOrDash(totalExposure)}</strong>, with{' '}
            <strong>{criticalRisks}</strong> critical risks requiring
            attention.
          </p>

          <p>
            The modeled remediation portfolio represents{' '}
            <strong>{formatMoneyOrDash(remediationOpportunity)}</strong> of
            potential exposure reduction against an estimated implementation
            cost of{' '}
            <strong>{formatMoneyOrDash(remediationCost)}</strong>.
          </p>

          <p>
            That produces an illustrative net benefit of{' '}
            <strong>{formatMoneyOrDash(netRemediationBenefit)}</strong> and a{' '}
            <strong>{formatRatio(reductionToCostRatio)}</strong>{' '}
            reduction-to-cost ratio.
          </p>

          <p className="disclaimer">
            These figures are demonstration calculations only and are not
            production financial, actuarial, security, or risk assessments.
          </p>
        </div>
      </section>
    </>
  )
}

export default Overview

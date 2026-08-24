import { useMemo } from 'react'
import { useApiResource } from '../hooks/useApiResource'
import { formatMoneyOrDash, formatRatio, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import type { CurrencyCode } from '../types/money'
import type { OverviewResponse, RiskListResponse } from '../types/api'
import type { RiskDto } from '../types/api'
import { EmptyState } from '../components/States'

/** Renders per-currency totals without ever mixing currencies. */
function formatCurrencyBuckets(
  buckets: Record<string, string> | null | undefined,
): string {
  const entries = Object.entries(buckets ?? {})

  if (entries.length === 0) {
    return '—'
  }

  return entries
    .map(([currency, amount]) => formatMoneyOrDash(toMoney(amount, currency as CurrencyCode)))
    .join('  +  ')
}

/** Renders per-currency ratios (unitless), keeping currencies separate. */
function formatRatioBuckets(buckets: Record<string, number> | null | undefined): string {
  const entries = Object.entries(buckets ?? {})

  if (entries.length === 0) {
    return '—'
  }

  return entries.map(([currency, ratio]) => `${currency} ${formatRatio(ratio)}`).join('  +  ')
}

function Overview() {
  const overviewUrl = '/api/overview'

  // Priority exposures: top real risks by exposure.
  const risksUrl = '/api/risks?pageSize=3&sort=exposure&order=desc'

  const { data: overviewData, loading, error, reload } =
    useApiResource<OverviewResponse>(overviewUrl)

  const { data: riskPage } = useApiResource<RiskListResponse>(risksUrl)

  const topRisks = useMemo(() => riskPage?.data ?? [], [riskPage])

  return (
    <>
      <section className="welcome">
        <div>
          <span className="status-pill">
            <span className="status-dot" />
            LIVE ENVIRONMENT
          </span>

          <h2>Financial Risk Intelligence</h2>

          <p>
            Translate cybersecurity exposure into financial impact,
            prioritize remediation, and give leadership a clear view of
            risk investment decisions.
          </p>
        </div>
      </section>

      {loading && (
        <section aria-label="Loading overview">
          <div className="state-block loading-state" role="status">
            <span className="state-icon" aria-hidden="true">◐</span>
            <strong>Loading executive overview...</strong>
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="notice">
          <span className="notice-icon" aria-hidden="true">!</span>

          <div>
            <strong>Executive overview could not be loaded.</strong>

            <p>{error}</p>

            <button
              className="secondary-button"
              type="button"
              onClick={reload}
            >
              Retry
            </button>
          </div>
        </section>
      )}

      {!loading && !error && overviewData && (
        <>
          <section className="kpi-grid" aria-label="Financial risk metrics">
            <article className="kpi-card">
              <span className="kpi-label">Total Financial Exposure</span>

              <strong className="kpi-value">
                {formatCurrencyBuckets(overviewData.exposureByCurrency)}
              </strong>

              <small className="kpi-note">Risk register, per currency</small>

              <div className="kpi-trend">
                {overviewData.riskCount} risks on record
              </div>
            </article>

            <article className="kpi-card">
              <span className="kpi-label">Annualized Loss Expectancy</span>

              <strong className="kpi-value">
                {formatCurrencyBuckets(overviewData.annualizedLossExpectancyByCurrency)}
              </strong>

              <small className="kpi-note">Illustrative 25% exposure factor</small>

              <div className="kpi-trend">
                Not a production loss model
              </div>
            </article>

            <article className="kpi-card accent">
              <span className="kpi-label">Critical Risks</span>

              <strong className="kpi-value">{overviewData.criticalRiskCount}</strong>

              <small className="kpi-note">Requires attention</small>

              <div className="kpi-trend">
                Live severity counts
              </div>
            </article>

            <article className="kpi-card">
              <span className="kpi-label">Remediation Opportunity</span>

              <strong className="kpi-value">
                {formatCurrencyBuckets(overviewData.remediationOpportunityByCurrency)}
              </strong>

              <small className="kpi-note">Expected reduction, per currency</small>

              <div className="kpi-trend">
                {overviewData.openRemediationCount} open actions
              </div>
            </article>
          </section>

          <section
            className="kpi-grid"
            aria-label="Remediation financial metrics"
          >
            <article className="kpi-card">
              <span className="kpi-label">Remaining Exposure</span>

              <strong className="kpi-value">
                {formatCurrencyBuckets(overviewData.remainingExposureByCurrency)}
              </strong>

              <small className="kpi-note">Per currency after reductions</small>

              <div className="kpi-trend">
                Exposure minus modeled reduction
              </div>
            </article>

            <article className="kpi-card">
              <span className="kpi-label">Remediation Cost</span>

              <strong className="kpi-value">
                {formatCurrencyBuckets(overviewData.remediationCostByCurrency)}
              </strong>

              <small className="kpi-note">Estimated implementation cost</small>

              <div className="kpi-trend">
                Per currency
              </div>
            </article>

            <article className="kpi-card">
              <span className="kpi-label">Net Remediation Benefit</span>

              <strong className="kpi-value">
                {formatCurrencyBuckets(overviewData.netRemediationBenefitByCurrency)}
              </strong>

              <small className="kpi-note">Reduction minus cost, per currency</small>

              <div className="kpi-trend">
                Never mixed across currencies
              </div>
            </article>

            <article className="kpi-card">
              <span className="kpi-label">Reduction / Cost Ratio</span>

              <strong className="kpi-value">
                {formatRatioBuckets(overviewData.reductionCostRatioByCurrency)}
              </strong>

              <small className="kpi-note">Expected reduction per unit of cost</small>

              <div className="kpi-trend">
                Computed within each currency
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
                  {topRisks.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          title="No risks recorded yet."
                          message="The CRFIS database does not contain any risks yet."
                        />
                      </td>
                    </tr>
                  )}

                  {topRisks.map((risk: RiskDto) => (
                    <tr key={risk.id}>
                      <td>
                        <div className="cell-stack">
                          <strong>{risk.risk}</strong>
                        </div>
                      </td>

                      <td>{risk.asset?.name ?? 'Unknown asset'}</td>

                      <td>
                        <span
                          className={`badge badge--${slugify(risk.severity)}`}
                        >
                          {risk.severity}
                        </span>
                      </td>

                      <td className="money">
                        {formatMoneyOrDash(toMoney(risk.exposure, risk.currency))}
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
                CRFIS connects cybersecurity findings, asset
                criticality, probability, financial loss,
                remediation cost, and business context into one
                decision-ready view. All monetary aggregates are
                reported per currency and are never combined across
                currencies.
              </p>

              <p className="disclaimer">
                Figures are computed live from the CRFIS database. The
                annualized loss expectancy uses an illustrative 25% factor
                and is not a production financial, actuarial, security, or
                risk assessment.
              </p>
            </div>
          </section>
        </>
      )}
    </>
  )
}

export default Overview

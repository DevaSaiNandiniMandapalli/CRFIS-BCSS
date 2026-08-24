import { useMemo, useState } from 'react'
import { demoInsurance } from '../data/demoInsurance'
import { demoAssets } from '../data/demoAssets'
import { demoRisks } from '../data/demoRisks'
import {
  calculateTotalInsuranceCoverage,
  calculateTotalInsurancePremium,
  calculateTotalInsuranceDeductible,
  calculateInsuranceCoverageGap,
} from '../utils/financialMetrics'
import { formatDate, formatMoneyOrDash, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import { EmptyState } from '../components/States'
import type {
  InsuranceCoverageType,
  InsuranceStatus,
} from '../types/insurance'

function InsuranceRegister() {
  const [search, setSearch] = useState('')
  const [status, setStatus] =
    useState<InsuranceStatus | 'All'>('All')
  const [coverageType, setCoverageType] =
    useState<InsuranceCoverageType | 'All'>('All')

  const assetById = useMemo(
    () => new Map(demoAssets.map((asset) => [asset.id, asset])),
    [],
  )

  const filteredPolicies = useMemo(() => {
    const query = search.trim().toLowerCase()

    return demoInsurance.filter((policy) => {
      const assetNames = policy.assetIds
        .map((assetId) => assetById.get(assetId)?.name ?? assetId)
        .join(' ')

      const matchesSearch =
        !query ||
        policy.policyNumber.toLowerCase().includes(query) ||
        policy.provider.toLowerCase().includes(query) ||
        policy.coverageType.toLowerCase().includes(query) ||
        assetNames.toLowerCase().includes(query)

      const matchesStatus =
        status === 'All' || policy.status === status

      const matchesCoverage =
        coverageType === 'All' ||
        policy.coverageType === coverageType

      return matchesSearch && matchesStatus && matchesCoverage
    })
  }, [search, status, coverageType, assetById])

  const activeCount = demoInsurance.filter(
    (policy) => policy.status === 'Active',
  ).length

  const expiringCount = demoInsurance.filter(
    (policy) => policy.status === 'Expiring Soon',
  ).length

  const reviewCount = demoInsurance.filter(
    (policy) => policy.status === 'Under Review',
  ).length

  const totalCoverage =
    calculateTotalInsuranceCoverage(demoInsurance)

  const totalPremium =
    calculateTotalInsurancePremium(demoInsurance)

  const totalDeductible =
    calculateTotalInsuranceDeductible(demoInsurance)

  const coverageGap =
    calculateInsuranceCoverageGap(demoRisks, demoInsurance)

  const clearFilters = () => {
    setSearch('')
    setStatus('All')
    setCoverageType('All')
  }

  const hasFilters =
    search !== '' ||
    status !== 'All' ||
    coverageType !== 'All'

  return (
    <section className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <div className="page-title-row">
            <h2>Insurance Portfolio</h2>
            <span className="chip">DEMO DATA</span>
          </div>

          <p>
            Track cyber insurance coverage, policy limits,
            deductibles, premiums, and coverage status.
          </p>
        </div>

        <button className="primary-button" type="button">
          + Add Policy
        </button>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Active Policies</span>
          <strong className="kpi-value">{activeCount}</strong>
          <small className="kpi-note">Demo / placeholder</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Expiring Soon</span>
          <strong className="kpi-value">{expiringCount}</strong>
          <small className="kpi-note">Requires attention</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-value">{reviewCount}</strong>
          <small className="kpi-note">Coverage assessment</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Total Coverage</span>
          <strong className="kpi-value">
            {formatMoneyOrDash(totalCoverage)}
          </strong>
          <small className="kpi-note">Fictional placeholder value</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Annual Premium</span>
          <strong className="kpi-value">
            {formatMoneyOrDash(totalPremium)}
          </strong>
          <small className="kpi-note">Fictional placeholder value</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

        <div>
          <strong>Demonstration environment</strong>

          <p>
            All insurance policies, coverage limits, premiums,
            deductibles, and dates on this screen are fictional
            placeholder data for CRFIS interface development.
            They are not real insurance policies or coverage advice.
          </p>
        </div>
      </div>

      <div className="toolbar" role="group" aria-label="Policy filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search policies, providers, coverage, assets..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search insurance policies"
          />
        </label>

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as InsuranceStatus | 'All')
          }
          aria-label="Filter by policy status"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Expiring Soon">Expiring Soon</option>
          <option value="Under Review">Under Review</option>
          <option value="Pending">Pending</option>
        </select>

        <select
          value={coverageType}
          onChange={(event) =>
            setCoverageType(
              event.target.value as InsuranceCoverageType | 'All',
            )
          }
          aria-label="Filter by coverage type"
        >
          <option value="All">All Coverage Types</option>
          <option value="Cyber Liability">Cyber Liability</option>
          <option value="Business Interruption">
            Business Interruption
          </option>
          <option value="Data Breach">Data Breach</option>
          <option value="Ransomware">Ransomware</option>
          <option value="Technology Errors & Omissions">
            Technology Errors &amp; Omissions
          </option>
        </select>

        {hasFilters && (
          <button
            className="secondary-button"
            type="button"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>

      <div className="data-panel">
        <div className="data-table-header">
          <div>
            <strong>Insurance Inventory</strong>

            <span>
              Showing {filteredPolicies.length} of{' '}
              {demoInsurance.length} demo policies
            </span>
          </div>

          <span className="chip chip--muted">
            PLACEHOLDER DATA
          </span>
        </div>

        <div className="data-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Policy</th>
                <th scope="col">Provider</th>
                <th scope="col">Coverage</th>
                <th scope="col" className="money">
                  Coverage Limit
                </th>
                <th scope="col" className="money">
                  Deductible
                </th>
                <th scope="col">Expiration</th>
                <th scope="col">Status</th>
                <th scope="col">Covered Assets</th>
              </tr>
            </thead>

            <tbody>
              {filteredPolicies.map((policy) => (
                <tr key={policy.id}>
                  <td>
                    <div className="cell-stack">
                      <strong>{policy.policyNumber}</strong>
                      <span>{policy.id}</span>
                    </div>
                  </td>

                  <td>{policy.provider}</td>

                  <td>{policy.coverageType}</td>

                  <td className="money">
                    {formatMoneyOrDash(
                      toMoney(policy.coverageLimit, policy.currency),
                    )}
                  </td>

                  <td className="money">
                    {formatMoneyOrDash(
                      toMoney(policy.deductible, policy.currency),
                    )}
                  </td>

                  <td>{formatDate(policy.expirationDate)}</td>

                  <td>
                    <span
                      className={`badge badge--${slugify(policy.status)}`}
                    >
                      {policy.status}
                    </span>
                  </td>

                  <td>
                    <div className="cell-stack">
                      <strong>
                        {policy.assetIds.length} assets
                      </strong>

                      <span>
                        {policy.assetIds
                          .map(
                            (assetId) =>
                              assetById.get(assetId)?.name ?? assetId,
                          )
                          .join(', ')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredPolicies.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No policies match the current filters."
                      message="Try changing the search or filter selections."
                      action={
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="intelligence-panel">
        <div className="intelligence-icon" aria-hidden="true">↗</div>

        <div>
          <span className="eyebrow">
            INSURANCE INTELLIGENCE
          </span>

          <h2>
            Compare insurance protection with financial exposure.
          </h2>

          <p>
            CRFIS connects risk exposure, insurance limits,
            deductibles, premiums, and residual exposure to help
            leadership understand potential coverage gaps.
          </p>
        </div>

        <div className="intelligence-metrics">
          <div className="intelligence-metric">
            <span>DEMO TOTAL COVERAGE</span>

            <strong>
              {formatMoneyOrDash(totalCoverage)}
            </strong>
          </div>

          <div className="intelligence-metric">
            <span>DEMO TOTAL DEDUCTIBLE</span>

            <strong>
              {formatMoneyOrDash(totalDeductible)}
            </strong>
          </div>

          <div className="intelligence-metric">
            <span>DEMO COVERAGE GAP</span>

            <strong>
              {formatMoneyOrDash(coverageGap)}
            </strong>
          </div>
        </div>
      </div>
    </section>
  )
}

export default InsuranceRegister

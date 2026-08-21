import { useMemo, useState } from 'react'
import { demoInsurance } from '../data/demoInsurance'
import { demoAssets } from '../data/demoAssets'
import type {
  InsuranceCoverageType,
  InsuranceStatus,
} from '../types/insurance'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

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

  const totalCoverage = demoInsurance.reduce(
    (total, policy) => total + policy.coverageLimit,
    0,
  )

  const totalPremium = demoInsurance.reduce(
    (total, policy) => total + policy.premium,
    0,
  )

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
    <section className="insurance-page">
      <div className="module-heading">
        <div>
          <div className="module-title-row">
            <h2>Insurance Portfolio</h2>
            <span className="demo-badge">DEMO DATA</span>
          </div>

          <p>
            Track cyber insurance coverage, policy limits,
            deductibles, premiums, and coverage status.
          </p>
        </div>

        <button className="primary-button" type="button">
          + Add Policy
        </button>
      </div>

      <div className="risk-kpis">
        <article className="risk-kpi">
          <span>ACTIVE POLICIES</span>
          <strong>{activeCount}</strong>
          <small>DEMO / PLACEHOLDER</small>
        </article>

        <article className="risk-kpi critical-kpi">
          <span>EXPIRING SOON</span>
          <strong>{expiringCount}</strong>
          <small>Requires attention</small>
        </article>

        <article className="risk-kpi high-kpi">
          <span>UNDER REVIEW</span>
          <strong>{reviewCount}</strong>
          <small>Coverage assessment</small>
        </article>

        <article className="risk-kpi">
          <span>TOTAL COVERAGE</span>
          <strong>{currencyFormatter.format(totalCoverage)}</strong>
          <small>Fictional placeholder value</small>
        </article>

        <article className="risk-kpi exposure-kpi">
          <span>ANNUAL PREMIUM</span>
          <strong>{currencyFormatter.format(totalPremium)}</strong>
          <small>Fictional placeholder value</small>
        </article>
      </div>

      <div className="demo-notice">
        <span className="demo-notice-icon">i</span>

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

      <div className="risk-toolbar">
        <label className="risk-search">
          <span>⌕</span>

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
            className="clear-filters"
            type="button"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>

      <div className="risk-register-table">
        <div className="table-header">
          <div>
            <strong>Insurance Inventory</strong>

            <span>
              Showing {filteredPolicies.length} of{' '}
              {demoInsurance.length} demo policies
            </span>
          </div>

          <span className="table-demo-label">
            PLACEHOLDER DATA
          </span>
        </div>

        <div className="risk-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Policy</th>
                <th>Provider</th>
                <th>Coverage</th>
                <th>Coverage Limit</th>
                <th>Deductible</th>
                <th>Expiration</th>
                <th>Status</th>
                <th>Covered Assets</th>
              </tr>
            </thead>

            <tbody>
              {filteredPolicies.map((policy) => (
                <tr key={policy.id}>
                  <td>
                    <div className="risk-name">
                      <strong>{policy.policyNumber}</strong>
                      <span>{policy.id}</span>
                    </div>
                  </td>

                  <td>{policy.provider}</td>

                  <td>{policy.coverageType}</td>

                  <td className="financial-value">
                    {currencyFormatter.format(policy.coverageLimit)}
                  </td>

                  <td className="financial-value">
                    {currencyFormatter.format(policy.deductible)}
                  </td>

                  <td>{policy.expirationDate}</td>

                  <td>
                    <span
                      className={`risk-status ${policy.status
                        .toLowerCase()
                        .replaceAll(' ', '-')}`}
                    >
                      {policy.status}
                    </span>
                  </td>

                  <td>
                    <div className="risk-name">
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
                    <div className="risk-empty-state">
                      <strong>
                        No policies match the current filters.
                      </strong>

                      <span>
                        Try changing the search or filter selections.
                      </span>

                      <button
                        className="secondary-button"
                        type="button"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="intelligence-panel">
        <div className="intelligence-icon">↗</div>

        <div>
          <span className="eyebrow">INSURANCE INTELLIGENCE</span>

          <h2>
            Compare insurance protection with financial exposure.
          </h2>

          <p>
            CRFIS will eventually connect risk exposure, insurance
            limits, deductibles, and residual risk to help leadership
            understand potential coverage gaps.
          </p>
        </div>

        <div className="intelligence-metric">
          <span>DEMO TOTAL COVERAGE</span>
          <strong>
            {currencyFormatter.format(totalCoverage)}
          </strong>
        </div>
      </div>
    </section>
  )
}

export default InsuranceRegister
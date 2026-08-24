import { useMemo, useState } from 'react'
import { useApiResource, useDebouncedValue } from '../hooks/useApiResource'
import { formatDate, formatMoneyOrDash, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import type {
  InsuranceListResponse,
  InsurancePolicyDto,
} from '../types/api'
import type {
  InsuranceCoverageType,
  InsuranceStatus,
} from '../types/insurance'
import { EmptyState, ErrorState, LoadingState } from '../components/States'

const PAGE_SIZE = 20

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }

  return search.toString()
}

/** Renders per-currency totals without ever mixing currencies. */
function formatCurrencyBuckets(buckets: Record<string, string> | undefined): string {
  const entries = Object.entries(buckets ?? {})

  if (entries.length === 0) {
    return '—'
  }

  return entries
    .map(([currency, amount]) =>
      formatMoneyOrDash(toMoney(amount, currency as InsurancePolicyDto['currency'])),
    )
    .join('  +  ')
}

function InsuranceRegister() {
  const [search, setSearch] = useState('')
  const [status, setStatus] =
    useState<InsuranceStatus | 'All'>('All')
  const [coverageType, setCoverageType] =
    useState<InsuranceCoverageType | 'All'>('All')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search)

  const url = useMemo(() => {
    const query = buildQuery({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: status === 'All' ? undefined : status,
      coverageType: coverageType === 'All' ? undefined : coverageType,
    })

    return `/api/insurance?${query}`
  }, [page, debouncedSearch, status, coverageType])

  const { data, loading, error, reload } =
    useApiResource<InsuranceListResponse>(url)

  const policies = data?.data ?? []
  const meta = data?.meta
  const stats = meta?.stats

  const clearFilters = () => {
    setSearch('')
    setStatus('All')
    setCoverageType('All')
    setPage(1)
  }

  const hasFilters =
    search !== '' ||
    status !== 'All' ||
    coverageType !== 'All'

  // Any filter change returns the user to the first page.
  const updateFilter = <T,>(
    setter: (value: T) => void,
  ) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const setStatusAndReset = updateFilter(setStatus)
  const setCoverageAndReset = updateFilter(setCoverageType)
  const setSearchAndReset = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const showTableContent = !loading && !error

  return (
    <section className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <div className="page-title-row">
            <h2>Insurance Portfolio</h2>
            <span className="chip">LIVE DATA</span>
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
          <strong className="kpi-value">
            {stats?.byStatus['Active'] ?? 0}
          </strong>
          <small className="kpi-note">Matching current filters</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Expiring Soon</span>
          <strong className="kpi-value">
            {stats?.byStatus['Expiring Soon'] ?? 0}
          </strong>
          <small className="kpi-note">Requires attention</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-value">
            {stats?.byStatus['Under Review'] ?? 0}
          </strong>
          <small className="kpi-note">Coverage assessment</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Total Coverage</span>
          <strong className="kpi-value">
            {formatCurrencyBuckets(stats?.coverageLimitByCurrency)}
          </strong>
          <small className="kpi-note">Per currency, never mixed</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Annual Premium</span>
          <strong className="kpi-value">
            {formatCurrencyBuckets(stats?.premiumByCurrency)}
          </strong>
          <small className="kpi-note">Per currency, never mixed</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

        <div>
          <strong>Connected to the CRFIS database</strong>

          <p>
            Policies are served live from the CRFIS database through the
            read-only API with covered assets resolved through the policy
            join table. Monetary amounts keep their record currency; no
            conversion is applied.
          </p>
        </div>
      </div>

      <div className="toolbar" role="group" aria-label="Policy filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search policies, providers, coverage..."
            value={search}
            onChange={(event) => setSearchAndReset(event.target.value)}
            aria-label="Search insurance policies"
          />
        </label>

        <select
          value={status}
          onChange={(event) =>
            setStatusAndReset(event.target.value as InsuranceStatus | 'All')
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
            setCoverageAndReset(
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
              Showing {policies.length} of{' '}
              {meta?.total ?? 0} policies · page{' '}
              {meta?.page ?? 1} of {meta?.pageCount ?? 1}
            </span>
          </div>

          <span className="chip chip--muted">
            LIVE DATABASE
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
              {loading && (
                <tr>
                  <td colSpan={8}>
                    <LoadingState title="Loading policies..." />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={8}>
                    <ErrorState
                      title="Insurance policies could not be loaded."
                      message={error}
                      action={
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={reload}
                        >
                          Retry
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}

              {showTableContent && policies.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title={
                        hasFilters
                          ? 'No policies match the current filters.'
                          : 'No insurance policies recorded yet.'
                      }
                      message={
                        hasFilters
                          ? 'Try changing the search or filter selections.'
                          : 'The CRFIS database does not contain any policies yet.'
                      }
                      action={
                        hasFilters ? (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={clearFilters}
                          >
                            Clear filters
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              )}

              {showTableContent &&
                policies.map((policy) => (
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
                          {policy.coveredAssets} assets
                        </strong>

                        <span>
                          {policy.assets
                            .map((asset) => asset.name)
                            .join(', ') || 'None'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {showTableContent && (meta?.total ?? 0) > 0 && (
          <div className="table-footer">
            <span>
              Page {meta?.page ?? 1} of {meta?.pageCount ?? 1}
            </span>

            <div className="pager-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={(meta?.page ?? 1) <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ← Prev
              </button>

              <button
                className="secondary-button"
                type="button"
                disabled={(meta?.page ?? 1) >= (meta?.pageCount ?? 1)}
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                Next →
              </button>
            </div>
          </div>
        )}
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
            <span>TOTAL COVERAGE</span>

            <strong>
              {formatCurrencyBuckets(stats?.coverageLimitByCurrency)}
            </strong>
          </div>

          <div className="intelligence-metric">
            <span>TOTAL DEDUCTIBLE</span>

            <strong>
              {formatCurrencyBuckets(stats?.deductibleByCurrency)}
            </strong>
          </div>
        </div>
      </div>
    </section>
  )
}

export default InsuranceRegister

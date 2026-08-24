import { useMemo, useState } from 'react'
import { useApiResource, useDebouncedValue } from '../hooks/useApiResource'
import { formatMoneyOrDash, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import type {
  RiskListResponse,
  RiskDto,
} from '../types/api'
import type {
  RiskCategory,
  RiskSeverity,
  RiskStatus,
} from '../types/risk'
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
      formatMoneyOrDash(toMoney(amount, currency as RiskDto['currency'])),
    )
    .join('  +  ')
}

function RiskRegister() {
  const [search, setSearch] = useState('')
  const [severity, setSeverity] =
    useState<RiskSeverity | 'All'>('All')
  const [status, setStatus] =
    useState<RiskStatus | 'All'>('All')
  const [category, setCategory] =
    useState<RiskCategory | 'All'>('All')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search)

  const url = useMemo(() => {
    const query = buildQuery({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      severity: severity === 'All' ? undefined : severity,
      status: status === 'All' ? undefined : status,
      category: category === 'All' ? undefined : category,
    })

    return `/api/risks?${query}`
  }, [page, debouncedSearch, severity, status, category])

  const { data, loading, error, reload } =
    useApiResource<RiskListResponse>(url)

  const risks = data?.data ?? []
  const meta = data?.meta
  const stats = meta?.stats

  const clearFilters = () => {
    setSearch('')
    setSeverity('All')
    setStatus('All')
    setCategory('All')
    setPage(1)
  }

  const hasFilters =
    search !== '' ||
    severity !== 'All' ||
    status !== 'All' ||
    category !== 'All'

  // Any filter change returns the user to the first page.
  const updateFilter = <T,>(
    setter: (value: T) => void,
  ) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const setSeverityAndReset = updateFilter(setSeverity)
  const setStatusAndReset = updateFilter(setStatus)
  const setCategoryAndReset = updateFilter(setCategory)
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
            <h2>Risk Register</h2>

            <span className="chip">LIVE DATA</span>
          </div>

          <p>
            Enterprise cybersecurity exposure and
            financial risk inventory.
          </p>
        </div>

        <button
          className="primary-button"
          type="button"
        >
          + Add Risk
        </button>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Active Risks</span>
          <strong className="kpi-value">{meta?.total ?? 0}</strong>
          <small className="kpi-note">Matching current filters</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Critical</span>
          <strong className="kpi-value">
            {stats?.bySeverity['Critical'] ?? 0}
          </strong>
          <small className="kpi-note">Requires attention</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">High</span>
          <strong className="kpi-value">
            {stats?.bySeverity['High'] ?? 0}
          </strong>
          <small className="kpi-note">Priority risks</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Medium</span>
          <strong className="kpi-value">
            {stats?.bySeverity['Medium'] ?? 0}
          </strong>
          <small className="kpi-note">Monitor and manage</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Total Exposure</span>
          <strong className="kpi-value">
            {formatCurrencyBuckets(stats?.exposureByCurrency)}
          </strong>
          <small className="kpi-note">Per currency, never mixed</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">
          i
        </span>

        <div>
          <strong>
            Connected to the CRFIS database
          </strong>

          <p>
            Risks are served live from the CRFIS database through the
            read-only API with their related assets. Monetary amounts keep
            their record currency; no conversion is applied.
          </p>
        </div>
      </div>

      <div className="toolbar" role="group" aria-label="Risk filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search risks, assets, owners..."
            value={search}
            onChange={(event) =>
              setSearchAndReset(event.target.value)
            }
            aria-label="Search risks"
          />
        </label>

        <select
          value={severity}
          onChange={(event) =>
            setSeverityAndReset(
              event.target.value as
                | RiskSeverity
                | 'All',
            )
          }
          aria-label="Filter by severity"
        >
          <option value="All">
            All Severities
          </option>

          <option value="Critical">
            Critical
          </option>

          <option value="High">
            High
          </option>

          <option value="Medium">
            Medium
          </option>

          <option value="Low">
            Low
          </option>
        </select>

        <select
          value={status}
          onChange={(event) =>
            setStatusAndReset(
              event.target.value as
                | RiskStatus
                | 'All',
            )
          }
          aria-label="Filter by status"
        >
          <option value="All">
            All Statuses
          </option>

          <option value="Open">
            Open
          </option>

          <option value="Under Review">
            Under Review
          </option>

          <option value="Mitigated">
            Mitigated
          </option>

          <option value="Accepted">
            Accepted
          </option>
        </select>

        <select
          value={category}
          onChange={(event) =>
            setCategoryAndReset(
              event.target.value as
                | RiskCategory
                | 'All',
            )
          }
          aria-label="Filter by category"
        >
          <option value="All">
            All Categories
          </option>

          <option value="Ransomware">
            Ransomware
          </option>

          <option value="Identity">
            Identity
          </option>

          <option value="Data Security">
            Data Security
          </option>

          <option value="Cloud Security">
            Cloud Security
          </option>

          <option value="Third Party">
            Third Party
          </option>

          <option value="Insider Risk">
            Insider Risk
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
            <strong>
              Risk Inventory
            </strong>

            <span>
              Showing {risks.length} of{' '}
              {meta?.total ?? 0} risks · page{' '}
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
                <th scope="col">Risk</th>
                <th scope="col">Asset</th>
                <th scope="col">Category</th>
                <th scope="col">Severity</th>
                <th scope="col">Likelihood</th>
                <th scope="col" className="money">
                  Financial Exposure
                </th>
                <th scope="col">Status</th>
                <th scope="col">Owner</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8}>
                    <LoadingState title="Loading risks..." />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={8}>
                    <ErrorState
                      title="Risks could not be loaded."
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

              {showTableContent && risks.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title={
                        hasFilters
                          ? 'No risks match the current filters.'
                          : 'No risks recorded yet.'
                      }
                      message={
                        hasFilters
                          ? 'Try changing the search or filter selections.'
                          : 'The CRFIS database does not contain any risks yet.'
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
                risks.map((risk) => (
                  <tr key={risk.id}>
                    <td>
                      <div className="cell-stack">
                        <strong>
                          {risk.risk}
                        </strong>

                        <span>
                          {risk.id}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="cell-stack">
                        <strong>
                          {risk.asset?.name ?? 'Unknown asset'}
                        </strong>

                        <span>
                          {risk.assetId}
                        </span>
                      </div>
                    </td>

                    <td>
                      {risk.category}
                    </td>

                    <td>
                      <span
                        className={`badge badge--${slugify(risk.severity)}`}
                      >
                        {risk.severity}
                      </span>
                    </td>

                    <td>
                      {risk.likelihood}
                    </td>

                    <td className="money">
                      {formatMoneyOrDash(
                        toMoney(risk.exposure, risk.currency),
                      )}
                    </td>

                    <td>
                      <span
                        className={`badge badge--${slugify(risk.status)}`}
                      >
                        {risk.status}
                      </span>
                    </td>

                    <td>
                      {risk.owner}
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
    </section>
  )
}

export default RiskRegister

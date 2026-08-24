import { useMemo, useState } from 'react'
import { useApiResource, useDebouncedValue } from '../hooks/useApiResource'
import { formatMoneyOrDash, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import type {
  ScenarioDto,
  ScenarioListResponse,
} from '../types/api'
import type {
  ScenarioCategory,
  ScenarioSeverity,
  ScenarioStatus,
} from '../types/scenario'
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
      formatMoneyOrDash(toMoney(amount, currency as ScenarioDto['currency'])),
    )
    .join('  +  ')
}

function ScenarioRegister() {
  const [search, setSearch] = useState('')
  const [severity, setSeverity] =
    useState<ScenarioSeverity | 'All'>('All')
  const [status, setStatus] =
    useState<ScenarioStatus | 'All'>('All')
  const [category, setCategory] =
    useState<ScenarioCategory | 'All'>('All')
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

    return `/api/scenarios?${query}`
  }, [page, debouncedSearch, severity, status, category])

  const { data, loading, error, reload } =
    useApiResource<ScenarioListResponse>(url)

  const scenarios = data?.data ?? []
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
            <h2>Scenario Analysis</h2>
            <span className="chip">LIVE DATA</span>
          </div>

          <p>
            Model realistic cybersecurity events and understand their
            potential business and financial consequences.
          </p>
        </div>

        <button className="primary-button" type="button">
          + Add Scenario
        </button>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Active Scenarios</span>
          <strong className="kpi-value">{meta?.total ?? 0}</strong>
          <small className="kpi-note">Matching current filters</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Critical</span>
          <strong className="kpi-value">
            {stats?.bySeverity['Critical'] ?? 0}
          </strong>
          <small className="kpi-note">Highest impact scenarios</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">High</span>
          <strong className="kpi-value">
            {stats?.bySeverity['High'] ?? 0}
          </strong>
          <small className="kpi-note">Priority scenarios</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-value">
            {stats?.byStatus['Under Review'] ?? 0}
          </strong>
          <small className="kpi-note">Awaiting assessment</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Estimated Impact</span>
          <strong className="kpi-value">
            {formatCurrencyBuckets(stats?.estimatedImpactByCurrency)}
          </strong>
          <small className="kpi-note">Per currency, never mixed</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

        <div>
          <strong>Connected to the CRFIS database</strong>

          <p>
            Scenarios are served live from the CRFIS database through the
            read-only API with their related risks and assets. Monetary
            amounts keep their record currency; no conversion is applied.
          </p>
        </div>
      </div>

      <div className="toolbar" role="group" aria-label="Scenario filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search scenarios, risks, assets, owners..."
            value={search}
            onChange={(event) => setSearchAndReset(event.target.value)}
            aria-label="Search scenarios"
          />
        </label>

        <select
          value={severity}
          onChange={(event) =>
            setSeverityAndReset(
              event.target.value as ScenarioSeverity | 'All',
            )
          }
          aria-label="Filter by severity"
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={status}
          onChange={(event) =>
            setStatusAndReset(
              event.target.value as ScenarioStatus | 'All',
            )
          }
          aria-label="Filter by status"
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Archived">Archived</option>
        </select>

        <select
          value={category}
          onChange={(event) =>
            setCategoryAndReset(
              event.target.value as ScenarioCategory | 'All',
            )
          }
          aria-label="Filter by category"
        >
          <option value="All">All Categories</option>
          <option value="Ransomware">Ransomware</option>
          <option value="Data Breach">Data Breach</option>
          <option value="Business Interruption">
            Business Interruption
          </option>
          <option value="Cloud Outage">Cloud Outage</option>
          <option value="Third Party">Third Party</option>
          <option value="Insider Threat">Insider Threat</option>
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
            <strong>Scenario Inventory</strong>

            <span>
              Showing {scenarios.length} of{' '}
              {meta?.total ?? 0} scenarios · page{' '}
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
                <th scope="col">Scenario</th>
                <th scope="col">Related Risk</th>
                <th scope="col">Asset</th>
                <th scope="col">Category</th>
                <th scope="col">Severity</th>
                <th scope="col">Probability</th>
                <th scope="col" className="money">
                  Estimated Impact
                </th>
                <th scope="col">Business Impact</th>
                <th scope="col">Status</th>
                <th scope="col">Owner</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10}>
                    <LoadingState title="Loading scenarios..." />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={10}>
                    <ErrorState
                      title="Scenarios could not be loaded."
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

              {showTableContent && scenarios.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      title={
                        hasFilters
                          ? 'No scenarios match the current filters.'
                          : 'No scenarios recorded yet.'
                      }
                      message={
                        hasFilters
                          ? 'Try changing the search or filter selections.'
                          : 'The CRFIS database does not contain any scenarios yet.'
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
                scenarios.map((scenario) => (
                  <tr key={scenario.id}>
                    <td>
                      <div className="cell-stack">
                        <strong>{scenario.name}</strong>
                        <span>{scenario.id}</span>
                      </div>
                    </td>

                    <td>
                      <div className="cell-stack">
                        <strong>
                          {scenario.risk?.risk ?? 'Unknown risk'}
                        </strong>
                        <span>{scenario.riskId}</span>
                      </div>
                    </td>

                    <td>
                      <div className="cell-stack">
                        <strong>
                          {scenario.asset?.name ?? 'Unknown asset'}
                        </strong>
                        <span>{scenario.assetId}</span>
                      </div>
                    </td>

                    <td>{scenario.category}</td>

                    <td>
                      <span
                        className={`badge badge--${slugify(scenario.severity)}`}
                      >
                        {scenario.severity}
                      </span>
                    </td>

                    <td>{scenario.probability}</td>

                    <td className="money">
                      {formatMoneyOrDash(
                        toMoney(scenario.estimatedImpact, scenario.currency),
                      )}
                    </td>

                    <td>{scenario.businessImpact}</td>

                    <td>
                      <span
                        className={`badge badge--${slugify(scenario.status)}`}
                      >
                        {scenario.status}
                      </span>
                    </td>

                    <td>{scenario.owner}</td>
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
            SCENARIO INTELLIGENCE
          </span>

          <h2>
            Understand the financial consequences before an event
            occurs.
          </h2>

          <p>
            CRFIS connects scenario probability, affected assets,
            related risks, business interruption, recovery costs,
            and financial impact into decision-ready analysis.
          </p>
        </div>

        <div className="intelligence-metric">
          <span>TOTAL ESTIMATED IMPACT</span>
          <strong>
            {formatCurrencyBuckets(stats?.estimatedImpactByCurrency)}
          </strong>
        </div>
      </div>
    </section>
  )
}

export default ScenarioRegister

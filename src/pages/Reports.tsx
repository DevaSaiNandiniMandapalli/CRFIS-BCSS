import { useMemo, useState } from 'react'
import { useApiResource, useDebouncedValue } from '../hooks/useApiResource'
import { formatDate, formatMoneyOrDash, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import type {
  InsuranceListResponse,
  ReportDto,
  ReportListResponse,
  RemediationListResponse,
  RiskListResponse,
} from '../types/api'
import type { CurrencyCode } from '../types/money'
import type { ReportStatus, ReportType } from '../types/report'
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
    .map(([currency, amount]) => formatMoneyOrDash(toMoney(amount, currency as CurrencyCode)))
    .join('  +  ')
}

// Single-row requests whose meta carries the cross-domain aggregate stats.
const STATS_PAGE = { page: 1, pageSize: 1 }
const RISKS_STATS_URL = `/api/risks?${buildQuery(STATS_PAGE)}`
const REMEDIATIONS_STATS_URL = `/api/remediations?${buildQuery(STATS_PAGE)}`
const INSURANCE_STATS_URL = `/api/insurance?${buildQuery(STATS_PAGE)}`

function Reports() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReportStatus | 'All'>('All')
  const [type, setType] = useState<ReportType | 'All'>('All')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search)

  const url = useMemo(() => {
    const query = buildQuery({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: status === 'All' ? undefined : status,
      type: type === 'All' ? undefined : type,
    })

    return `/api/reports?${query}`
  }, [page, debouncedSearch, status, type])

  // Cross-domain aggregates for the Decision Intelligence summary. Each
  // source keeps its own currency buckets - nothing is ever combined.
  const risksStats = useApiResource<RiskListResponse>(RISKS_STATS_URL)
  const remediationsStats = useApiResource<RemediationListResponse>(REMEDIATIONS_STATS_URL)
  const insuranceStats = useApiResource<InsuranceListResponse>(INSURANCE_STATS_URL)

  const { data, loading, error, reload } = useApiResource<ReportListResponse>(url)

  const reports = data?.data ?? []
  const meta = data?.meta

  const readyCount = reports.filter((report) => report.status === 'Ready').length
  const draftCount = reports.filter((report) => report.status === 'Draft').length
  const reviewCount = reports.filter((report) => report.status === 'Under Review').length

  const clearFilters = () => {
    setSearch('')
    setStatus('All')
    setType('All')
    setPage(1)
  }

  const hasFilters =
    search !== '' ||
    status !== 'All' ||
    type !== 'All'

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
            <h2>Reports &amp; Analytics</h2>
            <span className="chip">LIVE DATA</span>
          </div>

          <p>
            Generate executive-ready views of cyber risk,
            financial exposure, assets, remediation, and insurance.
          </p>
        </div>

        <button className="primary-button" type="button">
          + Create Report
        </button>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Total Reports</span>
          <strong className="kpi-value">{meta?.total ?? 0}</strong>
          <small className="kpi-note">Matching current filters</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Ready</span>
          <strong className="kpi-value">{readyCount}</strong>
          <small className="kpi-note">Available on this page</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-value">{reviewCount}</strong>
          <small className="kpi-note">On this page</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Drafts</span>
          <strong className="kpi-value">{draftCount}</strong>
          <small className="kpi-note">On this page</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

        <div>
          <strong>Connected to the CRFIS database</strong>

          <p>
            Stored report metadata is served live from the CRFIS database.
            No report-generation pipeline is connected yet; the summary
            below aggregates live domain statistics per currency.
          </p>
        </div>
      </div>

      <section className="report-overview">
        <div className="report-overview-heading">
          <div>
            <span className="eyebrow">EXECUTIVE REPORTING</span>
            <h2>Decision Intelligence</h2>
          </div>

          <span className="chip chip--muted">LIVE AGGREGATES</span>
        </div>

        <div className="report-summary-grid">
          <article className="kpi-card">
            <span className="kpi-label">Financial Exposure</span>

            <strong className="kpi-value">
              {formatCurrencyBuckets(
                risksStats.data?.meta.stats.exposureByCurrency,
              )}
            </strong>

            <small className="kpi-note">Risk register, per currency</small>
          </article>

          <article className="kpi-card accent">
            <span className="kpi-label">Critical Risks</span>

            <strong className="kpi-value">
              {risksStats.data?.meta.stats.bySeverity['Critical'] ?? 0}
            </strong>

            <small className="kpi-note">Live risk register count</small>
          </article>

          <article className="kpi-card">
            <span className="kpi-label">Remediation Opportunity</span>

            <strong className="kpi-value">
              {formatCurrencyBuckets(
                remediationsStats.data?.meta.stats.expectedReductionByCurrency,
              )}
            </strong>

            <small className="kpi-note">Expected reduction, per currency</small>
          </article>

          <article className="kpi-card">
            <span className="kpi-label">Insurance Coverage</span>

            <strong className="kpi-value">
              {formatCurrencyBuckets(
                insuranceStats.data?.meta.stats.coverageLimitByCurrency,
              )}
            </strong>

            <small className="kpi-note">Policy limits, per currency</small>
          </article>
        </div>
      </section>

      <div className="toolbar" role="group" aria-label="Report filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search reports..."
            value={search}
            onChange={(event) => setSearchAndReset(event.target.value)}
            aria-label="Search reports"
          />
        </label>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ReportStatus | 'All')
            setPage(1)
          }}
          aria-label="Filter reports by status"
        >
          <option value="All">All Statuses</option>
          <option value="Ready">Ready</option>
          <option value="Draft">Draft</option>
          <option value="Under Review">Under Review</option>
        </select>

        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value as ReportType | 'All')
            setPage(1)
          }}
          aria-label="Filter reports by type"
        >
          <option value="All">All Report Types</option>
          <option value="Executive Risk Report">
            Executive Risk Report
          </option>
          <option value="Financial Exposure Report">
            Financial Exposure Report
          </option>
          <option value="Asset Exposure Report">
            Asset Exposure Report
          </option>
          <option value="Remediation Report">
            Remediation Report
          </option>
          <option value="Insurance Coverage Report">
            Insurance Coverage Report
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
            <strong>Report Library</strong>

            <span>
              Showing {reports.length} of{' '}
              {meta?.total ?? 0} reports · page{' '}
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
                <th scope="col">Report</th>
                <th scope="col">Type</th>
                <th scope="col">Period</th>
                <th scope="col">Status</th>
                <th scope="col">Generated</th>
                <th scope="col">Owner</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7}>
                    <LoadingState title="Loading reports..." />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={7}>
                    <ErrorState
                      title="Reports could not be loaded."
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

              {showTableContent && reports.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title={
                        hasFilters
                          ? 'No reports match the current filters.'
                          : 'No reports recorded yet.'
                      }
                      message={
                        hasFilters
                          ? 'Try changing the search or filter selections.'
                          : 'The CRFIS database does not contain any stored reports yet.'
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
                reports.map((report: ReportDto) => (
                  <tr key={report.id}>
                    <td>
                      <div className="cell-stack">
                        <strong>{report.name}</strong>
                        <span>{report.id}</span>
                      </div>
                    </td>

                    <td>{report.type}</td>

                    <td>{report.period}</td>

                    <td>
                      <span className={`badge badge--${slugify(report.status)}`}>
                        {report.status}
                      </span>
                    </td>

                    <td>{formatDate(report.generatedAt)}</td>

                    <td>{report.owner}</td>

                    <td>
                      <button
                        className="secondary-button"
                        type="button"
                      >
                        View
                      </button>
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

      <section className="intelligence-panel">
        <div className="intelligence-icon" aria-hidden="true">↗</div>

        <div>
          <span className="eyebrow">
            REPORTING INTELLIGENCE
          </span>

          <h2>
            Turn risk data into executive decisions.
          </h2>

          <p>
            CRFIS combines risk, asset, remediation, scenario,
            and insurance information into decision-ready
            reports for leadership.
          </p>
        </div>

        <button className="secondary-button" type="button">
          Report Center
        </button>
      </section>
    </section>
  )
}

export default Reports

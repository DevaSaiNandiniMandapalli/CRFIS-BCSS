import { useMemo, useState } from 'react'
import { useApiResource, useDebouncedValue } from '../hooks/useApiResource'
import { formatDate, formatPercent, slugify } from '../utils/format'
import type {
  AuditDto,
  AuditFindingListResponse,
  AuditListResponse,
} from '../types/api'
import { EmptyState, ErrorState, LoadingState } from '../components/States'

const PAGE_SIZE = 20
const FINDINGS_PAGE_SIZE = 25

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }

  return search.toString()
}

const AUDIT_STATUSES = [
  'All Statuses',
  'Completed',
  'Under Review',
  'In Progress',
  'Planned',
  'Overdue',
] as const

const FRAMEWORKS = [
  'All Frameworks',
  'ISO 27001',
  'NIST CSF',
  'COBIT',
  'SOC 2',
  'CIS Controls',
] as const

function Audit() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [frameworkFilter, setFrameworkFilter] = useState('All Frameworks')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search)

  const auditsUrl = useMemo(() => {
    const query = buildQuery({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter === 'All Statuses' ? undefined : statusFilter,
      framework: frameworkFilter === 'All Frameworks' ? undefined : frameworkFilter,
    })

    return `/api/audits?${query}`
  }, [page, debouncedSearch, statusFilter, frameworkFilter])

  // Priority findings: cross-audit read ordered by due date.
  const findingsUrl = `/api/audit-findings?${buildQuery({
    page: 1,
    pageSize: FINDINGS_PAGE_SIZE,
    sort: 'dueDate',
    order: 'asc',
  })}`

  const {
    data: auditData,
    loading,
    error,
    reload,
  } = useApiResource<AuditListResponse>(auditsUrl)

  const {
    data: findingData,
    loading: findingsLoading,
    error: findingsError,
    reload: reloadFindings,
  } = useApiResource<AuditFindingListResponse>(findingsUrl)

  const audits = auditData?.data ?? []
  const meta = auditData?.meta
  const stats = meta?.stats
  const findings = findingData?.data ?? []

  const completedAudits = stats?.byStatus['Completed'] ?? 0
  const totalAudits = meta?.total ?? 0
  const evidenceCompletion =
    totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('All Statuses')
    setFrameworkFilter('All Frameworks')
    setPage(1)
  }

  const hasFilters =
    search !== '' ||
    statusFilter !== 'All Statuses' ||
    frameworkFilter !== 'All Frameworks'

  const setSearchAndReset = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const showAuditContent = !loading && !error

  return (
    <div className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <span className="eyebrow">
            AUDIT &amp; GOVERNANCE
          </span>

          <div className="page-title-row">
            <h2>Audit</h2>

            <span className="chip">LIVE DATA</span>
          </div>

          <p>
            Audit readiness, findings, evidence, ownership, and
            governance visibility.
          </p>
        </div>
      </header>

      <section className="notice">
        <div className="notice-icon" aria-hidden="true">i</div>

        <div>
          <strong>Demonstration environment</strong>

          <p>
            Audits and findings are served live from the CRFIS database
            through the read-only API. The findings number is the live
            relation count per audit, not a stored scalar.
          </p>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Audit metrics">
        <article className="kpi-card">
          <span className="kpi-label">Total Audits</span>

          <strong className="kpi-value">{totalAudits}</strong>

          <small className="kpi-note">Matching current filters</small>

          <div className="kpi-trend">
            Audit programs tracked
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Findings</span>

          <strong className="kpi-value">{stats?.findingsTotal ?? 0}</strong>

          <small className="kpi-note">Across filtered audits</small>

          <div className="kpi-trend">
            Live relation count
          </div>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">High / Critical Findings</span>

          <strong className="kpi-value">{stats?.highCriticalFindings ?? 0}</strong>

          <small className="kpi-note">Priority governance items</small>

          <div className="kpi-trend">
            Severity-filtered count
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Evidence Completion</span>

          <strong className="kpi-value">
            {formatPercent(evidenceCompletion)}
          </strong>

          <small className="kpi-note">Completed / total audits</small>

          <div className="kpi-trend">
            Illustrative proxy metric
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Overdue Actions</span>

          <strong className="kpi-value">{stats?.byStatus['Overdue'] ?? 0}</strong>

          <small className="kpi-note">Requires attention</small>

          <div className="kpi-trend">
            Overdue audit programs
          </div>
        </article>
      </section>

      <section className="section-header">
        <div>
          <span className="eyebrow">GOVERNANCE PROGRAM</span>

          <h2>Audit Inventory</h2>
        </div>

        <span className="table-count">
          Showing {audits.length} of {totalAudits} audits · page{' '}
          {meta?.page ?? 1} of {meta?.pageCount ?? 1}
        </span>
      </section>

      <section className="toolbar" role="group" aria-label="Audit filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search audits..."
            value={search}
            onChange={(event) => setSearchAndReset(event.target.value)}
            aria-label="Search audits"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            setPage(1)
          }}
          aria-label="Filter audits by status"
        >
          {AUDIT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={frameworkFilter}
          onChange={(event) => {
            setFrameworkFilter(event.target.value)
            setPage(1)
          }}
          aria-label="Filter audits by framework"
        >
          {FRAMEWORKS.map((framework) => (
            <option key={framework} value={framework}>
              {framework}
            </option>
          ))}
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
      </section>

      <section className="data-panel">
        <div className="data-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Audit</th>
                <th scope="col">Framework</th>
                <th scope="col">Scope</th>
                <th scope="col">Status</th>
                <th scope="col" className="money">
                  Findings
                </th>
                <th scope="col">Owner</th>
                <th scope="col">Due Date</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7}>
                    <LoadingState title="Loading audits..." />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={7}>
                    <ErrorState
                      title="Audits could not be loaded."
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

              {showAuditContent && audits.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title={
                        hasFilters
                          ? 'No audits match the selected filters.'
                          : 'No audits recorded yet.'
                      }
                      message={
                        hasFilters
                          ? 'Try changing the search or filter selections.'
                          : 'The CRFIS database does not contain any audit programs yet.'
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

              {showAuditContent &&
                audits.map((audit: AuditDto) => (
                  <tr key={audit.id}>
                    <td>
                      <strong>{audit.id}</strong>
                    </td>

                    <td>{audit.framework}</td>

                    <td>{audit.scope}</td>

                    <td>
                      <span className={`badge badge--${slugify(audit.status)}`}>
                        {audit.status}
                      </span>
                    </td>

                    <td className="money">{audit.findings}</td>

                    <td>{audit.owner}</td>

                    <td>{formatDate(audit.dueDate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {showAuditContent && totalAudits > 0 && (
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
                onClick={() => setPage((current) => current + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="section-header">
        <div>
          <span className="eyebrow">AUDIT FINDINGS</span>

          <h2>Recorded Findings</h2>
        </div>

        <span className="table-count">
          Showing {(findingData?.data.length ?? 0)} of{' '}
          {findingData?.meta.total ?? 0} findings
        </span>
      </section>

      <section className="data-panel">
        <div className="data-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Finding</th>
                <th scope="col">Severity</th>
                <th scope="col">Audit</th>
                <th scope="col">Owner</th>
                <th scope="col">Due Date</th>
                <th scope="col">Status</th>
              </tr>
            </thead>

            <tbody>
              {findingsLoading && (
                <tr>
                  <td colSpan={6}>
                    <LoadingState title="Loading findings..." />
                  </td>
                </tr>
              )}

              {!findingsLoading && findingsError && (
                <tr>
                  <td colSpan={6}>
                    <ErrorState
                      title="Findings could not be loaded."
                      message={findingsError}
                      action={
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={reloadFindings}
                        >
                          Retry
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}

              {!findingsLoading &&
                !findingsError &&
                findings.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        title="No findings recorded yet."
                        message="The CRFIS database does not contain any audit findings yet."
                      />
                    </td>
                  </tr>
                )}

              {!findingsLoading &&
                !findingsError &&
                findings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.description}</strong>

                      <span className="table-secondary">
                        {item.id}
                      </span>
                    </td>

                    <td>
                      <span className={`badge badge--${slugify(item.severity)}`}>
                        {item.severity}
                      </span>
                    </td>

                    <td>{item.auditId}</td>

                    <td>{item.owner}</td>

                    <td>{formatDate(item.dueDate)}</td>

                    <td>
                      <span className={`badge badge--${slugify(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="intelligence-panel">
        <div className="intelligence-icon" aria-hidden="true">↗</div>

        <div>
          <span className="eyebrow">
            AUDIT &amp; GOVERNANCE INTELLIGENCE
          </span>

          <h2>
            Audit visibility for executive decisions.
          </h2>

          <p>
            CRFIS will eventually connect audit evidence,
            cybersecurity findings, financial exposure, remediation
            activity, insurance context, and governance requirements
            into one executive view.
          </p>
        </div>

        <span className="chip chip--muted">
          HUMAN-IN-THE-LOOP
        </span>
      </section>
    </div>
  )
}

export default Audit

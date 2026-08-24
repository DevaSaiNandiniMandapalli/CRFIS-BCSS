import { useMemo, useState } from 'react'
import { demoAudits } from '../data/demoAudits'
import { calculateTotalAuditFindings } from '../utils/financialMetrics'
import { formatDate, formatPercent, slugify } from '../utils/format'
import { EmptyState } from '../components/States'

const statuses = [
  'All Statuses',
  'Completed',
  'Under Review',
  'In Progress',
  'Planned',
  'Overdue',
]

const frameworks = [
  'All Frameworks',
  'ISO 27001',
  'NIST CSF',
  'COBIT',
  'SOC 2',
  'CIS Controls',
]

const findings = [
  {
    id: 'FND-001',
    finding: 'Privileged access review requires remediation',
    severity: 'High',
    audit: 'AUD-001',
    owner: 'Security Governance',
    dueDate: '2026-09-10',
    status: 'Open',
  },
  {
    id: 'FND-002',
    finding: 'Application security evidence is incomplete',
    severity: 'Medium',
    audit: 'AUD-002',
    owner: 'Risk Management',
    dueDate: '2026-09-18',
    status: 'Under Review',
  },
  {
    id: 'FND-003',
    finding: 'Data governance control requires review',
    severity: 'Critical',
    audit: 'AUD-003',
    owner: 'Data Governance',
    dueDate: '2026-09-05',
    status: 'Open',
  },
]

function Audit() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [frameworkFilter, setFrameworkFilter] =
    useState('All Frameworks')

  const filteredAudits = useMemo(() => {
    const query = search.trim().toLowerCase()

    return demoAudits.filter((audit) => {
      const matchesSearch =
        !query ||
        audit.id.toLowerCase().includes(query) ||
        audit.framework.toLowerCase().includes(query) ||
        audit.scope.toLowerCase().includes(query) ||
        audit.owner.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'All Statuses' ||
        audit.status === statusFilter

      const matchesFramework =
        frameworkFilter === 'All Frameworks' ||
        audit.framework === frameworkFilter

      return matchesSearch && matchesStatus && matchesFramework
    })
  }, [search, statusFilter, frameworkFilter])

  const totalAudits = demoAudits.length

  const totalFindings =
    calculateTotalAuditFindings(demoAudits)

  const completedAudits = demoAudits.filter(
    (audit) => audit.status === 'Completed',
  ).length

  const highCriticalFindings = findings.filter(
    (finding) =>
      finding.severity === 'High' ||
      finding.severity === 'Critical',
  ).length

  const overdueAudits = demoAudits.filter(
    (audit) => audit.status === 'Overdue',
  ).length

  const evidenceCompletion = Math.round(
    (completedAudits / totalAudits) * 100,
  )

  return (
    <div className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <span className="eyebrow">
            AUDIT &amp; GOVERNANCE
          </span>

          <div className="page-title-row">
            <h2>Audit</h2>

            <span className="chip">DEMO DATA</span>
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
            Audit records, findings, dates, and governance metrics on
            this screen are fictional placeholder data for CRFIS
            interface development.
          </p>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Audit metrics">
        <article className="kpi-card">
          <span className="kpi-label">Total Audits</span>

          <strong className="kpi-value">{totalAudits}</strong>

          <small className="kpi-note">Demo / calculated</small>

          <div className="kpi-trend">
            Audit programs tracked
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Open Findings</span>

          <strong className="kpi-value">{totalFindings}</strong>

          <small className="kpi-note">Demo / calculated</small>

          <div className="kpi-trend">
            Findings across audit programs
          </div>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">High / Critical Findings</span>

          <strong className="kpi-value">{highCriticalFindings}</strong>

          <small className="kpi-note">Demo / calculated</small>

          <div className="kpi-trend">
            Priority governance items
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Evidence Completion</span>

          <strong className="kpi-value">
            {formatPercent(evidenceCompletion)}
          </strong>

          <small className="kpi-note">Demo / illustrative</small>

          <div className="kpi-trend">
            Completed audit programs
          </div>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Overdue Actions</span>

          <strong className="kpi-value">{overdueAudits}</strong>

          <small className="kpi-note">Demo / calculated</small>

          <div className="kpi-trend">
            Requires attention
          </div>
        </article>
      </section>

      <section className="section-header">
        <div>
          <span className="eyebrow">GOVERNANCE PROGRAM</span>

          <h2>Audit Inventory</h2>
        </div>

        <span className="table-count">
          Showing {filteredAudits.length} of {demoAudits.length} demo
          audits
        </span>
      </section>

      <section className="toolbar" role="group" aria-label="Audit filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search audits..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search audits"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          aria-label="Filter audits by status"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={frameworkFilter}
          onChange={(event) =>
            setFrameworkFilter(event.target.value)
          }
          aria-label="Filter audits by framework"
        >
          {frameworks.map((framework) => (
            <option key={framework} value={framework}>
              {framework}
            </option>
          ))}
        </select>
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
              {filteredAudits.length > 0 ? (
                filteredAudits.map((audit) => (
                  <tr key={audit.id}>
                    <td>
                      <strong>{audit.id}</strong>
                    </td>

                    <td>{audit.framework}</td>

                    <td>{audit.scope}</td>

                    <td>
                      <span
                        className={`badge badge--${slugify(audit.status)}`}
                      >
                        {audit.status}
                      </span>
                    </td>

                    <td className="money">{audit.findings}</td>

                    <td>{audit.owner}</td>

                    <td>{formatDate(audit.dueDate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No demo audits match the selected filters."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-header">
        <div>
          <span className="eyebrow">AUDIT FINDINGS</span>

          <h2>Priority Findings</h2>
        </div>

        <span className="table-count">
          {findings.length} demo findings
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
              {findings.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.finding}</strong>

                    <span className="table-secondary">
                      {item.id}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`badge badge--${slugify(item.severity)}`}
                    >
                      {item.severity}
                    </span>
                  </td>

                  <td>{item.audit}</td>

                  <td>{item.owner}</td>

                  <td>{formatDate(item.dueDate)}</td>

                  <td>
                    <span
                      className={`badge badge--${slugify(item.status)}`}
                    >
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

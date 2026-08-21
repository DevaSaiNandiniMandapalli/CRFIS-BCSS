import { useMemo, useState } from 'react'
import { demoAudits } from '../data/demoAudits'
import { calculateTotalAuditFindings } from '../utils/financialMetrics'

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
    <div className="audit-page">
      <section className="module-intro">
        <div>
          <span className="eyebrow">
            AUDIT &amp; GOVERNANCE
          </span>

          <h2>Audit</h2>

          <p>
            Audit readiness, findings, evidence, ownership, and
            governance visibility.
          </p>
        </div>

        <span className="status-pill">
          <span className="status-dot" />
          DEMO DATA
        </span>
      </section>

      <section className="demo-notice">
        <div className="demo-notice-icon">i</div>

        <div>
          <strong>Demonstration environment</strong>

          <p>
            Audit records, findings, dates, and governance metrics on
            this screen are fictional placeholder data for CRFIS
            interface development.
          </p>
        </div>
      </section>

      <section className="metrics" aria-label="Audit metrics">
        <article className="metric-card">
          <span>Total Audits</span>

          <strong>
            {String(totalAudits).padStart(2, '0')}
          </strong>

          <small>DEMO / CALCULATED</small>

          <div className="metric-trend">
            Audit programs tracked
          </div>
        </article>

        <article className="metric-card">
          <span>Open Findings</span>

          <strong>
            {String(totalFindings).padStart(2, '0')}
          </strong>

          <small>DEMO / CALCULATED</small>

          <div className="metric-trend">
            Findings across audit programs
          </div>
        </article>

        <article className="metric-card accent">
          <span>High / Critical Findings</span>

          <strong>
            {String(highCriticalFindings).padStart(2, '0')}
          </strong>

          <small>DEMO / CALCULATED</small>

          <div className="metric-trend">
            Priority governance items
          </div>
        </article>

        <article className="metric-card">
          <span>Evidence Completion</span>

          <strong>{evidenceCompletion}%</strong>

          <small>DEMO / ILLUSTRATIVE</small>

          <div className="metric-trend">
            Completed audit programs
          </div>
        </article>

        <article className="metric-card">
          <span>Overdue Actions</span>

          <strong>
            {String(overdueAudits).padStart(2, '0')}
          </strong>

          <small>DEMO / CALCULATED</small>

          <div className="metric-trend">
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

      <section className="filter-bar" aria-label="Audit filters">
        <div className="filter-search">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search audits..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search audits"
          />
        </div>

        <label>
          <span>Status</span>

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
        </label>

        <label>
          <span>Framework</span>

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
        </label>
      </section>

      <section className="risk-panel">
        <div className="risk-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Audit</th>
                <th>Framework</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Findings</th>
                <th>Owner</th>
                <th>Due Date</th>
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
                        className={`status-badge ${audit.status
                          .toLowerCase()
                          .replaceAll(' ', '-')}`}
                      >
                        {audit.status}
                      </span>
                    </td>

                    <td>{audit.findings}</td>

                    <td>{audit.owner}</td>

                    <td>{audit.dueDate}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-table-state">
                      No demo audits match the selected filters.
                    </div>
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

      <section className="risk-panel">
        <div className="risk-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Finding</th>
                <th>Severity</th>
                <th>Audit</th>
                <th>Owner</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {findings.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.finding}</strong>

                    <small className="table-secondary">
                      {item.id}
                    </small>
                  </td>

                  <td>
                    <span
                      className={`severity ${item.severity.toLowerCase()}`}
                    >
                      {item.severity}
                    </span>
                  </td>

                  <td>{item.audit}</td>

                  <td>{item.owner}</td>

                  <td>{item.dueDate}</td>

                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="intelligence-panel">
        <div className="intelligence-icon">↗</div>

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

        <span className="ai-governance-badge">
          HUMAN-IN-THE-LOOP
        </span>
      </section>
    </div>
  )
}

export default Audit
import { useMemo, useState } from 'react'
import { demoRemediations } from '../data/demoRemediations'
import type {
  RemediationPriority,
  RemediationStatus,
  RemediationCategory,
} from '../types/remediation'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function Remediation() {
  const [search, setSearch] = useState('')
  const [priority, setPriority] =
    useState<RemediationPriority | 'All'>('All')
  const [status, setStatus] =
    useState<RemediationStatus | 'All'>('All')
  const [category, setCategory] =
    useState<RemediationCategory | 'All'>('All')

  const filteredRemediations = useMemo(() => {
    const query = search.trim().toLowerCase()

    return demoRemediations.filter((item) => {
      const matchesSearch =
        !query ||
        item.action.toLowerCase().includes(query) ||
        item.relatedRisk.toLowerCase().includes(query) ||
        item.asset.toLowerCase().includes(query) ||
        item.owner.toLowerCase().includes(query)

      const matchesPriority =
        priority === 'All' || item.priority === priority

      const matchesStatus =
        status === 'All' || item.status === status

      const matchesCategory =
        category === 'All' || item.category === category

      return (
        matchesSearch &&
        matchesPriority &&
        matchesStatus &&
        matchesCategory
      )
    })
  }, [search, priority, status, category])

  const openCount = demoRemediations.filter(
    (item) => item.status === 'Open',
  ).length

  const inProgressCount = demoRemediations.filter(
    (item) => item.status === 'In Progress',
  ).length

  const completedCount = demoRemediations.filter(
    (item) => item.status === 'Completed',
  ).length

  const overdueCount = 1

  const totalCost = demoRemediations.reduce(
    (total, item) => total + item.estimatedCost,
    0,
  )

  const totalReduction = demoRemediations.reduce(
    (total, item) => total + item.expectedReduction,
    0,
  )

  const clearFilters = () => {
    setSearch('')
    setPriority('All')
    setStatus('All')
    setCategory('All')
  }

  const hasFilters =
    search !== '' ||
    priority !== 'All' ||
    status !== 'All' ||
    category !== 'All'

  return (
    <section className="remediation-page">
      <div className="module-heading">
        <div>
          <div className="module-title-row">
            <h2>Remediation</h2>
            <span className="demo-badge">DEMO DATA</span>
          </div>

          <p>
            Track remediation actions, ownership, cost, deadlines,
            and expected reduction in financial exposure.
          </p>
        </div>

        <button className="primary-button" type="button">
          + Add Action
        </button>
      </div>

      <div className="risk-kpis">
        <article className="risk-kpi">
          <span>OPEN ACTIONS</span>
          <strong>{openCount}</strong>
          <small>Requires action</small>
        </article>

        <article className="risk-kpi critical-kpi">
          <span>OVERDUE</span>
          <strong>{overdueCount}</strong>
          <small>Demo placeholder</small>
        </article>

        <article className="risk-kpi high-kpi">
          <span>IN PROGRESS</span>
          <strong>{inProgressCount}</strong>
          <small>Currently being addressed</small>
        </article>

        <article className="risk-kpi">
          <span>COMPLETED</span>
          <strong>{completedCount}</strong>
          <small>Completed actions</small>
        </article>

        <article className="risk-kpi exposure-kpi">
          <span>EXPECTED REDUCTION</span>
          <strong>{currencyFormatter.format(totalReduction)}</strong>
          <small>Fictional placeholder value</small>
        </article>
      </div>

      <div className="demo-notice">
        <span className="demo-notice-icon">i</span>

        <div>
          <strong>Demonstration environment</strong>

          <p>
            All remediation actions, costs, dates, and financial
            reduction estimates on this screen are fictional
            placeholder data for CRFIS interface development.
          </p>
        </div>
      </div>

      <div className="risk-toolbar">
        <label className="risk-search">
          <span>⌕</span>

          <input
            type="search"
            placeholder="Search actions, risks, assets, owners..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search remediation actions"
          />
        </label>

        <select
          value={priority}
          onChange={(event) =>
            setPriority(
              event.target.value as RemediationPriority | 'All',
            )
          }
          aria-label="Filter by priority"
        >
          <option value="All">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as RemediationStatus | 'All')
          }
          aria-label="Filter by status"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={category}
          onChange={(event) =>
            setCategory(
              event.target.value as RemediationCategory | 'All',
            )
          }
          aria-label="Filter by category"
        >
          <option value="All">All Categories</option>
          <option value="Access Control">Access Control</option>
          <option value="Infrastructure">Infrastructure</option>
          <option value="Data Protection">Data Protection</option>
          <option value="Cloud Security">Cloud Security</option>
          <option value="Backup & Recovery">
            Backup &amp; Recovery
          </option>
          <option value="Third Party">Third Party</option>
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
            <strong>Remediation Inventory</strong>

            <span>
              Showing {filteredRemediations.length} of{' '}
              {demoRemediations.length} demo actions
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
                <th>Action</th>
                <th>Related Risk</th>
                <th>Asset</th>
                <th>Priority</th>
                <th>Owner</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Expected Reduction</th>
              </tr>
            </thead>

            <tbody>
              {filteredRemediations.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="risk-name">
                      <strong>{item.action}</strong>
                      <span>{item.id}</span>
                    </div>
                  </td>

                  <td>{item.relatedRisk}</td>

                  <td>{item.asset}</td>

                  <td>
                    <span
                      className={`risk-severity ${item.priority.toLowerCase()}`}
                    >
                      {item.priority}
                    </span>
                  </td>

                  <td>{item.owner}</td>

                  <td>{item.dueDate}</td>

                  <td>
                    <span
                      className={`risk-status ${item.status
                        .toLowerCase()
                        .replaceAll(' ', '-')}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="financial-value">
                    {currencyFormatter.format(
                      item.expectedReduction,
                    )}
                  </td>
                </tr>
              ))}

              {filteredRemediations.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="risk-empty-state">
                      <strong>
                        No remediation actions match the current
                        filters.
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
          <span className="eyebrow">REMEDIATION INTELLIGENCE</span>

          <h2>
            Prioritize the actions that can reduce financial exposure.
          </h2>

          <p>
            CRFIS will eventually connect remediation cost with
            expected financial exposure reduction to help leadership
            evaluate security investment decisions.
          </p>
        </div>

        <div className="intelligence-metric">
          <span>DEMO ACTION COST</span>
          <strong>{currencyFormatter.format(totalCost)}</strong>
        </div>
      </div>
    </section>
  )
}

export default Remediation
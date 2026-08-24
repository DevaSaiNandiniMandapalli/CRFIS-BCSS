import { useMemo, useState } from 'react'
import { demoAssets } from '../data/demoAssets'
import { demoRemediations } from '../data/demoRemediations'
import { demoRisks } from '../data/demoRisks'
import {
  calculateRemediationCost,
  calculateRemediationOpportunity,
} from '../utils/financialMetrics'
import { formatDate, formatMoneyOrDash, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import { EmptyState } from '../components/States'
import type {
  RemediationCategory,
  RemediationPriority,
  RemediationStatus,
} from '../types/remediation'

function Remediation() {
  const [search, setSearch] = useState('')
  const [priority, setPriority] =
    useState<RemediationPriority | 'All'>('All')
  const [status, setStatus] =
    useState<RemediationStatus | 'All'>('All')
  const [category, setCategory] =
    useState<RemediationCategory | 'All'>('All')

  const riskById = useMemo(
    () =>
      new Map(
        demoRisks.map((risk) => [risk.id, risk]),
      ),
    [],
  )

  const assetById = useMemo(
    () =>
      new Map(
        demoAssets.map((asset) => [asset.id, asset]),
      ),
    [],
  )

  const filteredRemediations = useMemo(() => {
    const query = search.trim().toLowerCase()

    return demoRemediations.filter((item) => {
      const linkedRisk = riskById.get(item.riskId)
      const linkedAsset = assetById.get(item.assetId)

      const riskName =
        linkedRisk?.risk ?? item.relatedRisk

      const assetName =
        linkedAsset?.name ?? item.asset

      const matchesSearch =
        !query ||
        item.action.toLowerCase().includes(query) ||
        riskName.toLowerCase().includes(query) ||
        assetName.toLowerCase().includes(query) ||
        item.owner.toLowerCase().includes(query)

      const matchesPriority =
        priority === 'All' ||
        item.priority === priority

      const matchesStatus =
        status === 'All' ||
        item.status === status

      const matchesCategory =
        category === 'All' ||
        item.category === category

      return (
        matchesSearch &&
        matchesPriority &&
        matchesStatus &&
        matchesCategory
      )
    })
  }, [
    search,
    priority,
    status,
    category,
    riskById,
    assetById,
  ])

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

  const totalCost = calculateRemediationCost(demoRemediations)

  const totalReduction =
    calculateRemediationOpportunity(demoRemediations)

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
    <section className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <div className="page-title-row">
            <h2>Remediation</h2>

            <span className="chip">
              DEMO DATA
            </span>
          </div>

          <p>
            Track remediation actions, ownership, cost,
            deadlines, and expected reduction in financial
            exposure.
          </p>
        </div>

        <button
          className="primary-button"
          type="button"
        >
          + Add Action
        </button>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Open Actions</span>
          <strong className="kpi-value">{openCount}</strong>
          <small className="kpi-note">Requires action</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Overdue</span>
          <strong className="kpi-value">{overdueCount}</strong>
          <small className="kpi-note">Demo placeholder</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">In Progress</span>
          <strong className="kpi-value">{inProgressCount}</strong>
          <small className="kpi-note">Currently being addressed</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Completed</span>
          <strong className="kpi-value">{completedCount}</strong>
          <small className="kpi-note">Completed actions</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Expected Reduction</span>
          <strong className="kpi-value">
            {formatMoneyOrDash(totalReduction)}
          </strong>
          <small className="kpi-note">Fictional placeholder value</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">
          i
        </span>

        <div>
          <strong>
            Demonstration environment
          </strong>

          <p>
            All remediation actions, costs, dates,
            and financial reduction estimates on this
            screen are fictional placeholder data for
            CRFIS interface development.
          </p>
        </div>
      </div>

      <div className="toolbar" role="group" aria-label="Remediation filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search actions, risks, assets, owners..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            aria-label="Search remediation actions"
          />
        </label>

        <select
          value={priority}
          onChange={(event) =>
            setPriority(
              event.target.value as
                | RemediationPriority
                | 'All',
            )
          }
          aria-label="Filter by priority"
        >
          <option value="All">
            All Priorities
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
            setStatus(
              event.target.value as
                | RemediationStatus
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

          <option value="In Progress">
            In Progress
          </option>

          <option value="Blocked">
            Blocked
          </option>

          <option value="Completed">
            Completed
          </option>
        </select>

        <select
          value={category}
          onChange={(event) =>
            setCategory(
              event.target.value as
                | RemediationCategory
                | 'All',
            )
          }
          aria-label="Filter by category"
        >
          <option value="All">
            All Categories
          </option>

          <option value="Access Control">
            Access Control
          </option>

          <option value="Infrastructure">
            Infrastructure
          </option>

          <option value="Data Protection">
            Data Protection
          </option>

          <option value="Cloud Security">
            Cloud Security
          </option>

          <option value="Backup & Recovery">
            Backup &amp; Recovery
          </option>

          <option value="Third Party">
            Third Party
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
              Remediation Inventory
            </strong>

            <span>
              Showing {filteredRemediations.length} of{' '}
              {demoRemediations.length} demo actions
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
                <th scope="col">Action</th>
                <th scope="col">Related Risk</th>
                <th scope="col">Asset</th>
                <th scope="col">Priority</th>
                <th scope="col">Owner</th>
                <th scope="col">Due Date</th>
                <th scope="col">Status</th>
                <th scope="col" className="money">
                  Expected Reduction
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRemediations.map((item) => {
                const linkedRisk =
                  riskById.get(item.riskId)

                const linkedAsset =
                  assetById.get(item.assetId)

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-stack">
                        <strong>
                          {item.action}
                        </strong>

                        <span>
                          {item.id}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="cell-stack">
                        <strong>
                          {linkedRisk?.risk ??
                            item.relatedRisk}
                        </strong>

                        <span>
                          {item.riskId}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="cell-stack">
                        <strong>
                          {linkedAsset?.name ??
                            item.asset}
                        </strong>

                        <span>
                          {item.assetId}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge badge--${slugify(item.priority)}`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    <td>
                      {item.owner}
                    </td>

                    <td>
                      {formatDate(item.dueDate)}
                    </td>

                    <td>
                      <span
                        className={`badge badge--${slugify(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="money">
                      {formatMoneyOrDash(
                        toMoney(
                          item.expectedReduction,
                          item.currency,
                        ),
                      )}
                    </td>
                  </tr>
                )
              })}

              {filteredRemediations.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No remediation actions match the current filters."
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
        <div className="intelligence-icon" aria-hidden="true">
          ↗
        </div>

        <div>
          <span className="eyebrow">
            REMEDIATION INTELLIGENCE
          </span>

          <h2>
            Prioritize the actions that can reduce
            financial exposure.
          </h2>

          <p>
            CRFIS will eventually connect remediation
            cost with expected financial exposure
            reduction to help leadership evaluate
            security investment decisions.
          </p>
        </div>

        <div className="intelligence-metric">
          <span>
            DEMO ACTION COST
          </span>

          <strong>
            {formatMoneyOrDash(totalCost)}
          </strong>
        </div>
      </div>
    </section>
  )
}

export default Remediation

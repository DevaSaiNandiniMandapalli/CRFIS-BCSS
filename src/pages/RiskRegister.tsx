import { useMemo, useState } from 'react'
import { demoAssets } from '../data/demoAssets'
import { demoRisks } from '../data/demoRisks'
import { calculateTotalExposure } from '../utils/financialMetrics'
import { formatMoneyOrDash, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import { EmptyState } from '../components/States'
import type {
  RiskCategory,
  RiskSeverity,
  RiskStatus,
} from '../types/risk'

function RiskRegister() {
  const [search, setSearch] = useState('')
  const [severity, setSeverity] =
    useState<RiskSeverity | 'All'>('All')
  const [status, setStatus] =
    useState<RiskStatus | 'All'>('All')
  const [category, setCategory] =
    useState<RiskCategory | 'All'>('All')

  /*
   * Connect each Asset ID to the actual Asset record.
   *
   * Example:
   *
   * ASSET-001 -> Core Infrastructure
   * ASSET-002 -> Identity Platform
   */
  const assetById = useMemo(
    () =>
      new Map(
        demoAssets.map((asset) => [asset.id, asset]),
      ),
    [],
  )

  const filteredRisks = useMemo(() => {
    const query = search.trim().toLowerCase()

    return demoRisks.filter((risk) => {
      const linkedAsset = assetById.get(risk.assetId)

      const assetName =
        linkedAsset?.name ?? risk.asset

      const matchesSearch =
        !query ||
        risk.risk.toLowerCase().includes(query) ||
        assetName.toLowerCase().includes(query) ||
        risk.owner.toLowerCase().includes(query)

      const matchesSeverity =
        severity === 'All' ||
        risk.severity === severity

      const matchesStatus =
        status === 'All' ||
        risk.status === status

      const matchesCategory =
        category === 'All' ||
        risk.category === category

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesStatus &&
        matchesCategory
      )
    })
  }, [
    search,
    severity,
    status,
    category,
    assetById,
  ])

  const totalExposure =
    calculateTotalExposure(demoRisks)

  const criticalCount = demoRisks.filter(
    (risk) => risk.severity === 'Critical',
  ).length

  const highCount = demoRisks.filter(
    (risk) => risk.severity === 'High',
  ).length

  const mediumCount = demoRisks.filter(
    (risk) => risk.severity === 'Medium',
  ).length

  const clearFilters = () => {
    setSearch('')
    setSeverity('All')
    setStatus('All')
    setCategory('All')
  }

  const hasFilters =
    search !== '' ||
    severity !== 'All' ||
    status !== 'All' ||
    category !== 'All'

  return (
    <section className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <div className="page-title-row">
            <h2>Risk Register</h2>

            <span className="chip">DEMO DATA</span>
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
          <strong className="kpi-value">{demoRisks.length}</strong>
          <small className="kpi-note">Demo / placeholder</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Critical</span>
          <strong className="kpi-value">{criticalCount}</strong>
          <small className="kpi-note">Requires attention</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">High</span>
          <strong className="kpi-value">{highCount}</strong>
          <small className="kpi-note">Priority risks</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Medium</span>
          <strong className="kpi-value">{mediumCount}</strong>
          <small className="kpi-note">Monitor and manage</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Demo Exposure</span>
          <strong className="kpi-value">
            {formatMoneyOrDash(totalExposure)}
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
            All risks and financial values on this
            screen are fictional placeholder data
            for CRFIS interface development. They
            are not real security findings or
            calculated financial assessments.
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
              setSearch(event.target.value)
            }
            aria-label="Search risks"
          />
        </label>

        <select
          value={severity}
          onChange={(event) =>
            setSeverity(
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
            setStatus(
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
            setCategory(
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
              Showing {filteredRisks.length} of{' '}
              {demoRisks.length} demo risks
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
              {filteredRisks.map((risk) => {
                const linkedAsset =
                  assetById.get(risk.assetId)

                return (
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
                          {linkedAsset?.name ??
                            risk.asset}
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
                )
              })}

              {filteredRisks.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No risks match the current filters."
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
    </section>
  )
}

export default RiskRegister

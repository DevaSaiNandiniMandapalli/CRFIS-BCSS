import { useMemo, useState } from 'react'
import { demoAssets } from '../data/demoAssets'
import { demoRisks } from '../data/demoRisks'
import {
  calculateTotalExposure,
} from '../utils/financialMetrics'
import type {
  RiskCategory,
  RiskSeverity,
  RiskStatus,
} from '../types/risk'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

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
    <section className="risk-register-page">
      <div className="module-heading">
        <div>
          <div className="module-title-row">
            <h2>Risk Register</h2>

            <span className="demo-badge">
              DEMO DATA
            </span>
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
      </div>

      <div className="risk-kpis">
        <article className="risk-kpi">
          <span>ACTIVE RISKS</span>
          <strong>{demoRisks.length}</strong>
          <small>DEMO / PLACEHOLDER</small>
        </article>

        <article className="risk-kpi critical-kpi">
          <span>CRITICAL</span>
          <strong>{criticalCount}</strong>
          <small>Requires attention</small>
        </article>

        <article className="risk-kpi high-kpi">
          <span>HIGH</span>
          <strong>{highCount}</strong>
          <small>Priority risks</small>
        </article>

        <article className="risk-kpi">
          <span>MEDIUM</span>
          <strong>{mediumCount}</strong>
          <small>Monitor and manage</small>
        </article>

        <article className="risk-kpi exposure-kpi">
          <span>DEMO EXPOSURE</span>

          <strong>
            {currencyFormatter.format(totalExposure)}
          </strong>

          <small>
            Fictional placeholder value
          </small>
        </article>
      </div>

      <div className="demo-notice">
        <span className="demo-notice-icon">
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

      <div className="risk-toolbar">
        <label className="risk-search">
          <span>⌕</span>

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
            <strong>
              Risk Inventory
            </strong>

            <span>
              Showing {filteredRisks.length} of{' '}
              {demoRisks.length} demo risks
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
                <th>Risk</th>
                <th>Asset</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Likelihood</th>
                <th>
                  Financial Exposure
                </th>
                <th>Status</th>
                <th>Owner</th>
              </tr>
            </thead>

            <tbody>
              {filteredRisks.map((risk) => {
                const linkedAsset =
                  assetById.get(risk.assetId)

                return (
                  <tr key={risk.id}>
                    <td>
                      <div className="risk-name">
                        <strong>
                          {risk.risk}
                        </strong>

                        <span>
                          {risk.id}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="risk-name">
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
                        className={`risk-severity ${risk.severity.toLowerCase()}`}
                      >
                        {risk.severity}
                      </span>
                    </td>

                    <td>
                      {risk.likelihood}
                    </td>

                    <td className="financial-value">
                      {currencyFormatter.format(
                        risk.exposure,
                      )}
                    </td>

                    <td>
                      <span
                        className={`risk-status ${risk.status
                          .toLowerCase()
                          .replace(' ', '-')}`}
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
                    <div className="risk-empty-state">
                      <strong>
                        No risks match the
                        current filters.
                      </strong>

                      <span>
                        Try changing the search
                        or filter selections.
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
    </section>
  )
}

export default RiskRegister
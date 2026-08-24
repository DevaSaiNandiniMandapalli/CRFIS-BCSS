import { useMemo, useState } from 'react'
import { demoScenarios } from '../data/demoScenarios'
import { demoRisks } from '../data/demoRisks'
import { demoAssets } from '../data/demoAssets'
import { calculateTotalScenarioImpact } from '../utils/financialMetrics'
import { formatMoneyOrDash, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import { EmptyState } from '../components/States'
import type {
  ScenarioCategory,
  ScenarioSeverity,
  ScenarioStatus,
} from '../types/scenario'

function ScenarioRegister() {
  const [search, setSearch] = useState('')
  const [severity, setSeverity] =
    useState<ScenarioSeverity | 'All'>('All')
  const [status, setStatus] =
    useState<ScenarioStatus | 'All'>('All')
  const [category, setCategory] =
    useState<ScenarioCategory | 'All'>('All')

  const riskById = useMemo(
    () => new Map(demoRisks.map((risk) => [risk.id, risk])),
    [],
  )

  const assetById = useMemo(
    () => new Map(demoAssets.map((asset) => [asset.id, asset])),
    [],
  )

  const filteredScenarios = useMemo(() => {
    const query = search.trim().toLowerCase()

    return demoScenarios.filter((scenario) => {
      const relatedRisk = riskById.get(scenario.riskId)
      const relatedAsset = assetById.get(scenario.assetId)

      const matchesSearch =
        !query ||
        scenario.name.toLowerCase().includes(query) ||
        scenario.description.toLowerCase().includes(query) ||
        scenario.owner.toLowerCase().includes(query) ||
        relatedRisk?.risk.toLowerCase().includes(query) ||
        relatedAsset?.name.toLowerCase().includes(query)

      const matchesSeverity =
        severity === 'All' || scenario.severity === severity

      const matchesStatus =
        status === 'All' || scenario.status === status

      const matchesCategory =
        category === 'All' || scenario.category === category

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
    riskById,
    assetById,
  ])

  const criticalCount = demoScenarios.filter(
    (scenario) => scenario.severity === 'Critical',
  ).length

  const highCount = demoScenarios.filter(
    (scenario) => scenario.severity === 'High',
  ).length

  const underReviewCount = demoScenarios.filter(
    (scenario) => scenario.status === 'Under Review',
  ).length

  const totalImpact = calculateTotalScenarioImpact(demoScenarios)

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
            <h2>Scenario Analysis</h2>
            <span className="chip">DEMO DATA</span>
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
          <strong className="kpi-value">{demoScenarios.length}</strong>
          <small className="kpi-note">Demo / placeholder</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Critical</span>
          <strong className="kpi-value">{criticalCount}</strong>
          <small className="kpi-note">Highest impact scenarios</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">High</span>
          <strong className="kpi-value">{highCount}</strong>
          <small className="kpi-note">Priority scenarios</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-value">{underReviewCount}</strong>
          <small className="kpi-note">Awaiting assessment</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Demo Estimated Impact</span>
          <strong className="kpi-value">
            {formatMoneyOrDash(totalImpact)}
          </strong>
          <small className="kpi-note">Fictional placeholder value</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

        <div>
          <strong>Demonstration environment</strong>

          <p>
            All scenarios, probabilities, and financial impact values
            on this screen are fictional placeholder data for CRFIS
            interface development. They are not real forecasts or
            financial assessments.
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
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search scenarios"
          />
        </label>

        <select
          value={severity}
          onChange={(event) =>
            setSeverity(
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
            setStatus(
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
            setCategory(
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
              Showing {filteredScenarios.length} of{' '}
              {demoScenarios.length} demo scenarios
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
              {filteredScenarios.map((scenario) => {
                const relatedRisk = riskById.get(scenario.riskId)
                const relatedAsset = assetById.get(scenario.assetId)

                return (
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
                          {relatedRisk?.risk ?? 'Unknown Risk'}
                        </strong>
                        <span>{scenario.riskId}</span>
                      </div>
                    </td>

                    <td>
                      <div className="cell-stack">
                        <strong>
                          {relatedAsset?.name ?? 'Unknown Asset'}
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
                        toMoney(
                          scenario.estimatedImpact,
                          scenario.currency,
                        ),
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
                )
              })}

              {filteredScenarios.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      title="No scenarios match the current filters."
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
          <span>DEMO TOTAL IMPACT</span>
          <strong>
            {formatMoneyOrDash(totalImpact)}
          </strong>
        </div>
      </div>
    </section>
  )
}

export default ScenarioRegister

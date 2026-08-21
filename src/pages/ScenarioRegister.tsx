import { useMemo, useState } from 'react'
import { demoScenarios } from '../data/demoScenarios'
import { demoRisks } from '../data/demoRisks'
import { demoAssets } from '../data/demoAssets'
import type {
  ScenarioCategory,
  ScenarioSeverity,
  ScenarioStatus,
} from '../types/scenario'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

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

  const totalImpact = demoScenarios.reduce(
    (total, scenario) => total + scenario.estimatedImpact,
    0,
  )

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
    <section className="scenario-page">
      <div className="module-heading">
        <div>
          <div className="module-title-row">
            <h2>Scenario Analysis</h2>
            <span className="demo-badge">DEMO DATA</span>
          </div>

          <p>
            Model realistic cybersecurity events and understand their
            potential business and financial consequences.
          </p>
        </div>

        <button className="primary-button" type="button">
          + Add Scenario
        </button>
      </div>

      <div className="risk-kpis">
        <article className="risk-kpi">
          <span>ACTIVE SCENARIOS</span>
          <strong>{demoScenarios.length}</strong>
          <small>DEMO / PLACEHOLDER</small>
        </article>

        <article className="risk-kpi critical-kpi">
          <span>CRITICAL</span>
          <strong>{criticalCount}</strong>
          <small>Highest impact scenarios</small>
        </article>

        <article className="risk-kpi high-kpi">
          <span>HIGH</span>
          <strong>{highCount}</strong>
          <small>Priority scenarios</small>
        </article>

        <article className="risk-kpi">
          <span>UNDER REVIEW</span>
          <strong>{underReviewCount}</strong>
          <small>Awaiting assessment</small>
        </article>

        <article className="risk-kpi exposure-kpi">
          <span>DEMO ESTIMATED IMPACT</span>
          <strong>{currencyFormatter.format(totalImpact)}</strong>
          <small>Fictional placeholder value</small>
        </article>
      </div>

      <div className="demo-notice">
        <span className="demo-notice-icon">i</span>

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

      <div className="risk-toolbar">
        <label className="risk-search">
          <span>⌕</span>

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
            <strong>Scenario Inventory</strong>

            <span>
              Showing {filteredScenarios.length} of{' '}
              {demoScenarios.length} demo scenarios
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
                <th>Scenario</th>
                <th>Related Risk</th>
                <th>Asset</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Probability</th>
                <th>Estimated Impact</th>
                <th>Business Impact</th>
                <th>Status</th>
                <th>Owner</th>
              </tr>
            </thead>

            <tbody>
              {filteredScenarios.map((scenario) => {
                const relatedRisk = riskById.get(scenario.riskId)
                const relatedAsset = assetById.get(scenario.assetId)

                return (
                  <tr key={scenario.id}>
                    <td>
                      <div className="risk-name">
                        <strong>{scenario.name}</strong>
                        <span>{scenario.id}</span>
                      </div>
                    </td>

                    <td>
                      <div className="risk-name">
                        <strong>
                          {relatedRisk?.risk ?? 'Unknown Risk'}
                        </strong>
                        <span>{scenario.riskId}</span>
                      </div>
                    </td>

                    <td>
                      <div className="risk-name">
                        <strong>
                          {relatedAsset?.name ?? 'Unknown Asset'}
                        </strong>
                        <span>{scenario.assetId}</span>
                      </div>
                    </td>

                    <td>{scenario.category}</td>

                    <td>
                      <span
                        className={`risk-severity ${scenario.severity.toLowerCase()}`}
                      >
                        {scenario.severity}
                      </span>
                    </td>

                    <td>{scenario.probability}</td>

                    <td className="financial-value">
                      {currencyFormatter.format(
                        scenario.estimatedImpact,
                      )}
                    </td>

                    <td>{scenario.businessImpact}</td>

                    <td>
                      <span
                        className={`risk-status ${scenario.status
                          .toLowerCase()
                          .replaceAll(' ', '-')}`}
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
                    <div className="risk-empty-state">
                      <strong>
                        No scenarios match the current filters.
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
            {currencyFormatter.format(totalImpact)}
          </strong>
        </div>
      </div>
    </section>
  )
}

export default ScenarioRegister
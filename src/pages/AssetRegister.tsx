import { useMemo, useState } from 'react'
import { demoAssets } from '../data/demoAssets'
import {
  calculateTotalAssetValue,
} from '../utils/financialMetrics'
import type {
  AssetCriticality,
  AssetStatus,
  AssetType,
} from '../types/asset'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function AssetRegister() {
  const [search, setSearch] = useState('')
  const [criticality, setCriticality] =
    useState<AssetCriticality | 'All'>('All')
  const [status, setStatus] =
    useState<AssetStatus | 'All'>('All')
  const [type, setType] =
    useState<AssetType | 'All'>('All')

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase()

    return demoAssets.filter((asset) => {
      const matchesSearch =
        !query ||
        asset.name.toLowerCase().includes(query) ||
        asset.businessUnit.toLowerCase().includes(query) ||
        asset.owner.toLowerCase().includes(query)

      const matchesCriticality =
        criticality === 'All' ||
        asset.criticality === criticality

      const matchesStatus =
        status === 'All' ||
        asset.status === status

      const matchesType =
        type === 'All' ||
        asset.type === type

      return (
        matchesSearch &&
        matchesCriticality &&
        matchesStatus &&
        matchesType
      )
    })
  }, [search, criticality, status, type])

  const criticalCount = demoAssets.filter(
    (asset) => asset.criticality === 'Critical',
  ).length

  const highValueCount = demoAssets.filter(
    (asset) => asset.annualValue >= 1000000,
  ).length

  const underReviewCount = demoAssets.filter(
    (asset) => asset.status === 'Under Review',
  ).length

  const totalAnnualValue =
    calculateTotalAssetValue(demoAssets)

  const clearFilters = () => {
    setSearch('')
    setCriticality('All')
    setStatus('All')
    setType('All')
  }

  const hasFilters =
    search !== '' ||
    criticality !== 'All' ||
    status !== 'All' ||
    type !== 'All'

  return (
    <section className="asset-register-page">
      <div className="module-heading">
        <div>
          <div className="module-title-row">
            <h2>Asset Register</h2>
            <span className="demo-badge">DEMO DATA</span>
          </div>

          <p>
            Enterprise assets and business-critical resources
            tracked for cybersecurity risk analysis.
          </p>
        </div>

        <button
          className="primary-button"
          type="button"
        >
          + Add Asset
        </button>
      </div>

      <div className="risk-kpis">
        <article className="risk-kpi">
          <span>TOTAL ASSETS</span>
          <strong>{demoAssets.length}</strong>
          <small>DEMO / PLACEHOLDER</small>
        </article>

        <article className="risk-kpi critical-kpi">
          <span>CRITICAL ASSETS</span>
          <strong>{criticalCount}</strong>
          <small>Highest business priority</small>
        </article>

        <article className="risk-kpi high-kpi">
          <span>HIGH VALUE</span>
          <strong>{highValueCount}</strong>
          <small>Demo annual value ≥ $1M</small>
        </article>

        <article className="risk-kpi">
          <span>UNDER REVIEW</span>
          <strong>{underReviewCount}</strong>
          <small>Requires assessment</small>
        </article>

        <article className="risk-kpi exposure-kpi">
          <span>DEMO ANNUAL VALUE</span>
          <strong>
            {currencyFormatter.format(totalAnnualValue)}
          </strong>
          <small>Fictional placeholder value</small>
        </article>
      </div>

      <div className="demo-notice">
        <span className="demo-notice-icon">i</span>

        <div>
          <strong>Demonstration environment</strong>

          <p>
            All assets and financial values on this screen are
            fictional placeholder data for CRFIS interface
            development. They are not real company assets or
            financial valuations.
          </p>
        </div>
      </div>

      <div className="risk-toolbar">
        <label className="risk-search">
          <span>⌕</span>

          <input
            type="search"
            placeholder="Search assets, business units, owners..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            aria-label="Search assets"
          />
        </label>

        <select
          value={criticality}
          onChange={(event) =>
            setCriticality(
              event.target.value as AssetCriticality | 'All',
            )
          }
          aria-label="Filter by criticality"
        >
          <option value="All">All Criticality</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as AssetStatus | 'All',
            )
          }
          aria-label="Filter by status"
        >
          <option value="All">All Statuses</option>
          <option value="At Risk">At Risk</option>
          <option value="Monitored">Monitored</option>
          <option value="Healthy">Healthy</option>
          <option value="Under Review">
            Under Review
          </option>
        </select>

        <select
          value={type}
          onChange={(event) =>
            setType(
              event.target.value as AssetType | 'All',
            )
          }
          aria-label="Filter by asset type"
        >
          <option value="All">All Asset Types</option>
          <option value="Infrastructure">
            Infrastructure
          </option>
          <option value="Application">
            Application
          </option>
          <option value="Data">Data</option>
          <option value="Cloud">Cloud</option>
          <option value="Endpoint">Endpoint</option>
          <option value="Third Party">
            Third Party
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
            <strong>Asset Inventory</strong>

            <span>
              Showing {filteredAssets.length} of{' '}
              {demoAssets.length} demo assets
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
                <th>Asset</th>
                <th>Type</th>
                <th>Business Unit</th>
                <th>Criticality</th>
                <th>Annual Value</th>
                <th>Status</th>
                <th>Owner</th>
              </tr>
            </thead>

            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <div className="risk-name">
                      <strong>{asset.name}</strong>
                      <span>{asset.id}</span>
                    </div>
                  </td>

                  <td>{asset.type}</td>

                  <td>{asset.businessUnit}</td>

                  <td>
                    <span
                      className={`risk-severity ${asset.criticality.toLowerCase()}`}
                    >
                      {asset.criticality}
                    </span>
                  </td>

                  <td className="financial-value">
                    {currencyFormatter.format(
                      asset.annualValue,
                    )}
                  </td>

                  <td>
                    <span
                      className={`risk-status ${asset.status
                        .toLowerCase()
                        .replaceAll(' ', '-')}`}
                    >
                      {asset.status}
                    </span>
                  </td>

                  <td>{asset.owner}</td>
                </tr>
              ))}

              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="risk-empty-state">
                      <strong>
                        No assets match the current filters.
                      </strong>

                      <span>
                        Try changing the search or filter
                        selections.
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

export default AssetRegister
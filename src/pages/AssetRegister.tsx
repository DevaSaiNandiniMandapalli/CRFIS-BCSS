import { useMemo, useState } from 'react'
import { demoAssets } from '../data/demoAssets'
import { calculateTotalAssetValue } from '../utils/financialMetrics'
import { formatMoneyOrDash, slugify } from '../utils/format'
import { toMoney } from '../types/money'
import { EmptyState } from '../components/States'
import type {
  AssetCriticality,
  AssetStatus,
  AssetType,
} from '../types/asset'

const highValueThreshold = toMoney(1000000, 'USD')

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
    <section className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <div className="page-title-row">
            <h2>Asset Register</h2>
            <span className="chip">DEMO DATA</span>
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
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Total Assets</span>
          <strong className="kpi-value">{demoAssets.length}</strong>
          <small className="kpi-note">Demo / placeholder</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Critical Assets</span>
          <strong className="kpi-value">{criticalCount}</strong>
          <small className="kpi-note">Highest business priority</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">High Value</span>
          <strong className="kpi-value">{highValueCount}</strong>
          <small className="kpi-note">
            Demo annual value ≥{' '}
            {formatMoneyOrDash(highValueThreshold, { compact: true })}
          </small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-value">{underReviewCount}</strong>
          <small className="kpi-note">Requires assessment</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Demo Annual Value</span>
          <strong className="kpi-value">
            {formatMoneyOrDash(totalAnnualValue)}
          </strong>
          <small className="kpi-note">Fictional placeholder value</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

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

      <div className="toolbar" role="group" aria-label="Asset filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

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
            <strong>Asset Inventory</strong>

            <span>
              Showing {filteredAssets.length} of{' '}
              {demoAssets.length} demo assets
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
                <th scope="col">Asset</th>
                <th scope="col">Type</th>
                <th scope="col">Business Unit</th>
                <th scope="col">Criticality</th>
                <th scope="col" className="money">
                  Annual Value
                </th>
                <th scope="col">Status</th>
                <th scope="col">Owner</th>
              </tr>
            </thead>

            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <div className="cell-stack">
                      <strong>{asset.name}</strong>
                      <span>{asset.id}</span>
                    </div>
                  </td>

                  <td>{asset.type}</td>

                  <td>{asset.businessUnit}</td>

                  <td>
                    <span
                      className={`badge badge--${slugify(asset.criticality)}`}
                    >
                      {asset.criticality}
                    </span>
                  </td>

                  <td className="money">
                    {formatMoneyOrDash(
                      toMoney(asset.annualValue, asset.currency),
                    )}
                  </td>

                  <td>
                    <span
                      className={`badge badge--${slugify(asset.status)}`}
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
                    <EmptyState
                      title="No assets match the current filters."
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

export default AssetRegister

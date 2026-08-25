import { useMemo, useState } from 'react'
import { useApiResource, useDebouncedValue } from '../hooks/useApiResource'
import { formatMoneyOrDash, slugify } from '../utils/format'
import { SUPPORTED_CURRENCIES, toMoney } from '../types/money'
import type {
  AssetListResponse,
  AssetDto,
} from '../types/api'
import type {
  AssetCriticality,
  AssetStatus,
  AssetType,
} from '../types/asset'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { FormModal, type FormField } from '../components/FormModal'
import { useFormSubmit } from '../hooks/useFormSubmit'
import { apiRequest } from '../api/client'

const PAGE_SIZE = 20

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }

  return search.toString()
}

/** Renders per-currency totals without ever mixing currencies. */
function formatCurrencyBuckets(buckets: Record<string, string> | undefined): string {
  const entries = Object.entries(buckets ?? {})

  if (entries.length === 0) {
    return '—'
  }

  return entries
    .map(([currency, amount]) =>
      formatMoneyOrDash(toMoney(amount, currency as AssetDto['currency'])),
    )
    .join('  +  ')
}

function AssetRegister() {
  const [search, setSearch] = useState('')
  const [criticality, setCriticality] =
    useState<AssetCriticality | 'All'>('All')
  const [status, setStatus] =
    useState<AssetStatus | 'All'>('All')
  const [type, setType] =
    useState<AssetType | 'All'>('All')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search)

  const url = useMemo(() => {
    const query = buildQuery({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      criticality: criticality === 'All' ? undefined : criticality,
      status: status === 'All' ? undefined : status,
      type: type === 'All' ? undefined : type,
    })

    return `/api/assets?${query}`
  }, [page, debouncedSearch, criticality, status, type])

  const { data, loading, error, reload } =
    useApiResource<AssetListResponse>(url)

  const assets = data?.data ?? []
  const meta = data?.meta
  const stats = meta?.stats

  const clearFilters = () => {
    setSearch('')
    setCriticality('All')
    setStatus('All')
    setType('All')
    setPage(1)
  }

  const hasFilters =
    search !== '' ||
    criticality !== 'All' ||
    status !== 'All' ||
    type !== 'All'

  // Any filter change returns the user to the first page.
  const updateFilter = <T,>(
    setter: (value: T) => void,
  ) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const setCriticalityAndReset = updateFilter(setCriticality)
  const setStatusAndReset = updateFilter(setStatus)
  const setTypeAndReset = updateFilter(setType)
  const setSearchAndReset = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const showTableContent = !loading && !error

  /* =====================
     Phase 4 write actions (create / edit / archive)
  ===================== */
  const currencyOptions = SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))

  function assetFields(create: boolean): FormField[] {
    const fields: FormField[] = []

    if (create) {
      fields.push({
        name: 'id',
        label: 'Asset ID',
        type: 'text',
        required: true,
        placeholder: 'e.g. AST-DATA-01',
        help: 'Letters, digits, dots, underscores and hyphens. Unique forever.',
      })
    }

    fields.push(
      { name: 'name', label: 'Name', type: 'text', required: true },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: ['Infrastructure', 'Application', 'Data', 'Cloud', 'Endpoint', 'Third Party']
          .map((value) => ({ value, label: value })),
      },
      { name: 'businessUnit', label: 'Business Unit', type: 'text', required: true },
      {
        name: 'criticality',
        label: 'Criticality',
        type: 'select',
        required: true,
        options: ['Critical', 'High', 'Medium', 'Low'].map((value) => ({ value, label: value })),
      },
      {
        name: 'currency',
        label: 'Currency',
        type: 'select',
        required: true,
        options: currencyOptions,
        help: 'Explicit ISO-4217 code - never assumed.',
      },
      {
        name: 'annualValue',
        label: 'Annual Value',
        type: 'money',
        required: true,
        placeholder: '1250000.50',
        help: 'Decimal string with up to two fraction digits.',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: ['At Risk', 'Monitored', 'Healthy', 'Under Review']
          .map((value) => ({ value, label: value })),
      },
      { name: 'owner', label: 'Owner', type: 'text', required: true },
    )

    return fields
  }

  type ModalState =
    | { mode: 'closed' }
    | { mode: 'create' }
    | { mode: 'edit'; record: AssetDto }

  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const { run } = useFormSubmit()

  function errorText(caught: unknown): string {
    return caught instanceof Error ? caught.message : 'Request failed.'
  }

  async function handleAssetSubmit(values: Record<string, string | string[]>) {
    const payload = {
      id: String(values.id),
      name: String(values.name),
      type: String(values.type),
      businessUnit: String(values.businessUnit),
      criticality: String(values.criticality),
      currency: String(values.currency),
      annualValue: String(values.annualValue).trim(),
      status: String(values.status),
      owner: String(values.owner),
    }

    const done = await run(async () => {
      if (modal.mode === 'edit') {
        await apiRequest('PATCH', `/api/assets/${modal.record.id}`, payload)
        setBanner({ kind: 'success', text: `Asset "${modal.record.id}" updated.` })
      } else {
        await apiRequest('POST', '/api/assets', payload)
        setBanner({ kind: 'success', text: `Asset "${payload.id}" created.` })
      }

      reload()
    })

    if (done) {
      setModal({ mode: 'closed' })
    }
  }

  async function archiveAsset(asset: AssetDto) {
    if (!window.confirm(`Archive asset "${asset.id}"? It will disappear from all read views.`)) {
      return
    }

    try {
      await apiRequest('DELETE', `/api/assets/${asset.id}`)
      setBanner({ kind: 'success', text: `Asset "${asset.id}" archived.` })
      reload()
    } catch (caught) {
      setBanner({ kind: 'error', text: errorText(caught) })
    }
  }

  return (
    <section className="page">
      <header className="page-intro">
        <div className="page-intro-text">
          <div className="page-title-row">
            <h2>Asset Register</h2>
            <span className="chip">LIVE DATA</span>
          </div>

          <p>
            Enterprise assets and business-critical resources
            tracked for cybersecurity risk analysis.
          </p>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => {
            setBanner(null)
            setModal({ mode: 'create' })
          }}
        >
          + Add Asset
        </button>
      </header>

      {banner && (
        <div className={`action-banner ${banner.kind}`} role="status">
          <span>{banner.text}</span>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {modal.mode !== 'closed' && (
        <FormModal
          title={modal.mode === 'create' ? 'Add Asset' : `Edit Asset ${modal.record.id}`}
          fields={
            modal.mode === 'create'
              ? assetFields(true)
              : assetFields(false).map((field) => ({
                  ...field,
                  initial:
                    (modal.record as unknown as Record<string, string>)[field.name] ?? '',
                }))
          }
          submitLabel={modal.mode === 'create' ? 'Create Asset' : 'Save Changes'}
          onSubmit={handleAssetSubmit}
          onClose={() => setModal({ mode: 'closed' })}
          notice="Writes require an API access token configured in Settings. Money is stored exactly as typed - decimal strings with an explicit currency."
        />
      )}

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Total Assets</span>
          <strong className="kpi-value">{meta?.total ?? 0}</strong>
          <small className="kpi-note">Matching current filters</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Critical Assets</span>
          <strong className="kpi-value">
            {stats?.byCriticality['Critical'] ?? 0}
          </strong>
          <small className="kpi-note">Highest business priority</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">High Value</span>
          <strong className="kpi-value">{stats?.highValueCount ?? 0}</strong>
          <small className="kpi-note">Annual value ≥ 1M units</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-value">
            {stats?.byStatus['Under Review'] ?? 0}
          </strong>
          <small className="kpi-note">Requires assessment</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Total Annual Value</span>
          <strong className="kpi-value">
            {formatCurrencyBuckets(stats?.annualValueByCurrency)}
          </strong>
          <small className="kpi-note">Per currency, never mixed</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

        <div>
          <strong>Connected to the CRFIS database</strong>

          <p>
            Assets are served live from the CRFIS database. Create, edit and
            archive actions require an API access token (Settings). Monetary
            amounts keep their record currency; no conversion is applied.
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
              setSearchAndReset(event.target.value)
            }
            aria-label="Search assets"
          />
        </label>

        <select
          value={criticality}
          onChange={(event) =>
            setCriticalityAndReset(
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
            setStatusAndReset(
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
            setTypeAndReset(
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
              Showing {assets.length} of{' '}
              {meta?.total ?? 0} assets · page{' '}
              {meta?.page ?? 1} of {meta?.pageCount ?? 1}
            </span>
          </div>

          <span className="chip chip--muted">
            LIVE DATABASE
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
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8}>
                    <LoadingState title="Loading assets..." />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={8}>
                    <ErrorState
                      title="Assets could not be loaded."
                      message={error}
                      action={
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={reload}
                        >
                          Retry
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}

              {showTableContent && assets.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title={
                        hasFilters
                          ? 'No assets match the current filters.'
                          : 'No assets recorded yet.'
                      }
                      message={
                        hasFilters
                          ? 'Try changing the search or filter selections.'
                          : 'The CRFIS database does not contain any assets yet.'
                      }
                      action={
                        hasFilters ? (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={clearFilters}
                          >
                            Clear filters
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              )}

              {showTableContent &&
                assets.map((asset) => (
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

                    <td>
                      <span className="row-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setBanner(null)
                            setModal({ mode: 'edit', record: asset })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => void archiveAsset(asset)}
                        >
                          Archive
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {showTableContent && (meta?.total ?? 0) > 0 && (
          <div className="table-footer">
            <span>
              Page {meta?.page ?? 1} of {meta?.pageCount ?? 1}
            </span>

            <div className="pager-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={(meta?.page ?? 1) <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ← Prev
              </button>

              <button
                className="secondary-button"
                type="button"
                disabled={(meta?.page ?? 1) >= (meta?.pageCount ?? 1)}
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default AssetRegister

import { useMemo, useState } from 'react'
import { useApiResource, useDebouncedValue } from '../hooks/useApiResource'
import { formatMoneyOrDash, slugify } from '../utils/format'
import { SUPPORTED_CURRENCIES, toMoney } from '../types/money'
import type {
  AssetListResponse,
  RiskListResponse,
  RiskDto,
} from '../types/api'
import type {
  RiskCategory,
  RiskSeverity,
  RiskStatus,
} from '../types/risk'
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
      formatMoneyOrDash(toMoney(amount, currency as RiskDto['currency'])),
    )
    .join('  +  ')
}

function RiskRegister() {
  const [search, setSearch] = useState('')
  const [severity, setSeverity] =
    useState<RiskSeverity | 'All'>('All')
  const [status, setStatus] =
    useState<RiskStatus | 'All'>('All')
  const [category, setCategory] =
    useState<RiskCategory | 'All'>('All')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search)

  const url = useMemo(() => {
    const query = buildQuery({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      severity: severity === 'All' ? undefined : severity,
      status: status === 'All' ? undefined : status,
      category: category === 'All' ? undefined : category,
    })

    return `/api/risks?${query}`
  }, [page, debouncedSearch, severity, status, category])

  const { data, loading, error, reload } =
    useApiResource<RiskListResponse>(url)

  const risks = data?.data ?? []
  const meta = data?.meta
  const stats = meta?.stats

  const clearFilters = () => {
    setSearch('')
    setSeverity('All')
    setStatus('All')
    setCategory('All')
    setPage(1)
  }

  const hasFilters =
    search !== '' ||
    severity !== 'All' ||
    status !== 'All' ||
    category !== 'All'

  // Any filter change returns the user to the first page.
  const updateFilter = <T,>(
    setter: (value: T) => void,
  ) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const setSeverityAndReset = updateFilter(setSeverity)
  const setStatusAndReset = updateFilter(setStatus)
  const setCategoryAndReset = updateFilter(setCategory)
  const setSearchAndReset = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const showTableContent = !loading && !error

  /* =====================
     Phase 4 write actions (create / edit / archive)
  ===================== */
  // Parent picker options - visible assets only.
  const assetsResource = useApiResource<AssetListResponse>(
    '/api/assets?page=1&pageSize=100',
  )
  const assetOptions = (assetsResource.data?.data ?? []).map((asset) => ({
    value: asset.id,
    label: `${asset.id} — ${asset.name}`,
  }))

  function riskFields(create: boolean): FormField[] {
    const fields: FormField[] = []

    if (create) {
      fields.push({
        name: 'id', label: 'Risk ID', type: 'text', required: true,
        placeholder: 'e.g. RSK-IDENT-01',
        help: 'Unique forever, including after archive.',
      })
    }

    fields.push(
      { name: 'risk', label: 'Risk Description', type: 'textarea', required: true },
      {
        name: 'assetId', label: 'Related Asset', type: 'select', required: true,
        options: assetOptions,
        help: 'Archived or unknown assets are rejected.',
      },
      {
        name: 'category', label: 'Category', type: 'select', required: true,
        options: ['Ransomware', 'Identity', 'Data Security', 'Cloud Security', 'Third Party', 'Insider Risk']
          .map((value) => ({ value, label: value })),
      },
      {
        name: 'severity', label: 'Severity', type: 'select', required: true,
        options: ['Critical', 'High', 'Medium', 'Low'].map((value) => ({ value, label: value })),
      },
      {
        name: 'likelihood', label: 'Likelihood', type: 'select', required: true,
        options: ['Very High', 'High', 'Medium', 'Low'].map((value) => ({ value, label: value })),
      },
      {
        name: 'currency', label: 'Currency', type: 'select', required: true,
        options: SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code })),
        help: 'Currency of the exposure amount.',
      },
      {
        name: 'exposure', label: 'Exposure', type: 'money', required: true,
        placeholder: '2500000.00',
        help: 'Decimal string with up to two fraction digits.',
      },
      {
        name: 'status', label: 'Status', type: 'select', required: true,
        options: ['Open', 'Under Review', 'Mitigated', 'Accepted'].map((value) => ({ value, label: value })),
      },
      { name: 'owner', label: 'Owner', type: 'text', required: true },
    )

    return fields
  }

  type ModalState =
    | { mode: 'closed' }
    | { mode: 'create' }
    | { mode: 'edit'; record: RiskDto }

  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const { run } = useFormSubmit()

  function errorText(caught: unknown): string {
    return caught instanceof Error ? caught.message : 'Request failed.'
  }

  async function handleRiskSubmit(values: Record<string, string | string[]>) {
    const payload = {
      id: String(values.id),
      risk: String(values.risk),
      assetId: String(values.assetId),
      category: String(values.category),
      severity: String(values.severity),
      likelihood: String(values.likelihood),
      currency: String(values.currency),
      exposure: String(values.exposure).trim(),
      status: String(values.status),
      owner: String(values.owner),
    }

    const done = await run(async () => {
      if (modal.mode === 'edit') {
        await apiRequest('PATCH', `/api/risks/${modal.record.id}`, payload)
        setBanner({ kind: 'success', text: `Risk "${modal.record.id}" updated.` })
      } else {
        await apiRequest('POST', '/api/risks', payload)
        setBanner({ kind: 'success', text: `Risk "${payload.id}" created.` })
      }

      reload()
    })

    if (done) {
      setModal({ mode: 'closed' })
    }
  }

  async function archiveRisk(risk: RiskDto) {
    if (!window.confirm(`Archive risk "${risk.id}"? It will leave every read view.`)) {
      return
    }

    try {
      await apiRequest('DELETE', `/api/risks/${risk.id}`)
      setBanner({ kind: 'success', text: `Risk "${risk.id}" archived.` })
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
            <h2>Risk Register</h2>

            <span className="chip">LIVE DATA</span>
          </div>

          <p>
            Enterprise cybersecurity exposure and
            financial risk inventory.
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
          + Add Risk
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
          title={modal.mode === 'create' ? 'Add Risk' : `Edit Risk ${modal.record.id}`}
          fields={
            modal.mode === 'create'
              ? riskFields(true)
              : riskFields(false).map((field) => ({
                  ...field,
                  initial:
                    (modal.record as unknown as Record<string, string>)[field.name] ?? '',
                }))
          }
          submitLabel={modal.mode === 'create' ? 'Create Risk' : 'Save Changes'}
          onSubmit={handleRiskSubmit}
          onClose={() => setModal({ mode: 'closed' })}
          notice="Writes require an API access token configured in Settings. Exposure is a decimal string with an explicit currency."
        />
      )}

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Active Risks</span>
          <strong className="kpi-value">{meta?.total ?? 0}</strong>
          <small className="kpi-note">Matching current filters</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Critical</span>
          <strong className="kpi-value">
            {stats?.bySeverity['Critical'] ?? 0}
          </strong>
          <small className="kpi-note">Requires attention</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">High</span>
          <strong className="kpi-value">
            {stats?.bySeverity['High'] ?? 0}
          </strong>
          <small className="kpi-note">Priority risks</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Medium</span>
          <strong className="kpi-value">
            {stats?.bySeverity['Medium'] ?? 0}
          </strong>
          <small className="kpi-note">Monitor and manage</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Total Exposure</span>
          <strong className="kpi-value">
            {formatCurrencyBuckets(stats?.exposureByCurrency)}
          </strong>
          <small className="kpi-note">Per currency, never mixed</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">
          i
        </span>

        <div>
          <strong>
            Connected to the CRFIS database
          </strong>

          <p>
            Risks are served live from the CRFIS database through the
            read-only API with their related assets. Monetary amounts keep
            their record currency; no conversion is applied.
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
              setSearchAndReset(event.target.value)
            }
            aria-label="Search risks"
          />
        </label>

        <select
          value={severity}
          onChange={(event) =>
            setSeverityAndReset(
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
            setStatusAndReset(
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
            setCategoryAndReset(
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
              Showing {risks.length} of{' '}
              {meta?.total ?? 0} risks · page{' '}
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
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9}>
                    <LoadingState title="Loading risks..." />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={9}>
                    <ErrorState
                      title="Risks could not be loaded."
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

              {showTableContent && risks.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      title={
                        hasFilters
                          ? 'No risks match the current filters.'
                          : 'No risks recorded yet.'
                      }
                      message={
                        hasFilters
                          ? 'Try changing the search or filter selections.'
                          : 'The CRFIS database does not contain any risks yet.'
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
                risks.map((risk) => (
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
                          {risk.asset?.name ?? 'Unknown asset'}
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

                    <td>
                      <span className="row-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setBanner(null)
                            setModal({ mode: 'edit', record: risk })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => void archiveRisk(risk)}
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

export default RiskRegister

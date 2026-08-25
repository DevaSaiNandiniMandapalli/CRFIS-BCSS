import { useMemo, useState } from 'react'
import { useApiResource, useDebouncedValue } from '../hooks/useApiResource'
import { formatDate, formatMoneyOrDash, slugify } from '../utils/format'
import { SUPPORTED_CURRENCIES, toMoney } from '../types/money'
import type {
  AssetListResponse,
  RemediationDto,
  RemediationListResponse,
  RiskListResponse,
} from '../types/api'
import type {
  RemediationCategory,
  RemediationPriority,
  RemediationStatus,
} from '../types/remediation'
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
      formatMoneyOrDash(toMoney(amount, currency as RemediationDto['currency'])),
    )
    .join('  +  ')
}

function Remediation() {
  const [search, setSearch] = useState('')
  const [priority, setPriority] =
    useState<RemediationPriority | 'All'>('All')
  const [status, setStatus] =
    useState<RemediationStatus | 'All'>('All')
  const [category, setCategory] =
    useState<RemediationCategory | 'All'>('All')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search)

  const url = useMemo(() => {
    const query = buildQuery({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      priority: priority === 'All' ? undefined : priority,
      status: status === 'All' ? undefined : status,
      category: category === 'All' ? undefined : category,
    })

    return `/api/remediations?${query}`
  }, [page, debouncedSearch, priority, status, category])

  const { data, loading, error, reload } =
    useApiResource<RemediationListResponse>(url)

  const remediations = data?.data ?? []
  const meta = data?.meta
  const stats = meta?.stats

  const clearFilters = () => {
    setSearch('')
    setPriority('All')
    setStatus('All')
    setCategory('All')
    setPage(1)
  }

  const hasFilters =
    search !== '' ||
    priority !== 'All' ||
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

  const setPriorityAndReset = updateFilter(setPriority)
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
  // Parent pickers - visible parents only.
  const risksResource = useApiResource<RiskListResponse>('/api/risks?page=1&pageSize=100')
  const assetsResource = useApiResource<AssetListResponse>('/api/assets?page=1&pageSize=100')
  const riskOptions = (risksResource.data?.data ?? []).map((risk) => ({
    value: risk.id,
    label: `${risk.id} — ${risk.risk.slice(0, 60)}`,
  }))
  const assetOptions = (assetsResource.data?.data ?? []).map((asset) => ({
    value: asset.id,
    label: `${asset.id} — ${asset.name}`,
  }))

  function remediationFields(create: boolean): FormField[] {
    const fields: FormField[] = []

    if (create) {
      fields.push({
        name: 'id', label: 'Remediation ID', type: 'text', required: true,
        placeholder: 'e.g. REM-ACCESS-01',
        help: 'Unique forever, including after archive.',
      })
    }

    fields.push(
      { name: 'action', label: 'Action', type: 'textarea', required: true },
      {
        name: 'riskId', label: 'Related Risk', type: 'select', required: true,
        options: riskOptions,
      },
      {
        name: 'assetId', label: 'Related Asset', type: 'select', required: true,
        options: assetOptions,
      },
      {
        name: 'category', label: 'Category', type: 'select', required: true,
        options: ['Access Control', 'Infrastructure', 'Data Protection', 'Cloud Security', 'Backup & Recovery', 'Third Party']
          .map((value) => ({ value, label: value })),
      },
      {
        name: 'priority', label: 'Priority', type: 'select', required: true,
        options: ['Critical', 'High', 'Medium', 'Low'].map((value) => ({ value, label: value })),
      },
      { name: 'owner', label: 'Owner', type: 'text', required: true },
      { name: 'dueDate', label: 'Due Date', type: 'date', required: true },
      {
        name: 'status', label: 'Status', type: 'select', required: true,
        options: ['Open', 'In Progress', 'Blocked', 'Completed'].map((value) => ({ value, label: value })),
      },
      {
        name: 'currency', label: 'Currency', type: 'select', required: true,
        options: SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code })),
      },
      {
        name: 'estimatedCost', label: 'Estimated Cost', type: 'money', required: true,
        placeholder: '450000.00',
      },
      {
        name: 'expectedReduction', label: 'Expected Reduction', type: 'money', required: true,
        placeholder: '1200000.00',
      },
    )

    return fields
  }

  type ModalState =
    | { mode: 'closed' }
    | { mode: 'create' }
    | { mode: 'edit'; record: RemediationDto }

  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const { run } = useFormSubmit()

  function errorText(caught: unknown): string {
    return caught instanceof Error ? caught.message : 'Request failed.'
  }

  function remediationPayload(values: Record<string, string | string[]>) {
    return {
      id: String(values.id),
      action: String(values.action),
      riskId: String(values.riskId),
      assetId: String(values.assetId),
      category: String(values.category),
      priority: String(values.priority),
      owner: String(values.owner),
      dueDate: String(values.dueDate),
      status: String(values.status),
      currency: String(values.currency),
      estimatedCost: String(values.estimatedCost).trim(),
      expectedReduction: String(values.expectedReduction).trim(),
    }
  }

  async function handleRemediationSubmit(values: Record<string, string | string[]>) {
    const payload = remediationPayload(values)

    const done = await run(async () => {
      if (modal.mode === 'edit') {
        await apiRequest('PATCH', `/api/remediations/${modal.record.id}`, payload)
        setBanner({ kind: 'success', text: `Remediation "${modal.record.id}" updated.` })
      } else {
        await apiRequest('POST', '/api/remediations', payload)
        setBanner({ kind: 'success', text: `Remediation "${payload.id}" created.` })
      }

      reload()
    })

    if (done) {
      setModal({ mode: 'closed' })
    }
  }

  async function archiveRemediation(item: RemediationDto) {
    if (!window.confirm(`Archive remediation "${item.id}"? It will leave every read view.`)) {
      return
    }

    try {
      await apiRequest('DELETE', `/api/remediations/${item.id}`)
      setBanner({ kind: 'success', text: `Remediation "${item.id}" archived.` })
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
            <h2>Remediation</h2>

            <span className="chip">LIVE DATA</span>
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
          onClick={() => {
            setBanner(null)
            setModal({ mode: 'create' })
          }}
        >
          + Add Action
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
          title={modal.mode === 'create' ? 'Add Remediation Action' : `Edit ${modal.record.id}`}
          fields={
            modal.mode === 'create'
              ? remediationFields(true)
              : remediationFields(false).map((field) => ({
                  ...field,
                  initial:
                    field.type === 'date'
                      ? (modal.record as unknown as Record<string, string>)[field.name]?.slice(0, 10) ?? ''
                      : (modal.record as unknown as Record<string, string>)[field.name] ?? '',
                }))
          }
          submitLabel={modal.mode === 'create' ? 'Create Action' : 'Save Changes'}
          onSubmit={handleRemediationSubmit}
          onClose={() => setModal({ mode: 'closed' })}
          notice="Writes require an API access token configured in Settings. Money is a decimal string with an explicit currency."
        />
      )}

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Open Actions</span>
          <strong className="kpi-value">
            {stats?.byStatus['Open'] ?? 0}
          </strong>
          <small className="kpi-note">Requires action</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Overdue</span>
          <strong className="kpi-value">{stats?.overdueCount ?? 0}</strong>
          <small className="kpi-note">Past due date, not completed</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">In Progress</span>
          <strong className="kpi-value">
            {stats?.byStatus['In Progress'] ?? 0}
          </strong>
          <small className="kpi-note">Currently being addressed</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Completed</span>
          <strong className="kpi-value">
            {stats?.byStatus['Completed'] ?? 0}
          </strong>
          <small className="kpi-note">Completed actions</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Expected Reduction</span>
          <strong className="kpi-value">
            {formatCurrencyBuckets(stats?.expectedReductionByCurrency)}
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
            Remediation actions are served live from the CRFIS database
            through the read-only API with their related risks and assets.
            Monetary amounts keep their record currency; no conversion is
            applied.
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
              setSearchAndReset(event.target.value)
            }
            aria-label="Search remediation actions"
          />
        </label>

        <select
          value={priority}
          onChange={(event) =>
            setPriorityAndReset(
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
            setStatusAndReset(
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
            setCategoryAndReset(
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
              Showing {remediations.length} of{' '}
              {meta?.total ?? 0} actions · page{' '}
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
              {loading && (
                <tr>
                  <td colSpan={9}>
                    <LoadingState title="Loading remediation actions..." />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={9}>
                    <ErrorState
                      title="Remediation actions could not be loaded."
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

              {showTableContent && remediations.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      title={
                        hasFilters
                          ? 'No remediation actions match the current filters.'
                          : 'No remediation actions recorded yet.'
                      }
                      message={
                        hasFilters
                          ? 'Try changing the search or filter selections.'
                          : 'The CRFIS database does not contain any remediation actions yet.'
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
                remediations.map((item) => (
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
                          {item.risk?.risk ?? 'Unknown risk'}
                        </strong>

                        <span>
                          {item.riskId}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="cell-stack">
                        <strong>
                          {item.asset?.name ?? 'Unknown asset'}
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
                        toMoney(item.expectedReduction, item.currency),
                      )}
                    </td>

                    <td>
                      <span className="row-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setBanner(null)
                            setModal({ mode: 'edit', record: item })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => void archiveRemediation(item)}
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
            {formatCurrencyBuckets(stats?.estimatedCostByCurrency)}
          </strong>
        </div>
      </div>
    </section>
  )
}

export default Remediation

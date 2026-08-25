import { useMemo, useState } from 'react'
import { useApiResource, useDebouncedValue } from '../hooks/useApiResource'
import { formatDate, formatMoneyOrDash, slugify } from '../utils/format'
import { SUPPORTED_CURRENCIES, toMoney } from '../types/money'
import type {
  AssetListResponse,
  InsuranceListResponse,
  InsurancePolicyDto,
} from '../types/api'
import type {
  InsuranceCoverageType,
  InsuranceStatus,
} from '../types/insurance'
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
      formatMoneyOrDash(toMoney(amount, currency as InsurancePolicyDto['currency'])),
    )
    .join('  +  ')
}

function InsuranceRegister() {
  const [search, setSearch] = useState('')
  const [status, setStatus] =
    useState<InsuranceStatus | 'All'>('All')
  const [coverageType, setCoverageType] =
    useState<InsuranceCoverageType | 'All'>('All')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search)

  const url = useMemo(() => {
    const query = buildQuery({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: status === 'All' ? undefined : status,
      coverageType: coverageType === 'All' ? undefined : coverageType,
    })

    return `/api/insurance?${query}`
  }, [page, debouncedSearch, status, coverageType])

  const { data, loading, error, reload } =
    useApiResource<InsuranceListResponse>(url)

  const policies = data?.data ?? []
  const meta = data?.meta
  const stats = meta?.stats

  const clearFilters = () => {
    setSearch('')
    setStatus('All')
    setCoverageType('All')
    setPage(1)
  }

  const hasFilters =
    search !== '' ||
    status !== 'All' ||
    coverageType !== 'All'

  // Any filter change returns the user to the first page.
  const updateFilter = <T,>(
    setter: (value: T) => void,
  ) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const setStatusAndReset = updateFilter(setStatus)
  const setCoverageAndReset = updateFilter(setCoverageType)
  const setSearchAndReset = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const showTableContent = !loading && !error

  /* =====================
     Phase 4 write actions (create / edit / archive)
  ===================== */
  // Covered-asset picker - visible assets only.
  const assetsResource = useApiResource<AssetListResponse>('/api/assets?page=1&pageSize=100')
  const assetOptions = (assetsResource.data?.data ?? []).map((asset) => ({
    value: asset.id,
    label: `${asset.id} — ${asset.name}`,
  }))

  function policyFields(create: boolean): FormField[] {
    const fields: FormField[] = []

    if (create) {
      fields.push({
        name: 'id', label: 'Policy ID', type: 'text', required: true,
        placeholder: 'e.g. POL-CYBER-01',
        help: 'Unique forever, including after archive.',
      })
    }

    fields.push(
      { name: 'policyNumber', label: 'Policy Number', type: 'text', required: true },
      { name: 'provider', label: 'Provider', type: 'text', required: true },
      {
        name: 'coverageType', label: 'Coverage Type', type: 'select', required: true,
        options: ['Cyber Liability', 'Business Interruption', 'Data Breach', 'Ransomware', 'Technology Errors & Omissions']
          .map((value) => ({ value, label: value })),
      },
      {
        name: 'currency', label: 'Currency', type: 'select', required: true,
        options: SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code })),
        help: 'All three money fields share this currency.',
      },
      {
        name: 'coverageLimit', label: 'Coverage Limit', type: 'money', required: true,
        placeholder: '10000000.00',
      },
      {
        name: 'deductible', label: 'Deductible', type: 'money', required: true,
        placeholder: '500000.00',
      },
      {
        name: 'premium', label: 'Premium', type: 'money', required: true,
        placeholder: '750000.00',
      },
      { name: 'expirationDate', label: 'Expiration Date', type: 'date', required: true },
      {
        name: 'status', label: 'Status', type: 'select', required: true,
        options: ['Active', 'Expiring Soon', 'Under Review', 'Pending'].map((value) => ({ value, label: value })),
      },
      { name: 'notes', label: 'Notes', type: 'textarea' },
      {
        name: 'assetIds', label: 'Covered Assets', type: 'multiselect',
        options: assetOptions,
        help: 'Every selected asset must exist; join rows are updated transactionally.',
      },
    )

    return fields
  }

  type ModalState =
    | { mode: 'closed' }
    | { mode: 'create' }
    | { mode: 'edit'; record: InsurancePolicyDto }

  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const { run } = useFormSubmit()

  function errorText(caught: unknown): string {
    return caught instanceof Error ? caught.message : 'Request failed.'
  }

  async function handlePolicySubmit(values: Record<string, string | string[]>) {
    const payload = {
      id: String(values.id),
      policyNumber: String(values.policyNumber),
      provider: String(values.provider),
      coverageType: String(values.coverageType),
      currency: String(values.currency),
      coverageLimit: String(values.coverageLimit).trim(),
      deductible: String(values.deductible).trim(),
      premium: String(values.premium).trim(),
      expirationDate: String(values.expirationDate),
      status: String(values.status),
      notes: values.notes === undefined || String(values.notes).trim() === '' ? undefined : String(values.notes),
      assetIds: Array.isArray(values.assetIds) ? values.assetIds : [],
    }

    const done = await run(async () => {
      if (modal.mode === 'edit') {
        await apiRequest('PATCH', `/api/insurance/${modal.record.id}`, payload)
        setBanner({ kind: 'success', text: `Policy "${modal.record.id}" updated.` })
      } else {
        await apiRequest('POST', '/api/insurance', payload)
        setBanner({ kind: 'success', text: `Policy "${payload.id}" created.` })
      }

      reload()
    })

    if (done) {
      setModal({ mode: 'closed' })
    }
  }

  async function archivePolicy(policy: InsurancePolicyDto) {
    if (!window.confirm(`Archive policy "${policy.id}"? It will leave every read view.`)) {
      return
    }

    try {
      await apiRequest('DELETE', `/api/insurance/${policy.id}`)
      setBanner({ kind: 'success', text: `Policy "${policy.id}" archived.` })
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
            <h2>Insurance Portfolio</h2>
            <span className="chip">LIVE DATA</span>
          </div>

          <p>
            Track cyber insurance coverage, policy limits,
            deductibles, premiums, and coverage status.
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
          + Add Policy
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
          title={modal.mode === 'create' ? 'Add Insurance Policy' : `Edit ${modal.record.id}`}
          fields={
            modal.mode === 'create'
              ? policyFields(true)
              : policyFields(false).map((field) => ({
                  ...field,
                  initial:
                    field.type === 'multiselect'
                      ? modal.record.assetIds
                      : field.type === 'date'
                        ? (modal.record as unknown as Record<string, string>)[field.name]?.slice(0, 10) ?? ''
                        : (modal.record as unknown as Record<string, string | null>)[field.name] == null
                          ? ''
                          : String((modal.record as unknown as Record<string, string | null>)[field.name]),
                }))
          }
          submitLabel={modal.mode === 'create' ? 'Create Policy' : 'Save Changes'}
          onSubmit={handlePolicySubmit}
          onClose={() => setModal({ mode: 'closed' })}
          notice="Writes require an API access token configured in Settings. Coverage amounts are decimal strings sharing the policy currency."
        />
      )}

      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Active Policies</span>
          <strong className="kpi-value">
            {stats?.byStatus['Active'] ?? 0}
          </strong>
          <small className="kpi-note">Matching current filters</small>
        </article>

        <article className="kpi-card accent">
          <span className="kpi-label">Expiring Soon</span>
          <strong className="kpi-value">
            {stats?.byStatus['Expiring Soon'] ?? 0}
          </strong>
          <small className="kpi-note">Requires attention</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-value">
            {stats?.byStatus['Under Review'] ?? 0}
          </strong>
          <small className="kpi-note">Coverage assessment</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Total Coverage</span>
          <strong className="kpi-value">
            {formatCurrencyBuckets(stats?.coverageLimitByCurrency)}
          </strong>
          <small className="kpi-note">Per currency, never mixed</small>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Annual Premium</span>
          <strong className="kpi-value">
            {formatCurrencyBuckets(stats?.premiumByCurrency)}
          </strong>
          <small className="kpi-note">Per currency, never mixed</small>
        </article>
      </div>

      <div className="notice">
        <span className="notice-icon" aria-hidden="true">i</span>

        <div>
          <strong>Connected to the CRFIS database</strong>

          <p>
            Policies are served live from the CRFIS database through the
            read-only API with covered assets resolved through the policy
            join table. Monetary amounts keep their record currency; no
            conversion is applied.
          </p>
        </div>
      </div>

      <div className="toolbar" role="group" aria-label="Policy filters">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            placeholder="Search policies, providers, coverage..."
            value={search}
            onChange={(event) => setSearchAndReset(event.target.value)}
            aria-label="Search insurance policies"
          />
        </label>

        <select
          value={status}
          onChange={(event) =>
            setStatusAndReset(event.target.value as InsuranceStatus | 'All')
          }
          aria-label="Filter by policy status"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Expiring Soon">Expiring Soon</option>
          <option value="Under Review">Under Review</option>
          <option value="Pending">Pending</option>
        </select>

        <select
          value={coverageType}
          onChange={(event) =>
            setCoverageAndReset(
              event.target.value as InsuranceCoverageType | 'All',
            )
          }
          aria-label="Filter by coverage type"
        >
          <option value="All">All Coverage Types</option>
          <option value="Cyber Liability">Cyber Liability</option>
          <option value="Business Interruption">
            Business Interruption
          </option>
          <option value="Data Breach">Data Breach</option>
          <option value="Ransomware">Ransomware</option>
          <option value="Technology Errors & Omissions">
            Technology Errors &amp; Omissions
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
            <strong>Insurance Inventory</strong>

            <span>
              Showing {policies.length} of{' '}
              {meta?.total ?? 0} policies · page{' '}
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
                <th scope="col">Policy</th>
                <th scope="col">Provider</th>
                <th scope="col">Coverage</th>
                <th scope="col" className="money">
                  Coverage Limit
                </th>
                <th scope="col" className="money">
                  Deductible
                </th>
                <th scope="col">Expiration</th>
                <th scope="col">Status</th>
                <th scope="col">Covered Assets</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9}>
                    <LoadingState title="Loading policies..." />
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={9}>
                    <ErrorState
                      title="Insurance policies could not be loaded."
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

              {showTableContent && policies.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      title={
                        hasFilters
                          ? 'No policies match the current filters.'
                          : 'No insurance policies recorded yet.'
                      }
                      message={
                        hasFilters
                          ? 'Try changing the search or filter selections.'
                          : 'The CRFIS database does not contain any policies yet.'
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
                policies.map((policy) => (
                  <tr key={policy.id}>
                    <td>
                      <div className="cell-stack">
                        <strong>{policy.policyNumber}</strong>
                        <span>{policy.id}</span>
                      </div>
                    </td>

                    <td>{policy.provider}</td>

                    <td>{policy.coverageType}</td>

                    <td className="money">
                      {formatMoneyOrDash(
                        toMoney(policy.coverageLimit, policy.currency),
                      )}
                    </td>

                    <td className="money">
                      {formatMoneyOrDash(
                        toMoney(policy.deductible, policy.currency),
                      )}
                    </td>

                    <td>{formatDate(policy.expirationDate)}</td>

                    <td>
                      <span
                        className={`badge badge--${slugify(policy.status)}`}
                      >
                        {policy.status}
                      </span>
                    </td>

                    <td>
                      <div className="cell-stack">
                        <strong>
                          {policy.coveredAssets} assets
                        </strong>

                        <span>
                          {policy.assets
                            .map((asset) => asset.name)
                            .join(', ') || 'None'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="row-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setBanner(null)
                            setModal({ mode: 'edit', record: policy })
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => void archivePolicy(policy)}
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
        <div className="intelligence-icon" aria-hidden="true">↗</div>

        <div>
          <span className="eyebrow">
            INSURANCE INTELLIGENCE
          </span>

          <h2>
            Compare insurance protection with financial exposure.
          </h2>

          <p>
            CRFIS connects risk exposure, insurance limits,
            deductibles, premiums, and residual exposure to help
            leadership understand potential coverage gaps.
          </p>
        </div>

        <div className="intelligence-metrics">
          <div className="intelligence-metric">
            <span>TOTAL COVERAGE</span>

            <strong>
              {formatCurrencyBuckets(stats?.coverageLimitByCurrency)}
            </strong>
          </div>

          <div className="intelligence-metric">
            <span>TOTAL DEDUCTIBLE</span>

            <strong>
              {formatCurrencyBuckets(stats?.deductibleByCurrency)}
            </strong>
          </div>
        </div>
      </div>
    </section>
  )
}

export default InsuranceRegister

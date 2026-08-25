import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError, type ApiErrorDetail } from '../api/client'

/*
 * Smallest consistent write UI for CRFIS: a field-driven modal form that
 * reuses the existing visual vocabulary (settings-card, primary-button,
 * status-pill classes) instead of introducing a new design system.
 *
 * - Values are strings; money stays a decimal STRING end to end.
 * - Server VALIDATION_ERROR details are rendered per field.
 * - Nothing fails silently: submit errors are always displayed.
 */

export type FormFieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'money'

export interface FormField {
  name: string
  label: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  help?: string
  /** Only for select/multiselect. */
  options?: Array<{ value: string; label: string }>
  /** Pre-filled value (string, or string[] for multiselect). */
  initial?: string | string[]
}

export interface FormModalProps {
  title: string
  fields: FormField[]
  submitLabel: string
  busyLabel?: string
  onSubmit: (values: Record<string, string | string[]>) => Promise<void>
  onClose: () => void
  /** Extra note rendered under the title (e.g. auth hints). */
  notice?: ReactNode
}

function initialValues(fields: FormField[]): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {}

  for (const field of fields) {
    if (field.type === 'multiselect') {
      values[field.name] = Array.isArray(field.initial) ? field.initial : []
    } else {
      values[field.name] = typeof field.initial === 'string' ? field.initial : ''
    }
  }

  return values
}

export function FormModal({ title, fields, submitLabel, busyLabel, onSubmit, onClose, notice }: FormModalProps) {
  const [values, setValues] = useState(() => initialValues(fields))
  const [localErrors, setLocalErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [apiError, setApiError] = useState<ApiError | null>(null)

  const setValue = (name: string, value: string | string[]) => {
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setApiError(null)

    // Minimal client-side gate; the server remains the real boundary.
    const missing = fields
      .filter((field) => field.required)
      .filter((field) => {
        const value = values[field.name]
        return Array.isArray(value) ? value.length === 0 : value.trim() === ''
      })
      .map((field) => `${field.label} is required.`)

    setLocalErrors(missing)

    if (missing.length > 0) {
      return
    }

    setBusy(true)

    try {
      await onSubmit(values)
    } catch (caught) {
      setApiError(
        caught instanceof ApiError
          ? caught
          : new ApiError('NETWORK_ERROR', caught instanceof Error ? caught.message : 'Request failed.'),
      )
    } finally {
      setBusy(false)
    }
  }

  const validationDetails: ApiErrorDetail[] = apiError?.validationMessages() ?? []
  const detailFor = (fieldName: string): string | undefined =>
    validationDetails.find((detail) => detail.path === fieldName)?.message

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal settings-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="secondary-button" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {notice && <p className="modal-notice">{notice}</p>}

        {(localErrors.length > 0 || (apiError !== null && validationDetails.length === 0)) && (
          <div className="form-errors" role="alert">
            {localErrors.map((message) => (
              <p key={message}>{message}</p>
            ))}
            {apiError !== null && validationDetails.length === 0 && (
              <p>{`${apiError.code}: ${apiError.message}`}</p>
            )}
          </div>
        )}

        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="form-grid">
            {fields.map((field) => {
              const value = values[field.name]
              const errorText = detailFor(field.name)

              return (
                <label key={field.name} className="form-field">
                  <span>
                    {field.label}
                    {field.required && <em aria-hidden="true"> *</em>}
                  </span>

                  {field.type === 'textarea' && (
                    <textarea
                      value={value as string}
                      placeholder={field.placeholder}
                      onChange={(event) => setValue(field.name, event.target.value)}
                      rows={3}
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      value={value as string}
                      onChange={(event) => setValue(field.name, event.target.value)}
                    >
                      {!field.required && <option value="">—</option>}
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'multiselect' && (
                    <span className="form-multiselect">
                      {field.options?.map((option) => {
                        const list = value as string[]
                        const checked = list.includes(option.value)

                        return (
                          <span key={option.value} className="form-check">
                            <input
                              type="checkbox"
                              id={`field-${field.name}-${option.value}`}
                              checked={checked}
                              onChange={() =>
                                setValue(
                                  field.name,
                                  checked
                                    ? list.filter((entry) => entry !== option.value)
                                    : [...list, option.value],
                                )
                              }
                            />
                            <label htmlFor={`field-${field.name}-${option.value}`}>
                              {option.label}
                            </label>
                          </span>
                        )
                      })}
                    </span>
                  )}

                  {(field.type === 'text' || field.type === 'money' || field.type === 'date') && (
                    <input
                      type={field.type === 'date' ? 'date' : 'text'}
                      value={value as string}
                      placeholder={field.placeholder}
                      inputMode={field.type === 'money' ? 'decimal' : undefined}
                      onChange={(event) => setValue(field.name, event.target.value)}
                    />
                  )}

                  {field.help && <small className="form-help">{field.help}</small>}
                  {errorText && <small className="form-field-error">{errorText}</small>}
                </label>
              )
            })}
          </div>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? (busyLabel ?? 'Saving…') : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

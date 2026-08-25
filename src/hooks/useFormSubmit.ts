import { useState } from 'react'
import { ApiError } from '../api/client'

/*
 * Shared submit-state helper for mutation flows: tracks busy state and
 * surfaces ApiError instances for rendering. Returns whether the action
 * succeeded so callers can close modals only on success.
 */
export function useFormSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function run(action: () => Promise<void>): Promise<boolean> {
    setBusy(true)
    setError(null)

    try {
      await action()
      return true
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError('NETWORK_ERROR', caught instanceof Error ? caught.message : 'Request failed.'),
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, setError, run }
}

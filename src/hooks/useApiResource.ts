import { useCallback, useEffect, useState } from 'react'

/*
 * Minimal dependency-free data-fetching hook for the Phase 3D read APIs.
 *
 * - "loading" is DERIVED: a result whose tick/url no longer matches the
 *   current request means the newest request is still in flight. This keeps
 *   every setState inside async callbacks (react-hooks/set-state-in-effect).
 * - error carries the API envelope message; stale errors are suppressed.
 * - reload() re-runs the current request (Retry buttons).
 */

export interface ApiResource<T> {
  data: T | undefined
  loading: boolean
  error: string | undefined
  reload: () => void
}

interface RequestState<T> {
  tick: number
  url: string
  phase: 'loading' | 'ok' | 'error'
  data?: T
  error?: string
}

export function useApiResource<T>(url: string): ApiResource<T> {
  const [state, setState] = useState<RequestState<T>>({
    tick: 0,
    url,
    phase: 'loading',
  })

  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => undefined)

        if (!response.ok) {
          const message =
            (body as { error?: { message?: string } } | undefined)?.error?.message ??
            `Request failed with status ${response.status}.`

          throw new Error(message)
        }

        return body as T
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ tick: reloadTick, url, phase: 'ok', data })
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setState({
          tick: reloadTick,
          url,
          phase: 'error',
          error:
            reason instanceof Error ? reason.message : 'Unexpected request failure.',
        })
      })

    return () => controller.abort()
  }, [url, reloadTick])

  const stale = state.tick !== reloadTick || state.url !== url

  const reload = useCallback(() => setReloadTick((token) => token + 1), [])

  return {
    data: stale ? undefined : state.data,
    loading: stale || state.phase === 'loading',
    error: stale || state.phase !== 'error' ? undefined : state.error,
    reload,
  }
}

/** Delays a rapidly-changing value so search inputs do not fire per keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

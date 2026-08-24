import type { ReactNode } from 'react'

/*
 * Shared loading / error / empty states.
 *
 * These are presentation-only building blocks for the upcoming API
 * integration phase. They are NOT wired to any data fetching yet.
 */

interface StateProps {
  title: string
  message?: string
  action?: ReactNode
}

function StateBlock({
  className,
  role,
  icon,
  title,
  message,
  action,
}: StateProps & {
  className: string
  role: string
  icon: string
}) {
  return (
    <div className={`state-block ${className}`} role={role}>
      <span className="state-icon" aria-hidden="true">
        {icon}
      </span>

      <strong>{title}</strong>

      {message && <p>{message}</p>}

      {action && <div className="state-action">{action}</div>}
    </div>
  )
}

export function EmptyState(props: StateProps) {
  return (
    <StateBlock
      {...props}
      className="empty-state"
      role="status"
      icon="◌"
    />
  )
}

export function LoadingState({
  title = 'Loading',
  ...rest
}: StateProps) {
  return (
    <StateBlock
      title={title}
      {...rest}
      className="loading-state"
      role="status"
      icon="◐"
    />
  )
}

export function ErrorState({
  title = 'Something went wrong',
  ...rest
}: StateProps) {
  return (
    <StateBlock
      title={title}
      {...rest}
      className="error-state"
      role="alert"
      icon="!"
    />
  )
}

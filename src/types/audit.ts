export type AuditStatus =
  | 'Completed'
  | 'Under Review'
  | 'In Progress'
  | 'Planned'
  | 'Overdue'

export interface Audit {
  id: string
  framework: string
  scope: string
  status: AuditStatus
  findings: number
  owner: string
  dueDate: string
}
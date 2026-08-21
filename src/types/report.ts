export type ReportStatus =
  | 'Ready'
  | 'Draft'
  | 'Under Review'

export type ReportType =
  | 'Executive Risk Report'
  | 'Financial Exposure Report'
  | 'Asset Exposure Report'
  | 'Remediation Report'
  | 'Insurance Coverage Report'

export interface Report {
  id: string
  name: string
  type: ReportType
  period: string
  status: ReportStatus
  generatedAt: string
  owner: string
  isDemo: true
}

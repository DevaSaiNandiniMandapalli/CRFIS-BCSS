export type AnalystMessageRole = 'user' | 'assistant'

export interface AnalystMessage {
  id: string
  role: AnalystMessageRole
  content: string
  timestamp: string
  isDemo: true
}

export interface AnalystInsight {
  title: string
  value: string
  description: string
  severity: 'Critical' | 'High' | 'Medium' | 'Informational'
  isDemo: true
}
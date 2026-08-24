export type AnalystMessageRole = 'user' | 'assistant'

export interface AnalystMessage {
  id: string
  role: AnalystMessageRole
  content: string
  timestamp: string
  isDemo: true
}
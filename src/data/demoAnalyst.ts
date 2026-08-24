import type { AnalystMessage } from '../types/aiAnalyst'

/*
 * Demo conversation fixtures for the AI Analyst chat surface.
 *
 * The chat itself is a local demonstration (no external AI provider is
 * connected), so messages contain no financial figures that could be
 * mistaken for real data. Deterministic numeric insights are served by
 * GET /api/ai/analysis instead.
 */

export const demoAnalystMessages: AnalystMessage[] = [
  {
    id: 'MSG-001',
    role: 'assistant',
    content:
      'Welcome to the CRFIS AI Analyst demonstration. I can walk through how the platform interprets cyber risk, financial exposure, remediation priorities, scenarios, and insurance coverage once real records exist.',
    timestamp: '09:00',
    isDemo: true,
  },
  {
    id: 'MSG-002',
    role: 'user',
    content:
      'Which risks currently represent the greatest financial exposure?',
    timestamp: '09:02',
    isDemo: true,
  },
  {
    id: 'MSG-003',
    role: 'assistant',
    content:
      'This build does not connect an external AI provider, and I will not invent figures. Live exposure rankings are produced deterministically from database statistics - see the Executive Signals panel above, which always reflects current CRFIS records.',
    timestamp: '09:02',
    isDemo: true,
  },
]

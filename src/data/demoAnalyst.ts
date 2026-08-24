import type { AnalystMessage } from '../types/aiAnalyst'
import type { Money } from '../types/money'
import { formatMoney } from '../utils/format'

/*
 * Demo conversation fixtures.
 *
 * Financial figures inside narrative text are generated from structured
 * Money values through the shared formatter - currency symbols are never
 * baked into fixture strings.
 */

const ransomwareExposure: Money = { amount: '1250000', currency: 'USD' }
const dataExfiltrationExposure: Money = { amount: '760000', currency: 'USD' }

export const demoAnalystMessages: AnalystMessage[] = [
  {
    id: 'MSG-001',
    role: 'assistant',
    content:
      'Welcome to the CRFIS AI Analyst. I can help interpret cyber risk, financial exposure, remediation priorities, scenarios, and insurance coverage using the information available in the platform.',
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
    content: `Based on the current demonstration dataset, Ransomware Exposure represents the largest individual exposure at ${formatMoney(ransomwareExposure)}, followed by Customer Data Exfiltration at ${formatMoney(dataExfiltrationExposure)}. These values are fictional placeholders and are not production risk calculations.`,
    timestamp: '09:02',
    isDemo: true,
  },
]

import type {
  AnalystInsight,
  AnalystMessage,
} from '../types/aiAnalyst'

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
    content:
      'Based on the current demonstration dataset, Ransomware Exposure represents the largest individual exposure at $1.25M, followed by Customer Data Exfiltration at $760K. These values are fictional placeholders and are not production risk calculations.',
    timestamp: '09:02',
    isDemo: true,
  },
]

export const demoAnalystInsights: AnalystInsight[] = [
  {
    title: 'Highest Exposure',
    value: '$1.25M',
    description: 'Ransomware Exposure',
    severity: 'Critical',
    isDemo: true,
  },
  {
    title: 'Priority Risk',
    value: 'Critical',
    description: 'Core Infrastructure',
    severity: 'Critical',
    isDemo: true,
  },
  {
    title: 'Remediation Focus',
    value: '$890K',
    description: 'Illustrative opportunity',
    severity: 'High',
    isDemo: true,
  },
  {
    title: 'Coverage Context',
    value: '$14.0M',
    description: 'Demo insurance coverage',
    severity: 'Informational',
    isDemo: true,
  },
]
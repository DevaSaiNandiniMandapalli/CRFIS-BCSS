import type { CRFISSettings } from '../types/settings'
import { toMoney } from '../types/money'

export const demoSettings: CRFISSettings = {
  platform: {
    workspaceName: 'CRFIS Enterprise Demo',
    environment: 'Demonstration',
    version: '0.1.0',
    dataConnection: 'Demo data only',
  },

  theme: 'system',

  risk: {
    criticalThreshold: {
      amount: toMoney(1000000, 'USD'),
      description: 'Total financial exposure or more',
    },
    highThreshold: {
      amount: toMoney(500000, 'USD'),
      description: 'Total financial exposure or more',
    },
    financialModel: 'Illustrative financial impact model',
  },

  governance: {
    approvalRequired: true,
    evidenceRequired: true,
    auditTracking: true,
  },

  ai: {
    demoMode: true,
    humanReview: true,
    decisionSupportOnly: true,
  },
}

export default demoSettings
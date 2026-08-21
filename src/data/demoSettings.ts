import type { CRFISSettings } from '../types/settings'

export const demoSettings: CRFISSettings = {
  platform: {
    workspaceName: 'CRFIS Enterprise Demo',
    environment: 'Demonstration',
    version: '0.1.0',
    dataConnection: 'Demo data only',
  },

  theme: 'system',

  risk: {
    criticalThreshold: '$1M+ financial exposure',
    highThreshold: '$500K+ financial exposure',
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
import { prisma } from '../repositories/prisma.js'

export interface HealthStatus {
  status: 'ok' | 'degraded'
  api: 'up'
  database: 'up' | 'down'
  timestamp: string
}

export async function getHealthStatus(): Promise<HealthStatus> {
  let database: HealthStatus['database']

  try {
    await prisma.$queryRaw`SELECT 1`
    database = 'up'
  } catch {
    database = 'down'
  }

  return {
    status: database === 'up' ? 'ok' : 'degraded',
    api: 'up',
    database,
    timestamp: new Date().toISOString(),
  }
}

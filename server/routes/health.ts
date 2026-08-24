import type { FastifyInstance } from 'fastify'
import { getHealthStatus } from '../services/health.js'

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async (_request, reply) => {
    const health = await getHealthStatus()
    const statusCode = health.database === 'up' ? 200 : 503

    return reply.code(statusCode).send(health)
  })
}

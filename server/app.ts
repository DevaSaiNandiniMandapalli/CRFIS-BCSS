import Fastify, { type FastifyInstance } from 'fastify'
import { healthRoutes } from './routes/health.js'
import { assetRoutes } from './routes/assets.js'
import { riskRoutes } from './routes/risks.js'
import { remediationRoutes } from './routes/remediations.js'
import { scenarioRoutes } from './routes/scenarios.js'
import { insuranceRoutes } from './routes/insurance.js'
import { closePrisma } from './repositories/prisma.js'
import { errorHandlingPlugin } from './plugins/error-handler.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  })

  await app.register(errorHandlingPlugin)

  await app.register(healthRoutes)
  await app.register(assetRoutes)
  await app.register(riskRoutes)
  await app.register(remediationRoutes)
  await app.register(scenarioRoutes)
  await app.register(insuranceRoutes)

  app.addHook('onClose', async () => {
    await closePrisma()
  })

  return app
}

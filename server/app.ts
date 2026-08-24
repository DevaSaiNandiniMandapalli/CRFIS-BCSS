import Fastify, { type FastifyInstance } from 'fastify'
import { healthRoutes } from './routes/health.js'
import { assetRoutes } from './routes/assets.js'
import { riskRoutes } from './routes/risks.js'
import { remediationRoutes } from './routes/remediations.js'
import { scenarioRoutes } from './routes/scenarios.js'
import { insuranceRoutes } from './routes/insurance.js'
import { auditFindingRoutes, auditRoutes } from './routes/audits.js'
import { reportRoutes } from './routes/reports.js'
import { overviewRoutes } from './routes/overview.js'
import { aiRoutes } from './routes/ai.js'
import { closePrisma } from './repositories/prisma.js'
import { errorHandlingPlugin } from './plugins/error-handler.js'
import { authSeamPlugin } from './plugins/auth-seam.js'

/*
 * DEVELOPMENT / READ-ONLY BUILD.
 *
 * No authentication or authorization is configured. Every route below is a
 * public read endpoint over the development database. The auth-seam plugin
 * reserves the request user slot for the dedicated authentication phase;
 * until that phase lands, `requireAuth` rejects any route that tries to use
 * it. Do not deploy this build outside local development.
 */

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  })

  await app.register(errorHandlingPlugin)
  await app.register(authSeamPlugin)

  await app.register(healthRoutes)
  await app.register(assetRoutes)
  await app.register(riskRoutes)
  await app.register(remediationRoutes)
  await app.register(scenarioRoutes)
  await app.register(insuranceRoutes)
  await app.register(auditRoutes)
  await app.register(auditFindingRoutes)
  await app.register(reportRoutes)
  await app.register(overviewRoutes)
  await app.register(aiRoutes)

  app.addHook('onClose', async () => {
    await closePrisma()
  })

  return app
}

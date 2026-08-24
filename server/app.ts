import Fastify, { type FastifyInstance } from 'fastify'
import { healthRoutes } from './routes/health.js'
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

  app.addHook('onClose', async () => {
    await closePrisma()
  })

  return app
}

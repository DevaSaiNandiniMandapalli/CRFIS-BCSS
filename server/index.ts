import { buildApp } from './app.js'

const port = Number.parseInt(process.env.PORT ?? '', 10)
const host = process.env.HOST ?? '127.0.0.1'

async function main(): Promise<void> {
  const app = await buildApp()

  try {
    await app.listen({
      port: Number.isFinite(port) && port > 0 ? port : 3000,
      host,
    })
  } catch (err) {
    app.log.error(err)
    process.exitCode = 1
    await app.close()
    return
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      app.log.info(`Received ${signal}, shutting down`)
      void app.close().finally(() => process.exit(0))
    })
  }
}

void main()

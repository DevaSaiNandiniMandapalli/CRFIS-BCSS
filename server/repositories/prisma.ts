import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../src/generated/prisma/client.js'

const globalForPrisma = globalThis as unknown as {
  crfisPrismaClient?: PrismaClient
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Define it in the server-side .env file.')
  }

  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({ adapter })
}

export const prisma: PrismaClient =
  globalForPrisma.crfisPrismaClient ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.crfisPrismaClient = prisma
}

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect()
}

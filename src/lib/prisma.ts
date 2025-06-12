import { PrismaClient, Prisma } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const prisma = global.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export class PrismaError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'PrismaError'
  }

  static isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError
  }
}

// We'll use Prisma's built-in types directly instead of creating complex custom types
export type { Prisma }
export { prisma } 
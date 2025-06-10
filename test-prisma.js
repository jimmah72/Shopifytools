import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function testPrismaConnection() {
  try {
    // Test the connection by attempting to count stores
    const storeCount = await prisma.store.count()
    console.log('Successfully connected to database via Prisma!')
    console.log('Current number of stores:', storeCount)
    console.log('Prisma connection test passed ✅')
  } catch (error) {
    console.error('Error connecting to database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPrismaConnection() 
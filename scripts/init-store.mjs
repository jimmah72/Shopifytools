import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Create a default store if it doesn't exist
    const store = await prisma.store.upsert({
      where: {
        domain: 'default-store.myshopify.com',
      },
      update: {},
      create: {
        name: 'Default Store',
        domain: 'default-store.myshopify.com',
        accessToken: 'default-token',
      },
    })

    console.log('Store initialized:', store)
  } catch (error) {
    console.error('Error initializing store:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main() 
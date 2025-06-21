const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Resetting stuck sync status...')
  
  try {
    // Get the store
    const store = await prisma.store.findFirst({
      select: { id: true, name: true }
    })
    
    if (!store) {
      console.error('❌ No store found')
      return
    }
    
    console.log(`📍 Found store: ${store.name}`)
    
    // Reset sync status for orders
    const updatedSync = await prisma.syncStatus.updateMany({
      where: {
        storeId: store.id,
        dataType: 'orders'
      },
      data: {
        syncInProgress: false,
        errorMessage: null
      }
    })
    
    console.log(`✅ Reset sync status for ${updatedSync.count} records`)
    
    // Check current order count
    const orderCount = await prisma.shopifyOrder.count({
      where: { storeId: store.id }
    })
    
    console.log(`📊 Current orders in database: ${orderCount}`)
    console.log('🎯 Ready to restart sync!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main() 
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting initial Shopify data sync...')
  
  try {
    // Get the first store
    const store = await prisma.store.findFirst({
      select: { id: true, domain: true, accessToken: true, name: true }
    })
    
    if (!store) {
      console.error('❌ No store found in database')
      return
    }
    
    console.log(`📍 Found store: ${store.name} (${store.domain})`)
    
    // Check if we have any synced data
    const [existingOrders, existingProducts] = await Promise.all([
      prisma.shopifyOrder.count({ where: { storeId: store.id } }),
      prisma.shopifyProduct.count({ where: { storeId: store.id } })
    ])
    
    console.log(`📊 Current local data: ${existingOrders} orders, ${existingProducts} products`)
    
    if (existingOrders > 0 || existingProducts > 0) {
      console.log('✅ Local data already exists. Use this to test the dashboard:')
      console.log('   - Dashboard: http://localhost:3000')
      console.log('   - Orders page: http://localhost:3000/orders')
      console.log('   - Products page: http://localhost:3000/products')
    } else {
      console.log('⚠️  No local data found.')
      console.log('💡 To populate local data, you can:')
      console.log('   1. Call POST /api/sync via API')
      console.log('   2. Run the sync functions from the sync service')
      console.log('   3. The dashboard will show a message suggesting to run sync')
    }
    
    // Show sync status
    const syncStatuses = await prisma.syncStatus.findMany({
      where: { storeId: store.id }
    })
    
    if (syncStatuses.length > 0) {
      console.log('\n📅 Sync Status:')
      syncStatuses.forEach(status => {
        console.log(`   ${status.dataType}: Last synced ${status.lastSyncAt.toISOString()}`)
        if (status.errorMessage) {
          console.log(`     ⚠️ Error: ${status.errorMessage}`)
        }
      })
    }
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Visit the dashboard: http://localhost:3000')
    console.log('2. If no data shows, trigger a sync via POST /api/sync')
    console.log('3. Dashboard will load instantly from local database after sync')
    
  } catch (error) {
    console.error('❌ Error during sync check:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error) 
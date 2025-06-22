const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateToMultiStore() {
  try {
    console.log('🚀 Starting multi-store data migration...')

    // Get all existing users with their stores
    const existingUsers = await prisma.user.findMany({
      include: {
        store: true
      }
    })

    console.log(`📋 Found ${existingUsers.length} existing users to migrate`)

    for (const user of existingUsers) {
      console.log(`👤 Migrating user: ${user.username} (${user.role})`)

      // Check if UserStoreAccess already exists for this user-store combination
      const existingAccess = await prisma.userStoreAccess.findUnique({
        where: {
          userId_storeId: {
            userId: user.id,
            storeId: user.storeId
          }
        }
      })

      if (existingAccess) {
        console.log(`   ✅ UserStoreAccess already exists, skipping...`)
        continue
      }

      // Create UserStoreAccess record preserving the existing role
      await prisma.userStoreAccess.create({
        data: {
          userId: user.id,
          storeId: user.storeId,
          role: user.role, // Preserve existing role
          isActive: user.isActive,
          createdBy: user.createdBy
        }
      })

      // Set the current store to their existing store
      await prisma.user.update({
        where: { id: user.id },
        data: {
          currentStoreId: user.storeId
        }
      })

      console.log(`   ✅ Created UserStoreAccess and set current store`)
    }

    // Mark all existing stores as active
    const storeUpdateResult = await prisma.store.updateMany({
      data: {
        isActive: true,
        isArchived: false
      }
    })

    console.log(`🏪 Updated ${storeUpdateResult.count} stores with active status`)

    // Verify migration
    const userStoreAccessCount = await prisma.userStoreAccess.count()
    const usersWithCurrentStore = await prisma.user.count({
      where: {
        currentStoreId: {
          not: null
        }
      }
    })

    console.log('\n📊 Migration Summary:')
    console.log(`   • UserStoreAccess records created: ${userStoreAccessCount}`)
    console.log(`   • Users with current store set: ${usersWithCurrentStore}`)
    console.log(`   • Stores marked as active: ${storeUpdateResult.count}`)

    console.log('\n✅ Multi-store data migration completed successfully!')
    console.log('\n🔄 What this enables:')
    console.log('   • Users can now have access to multiple stores')
    console.log('   • Per-store role management')
    console.log('   • Store soft deletion (archives instead of deletes)')
    console.log('   • Data preservation across store changes')
    console.log('\n🚧 Next Phase (when ready):')
    console.log('   • Add store selector UI')
    console.log('   • Update APIs to use multi-store relationships')
    console.log('   • Remove legacy storeId from User table')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateToMultiStore() 
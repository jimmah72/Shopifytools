const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    console.log('🔧 Setting up initial admin user...')

    // Find the existing store (should be the real Shopify store)
    let store = await prisma.store.findFirst()
    if (!store) {
      console.error('❌ No store found in database. Please ensure your Shopify store is connected.')
      return
    }

    console.log(`📦 Found store: ${store.name} (${store.domain})`)

    // Check if any admin users already exist for this store
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN', storeId: store.id }
    })

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.username)
      console.log('   Use the existing admin credentials to log in and create additional users.')
      return
    }

    // Create the initial admin user
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const adminUser = await prisma.user.create({
      data: {
        storeId: store.id,
        username: 'admin',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@shopifytools.com',
        role: 'ADMIN',
        isActive: true,
      }
    })

    console.log('✅ Initial admin user created successfully!')
    console.log('📋 Login credentials:')
    console.log('   Username: admin')
    console.log('   Password: admin123')
    console.log('')
    console.log('🔒 IMPORTANT SECURITY NOTES:')
    console.log('   1. Change the admin password immediately after first login')
    console.log('   2. Create individual user accounts for each team member')
    console.log('   3. The admin user has full access to all features and settings')
    console.log('')
    console.log('🏪 Connected to store:', store.name, `(${store.domain})`)

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser() 
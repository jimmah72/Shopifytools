const { PrismaClient } = require('@prisma/client');

async function resetSync() {
  const prisma = new PrismaClient();
  
  try {
    const result = await prisma.syncStatus.updateMany({
      data: {
        syncInProgress: false,
        lastHeartbeat: null,
        errorMessage: null
      }
    });
    
    console.log(`✅ Reset ${result.count} sync statuses`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetSync(); 
const { execSync } = require('child_process');

try {
  if (process.env.NODE_ENV === 'production') {
    console.log('Running Prisma generate in production...');
    execSync('npx prisma generate');
  }
} catch (error) {
  console.error('Error during postinstall script:', error);
  process.exit(1);
} 
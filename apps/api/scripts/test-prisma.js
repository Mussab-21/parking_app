const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany();
    console.log('Prisma query successful! Total users:', users.length);
  } catch (err) {
    console.error('Prisma query error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

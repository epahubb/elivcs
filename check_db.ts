import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
  const params = await prisma.referenceParameter.count();
  console.log(`Reference Parameters: ${params}`);
  const vehicles = await prisma.vehicle.count();
  console.log(`Vehicles: ${vehicles}`);
}
check();

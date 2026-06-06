import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'www.epa04@gmail.com' },
    update: {},
    create: {
      email: 'www.epa04@gmail.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'admin',
    },
  });

  console.log('Admin user created:', admin.email);

  // Add some reference parameters
  const refParams = [
    { vehicleModel: 'Corolla', category: 'Engine', parameterName: 'Oil Pressure', standardValue: 30, toleranceMin: 25, toleranceMax: 35, unit: 'PSI' },
    { vehicleModel: 'Corolla', category: 'Engine', parameterName: 'Coolant Temp', standardValue: 90, toleranceMin: 85, toleranceMax: 95, unit: '°C' },
    { vehicleModel: 'Corolla', category: 'Safety', parameterName: 'Brake Force', standardValue: 500, toleranceMin: 450, toleranceMax: 550, unit: 'N' },
  ];

  for (const param of refParams) {
    await prisma.referenceParameter.create({ data: param });
  }

  // Add logos to system settings
  const settings = [
    { key: 'logo_gsa', value: '' },
    { key: 'logo_elle', value: '' },
    { key: 'logo_npa', value: '' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log('Seed data inserted successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

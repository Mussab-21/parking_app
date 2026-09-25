import { PrismaClient, UserRole, UserStatus, FacilityStatus, SlotStatus, VehicleType, StaffAccessRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data...');

  // 1. Create Users with known demo password: DemoPass123!
  const passwordHash = await argon2.hash('DemoPass123!', {
    type: argon2.argon2id,
  });

  const admin = await prisma.user.upsert({
    where: { phone: '+923001234567' },
    update: { passwordHash },
    create: {
      name: 'System Admin',
      phone: '+923001234567',
      email: 'admin@parksmart.pk',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const owner = await prisma.user.upsert({
    where: { phone: '+923007654321' },
    update: { passwordHash },
    create: {
      name: 'Plaza Owner',
      phone: '+923007654321',
      email: 'owner@demoplaza.pk',
      passwordHash,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
    },
  });

  const attendant = await prisma.user.upsert({
    where: { phone: '+923001112223' },
    update: { passwordHash },
    create: {
      name: 'Demo Attendant',
      phone: '+923001112223',
      passwordHash,
      role: UserRole.ATTENDANT,
      status: UserStatus.ACTIVE,
    },
  });

  const driver = await prisma.user.upsert({
    where: { phone: '+923459998887' },
    update: { passwordHash },
    create: {
      name: 'Standard Driver',
      phone: '+923459998887',
      passwordHash,
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
    },
  });

  // 2. Create Owner Profile
  await prisma.ownerProfile.upsert({
    where: { userId: owner.id },
    update: {},
    create: {
      userId: owner.id,
      businessName: 'Demo Parking Solutions',
      verificationStatus: 'APPROVED',
      documents: {},
    },
  });

  // 3. Create Facility "Demo Plaza"
  const facility = await prisma.facility.create({
    data: {
      name: 'Demo Plaza',
      address: 'Main Boulevard, Gulberg III',
      city: 'Lahore',
      latitude: 31.5204,
      longitude: 74.3587,
      status: FacilityStatus.APPROVED,
      hourlyRatePaisa: BigInt(20000), // PKR 200
      openingHours: {
        monday: { open: '08:00', close: '22:00' },
        tuesday: { open: '08:00', close: '22:00' },
        wednesday: { open: '08:00', close: '22:00' },
        thursday: { open: '08:00', close: '22:00' },
        friday: { open: '08:00', close: '22:00' },
        saturday: { open: '08:00', close: '22:00' },
        sunday: { open: '08:00', close: '22:00' },
      },
      contactPhone: '+923007654321',
      staff: {
        createMany: {
          data: [
            { userId: owner.id, accessRole: StaffAccessRole.OWNER },
            { userId: attendant.id, accessRole: StaffAccessRole.ATTENDANT },
          ],
        },
      },
    },
  });

  // 4. Create Zones AB and CD
  const zoneAB = await prisma.zone.create({
    data: {
      facilityId: facility.id,
      name: 'Zone AB',
      code: 'AB',
    },
  });

  const zoneCD = await prisma.zone.create({
    data: {
      facilityId: facility.id,
      name: 'Zone CD',
      code: 'CD',
    },
  });

  // 5. Create Slots AB-1..AB-10 and CD-1..CD-10
  const slots = [];
  for (let i = 1; i <= 10; i++) {
    slots.push({
      facilityId: facility.id,
      zoneId: zoneAB.id,
      slotCode: `AB-${i}`,
      status: SlotStatus.ACTIVE,
      vehicleType: VehicleType.CAR,
    });
    slots.push({
      facilityId: facility.id,
      zoneId: zoneCD.id,
      slotCode: `CD-${i}`,
      status: SlotStatus.ACTIVE,
      vehicleType: VehicleType.CAR,
    });
  }

  await prisma.slot.createMany({
    data: slots,
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

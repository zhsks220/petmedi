import { PrismaClient, UserRole, Species, Gender, HospitalStatus, VisitType } from '../generated/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. 슈퍼 관리자 계정 생성
  const superAdminPassword = await bcrypt.hash('admin123!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@petmedi.kr' },
    update: {},
    create: {
      email: 'admin@petmedi.kr',
      passwordHash: superAdminPassword,
      name: '시스템 관리자',
      phone: '010-0000-0000',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      emailVerified: new Date(),
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // 2. 테스트 병원 생성
  const hospital = await prisma.hospital.upsert({
    where: { businessNumber: '123-45-67890' },
    update: {},
    create: {
      name: '행복한 동물병원',
      businessNumber: '123-45-67890',
      licenseNumber: 'VET-2024-001',
      address: '서울특별시 강남구 테헤란로 123',
      addressDetail: '펫메디빌딩 3층',
      zipCode: '06234',
      phone: '02-1234-5678',
      email: 'happy@pethospital.kr',
      website: 'https://happypet.kr',
      description: '반려동물의 건강과 행복을 위한 최고의 진료 서비스를 제공합니다.',
      status: HospitalStatus.ACTIVE,
      isNetworkMember: true,
      networkJoinedAt: new Date(),
      operatingHours: {
        monday: { open: '09:00', close: '20:00' },
        tuesday: { open: '09:00', close: '20:00' },
        wednesday: { open: '09:00', close: '20:00' },
        thursday: { open: '09:00', close: '20:00' },
        friday: { open: '09:00', close: '20:00' },
        saturday: { open: '10:00', close: '17:00' },
        sunday: { open: null, close: null },
      },
      latitude: 37.5012,
      longitude: 127.0396,
    },
  });
  console.log('✅ Hospital created:', hospital.name);

  // 3. 병원 관리자 계정 생성
  const hospitalAdminPassword = await bcrypt.hash('hospital123!', 10);
  const hospitalAdmin = await prisma.user.upsert({
    where: { email: 'hospital@petmedi.kr' },
    update: {},
    create: {
      email: 'hospital@petmedi.kr',
      passwordHash: hospitalAdminPassword,
      name: '김병원',
      phone: '010-1111-2222',
      role: UserRole.HOSPITAL_ADMIN,
      isActive: true,
      emailVerified: new Date(),
    },
  });
  console.log('✅ Hospital Admin created:', hospitalAdmin.email);

  // 4. 수의사 계정 생성
  const vetPassword = await bcrypt.hash('vet123!', 10);
  const vet = await prisma.user.upsert({
    where: { email: 'vet@petmedi.kr' },
    update: {},
    create: {
      email: 'vet@petmedi.kr',
      passwordHash: vetPassword,
      name: '이수의',
      phone: '010-3333-4444',
      role: UserRole.VET,
      isActive: true,
      emailVerified: new Date(),
    },
  });
  console.log('✅ Veterinarian created:', vet.email);

  // 5. 병원 스태프 연결
  await prisma.hospitalStaff.upsert({
    where: {
      hospitalId_userId: {
        hospitalId: hospital.id,
        userId: hospitalAdmin.id,
      },
    },
    update: {},
    create: {
      hospitalId: hospital.id,
      userId: hospitalAdmin.id,
      position: '원장',
      isActive: true,
    },
  });

  await prisma.hospitalStaff.upsert({
    where: {
      hospitalId_userId: {
        hospitalId: hospital.id,
        userId: vet.id,
      },
    },
    update: {},
    create: {
      hospitalId: hospital.id,
      userId: vet.id,
      position: '담당 수의사',
      licenseNo: 'VET-12345',
      isActive: true,
    },
  });
  console.log('✅ Hospital staff linked');

  // 6. 보호자 계정 생성
  const guardianPassword = await bcrypt.hash('guardian123!', 10);
  const guardian = await prisma.user.upsert({
    where: { email: 'guardian@petmedi.kr' },
    update: {},
    create: {
      email: 'guardian@petmedi.kr',
      passwordHash: guardianPassword,
      name: '박보호',
      phone: '010-5555-6666',
      role: UserRole.GUARDIAN,
      isActive: true,
      emailVerified: new Date(),
    },
  });
  console.log('✅ Guardian created:', guardian.email);

  // 7. 동물 코드 시퀀스 초기화
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  await prisma.animalCodeSequence.upsert({
    where: { date: today },
    update: {},
    create: {
      date: today,
      sequence: 0,
    },
  });

  // 8. 테스트 동물 생성
  const animal1 = await prisma.animal.upsert({
    where: { code: 'D-20231201-0000001' },
    update: {},
    create: {
      code: 'D-20231201-0000001',
      species: Species.DOG,
      name: '뽀삐',
      breed: '말티즈',
      birthDate: new Date('2020-03-15'),
      birthDateType: 'EXACT',
      gender: Gender.FEMALE,
      isNeutered: true,
      weight: 3.5,
      color: '흰색',
      notes: '알레르기 있음 (닭고기)',
    },
  });

  const animal2 = await prisma.animal.upsert({
    where: { code: 'C-20231201-0000001' },
    update: {},
    create: {
      code: 'C-20231201-0000001',
      species: Species.CAT,
      name: '나비',
      breed: '코리안 숏헤어',
      birthDate: new Date('2021-06-20'),
      birthDateType: 'ESTIMATED',
      gender: Gender.MALE,
      isNeutered: true,
      weight: 4.2,
      color: '치즈색',
    },
  });
  console.log('✅ Animals created:', animal1.name, animal2.name);

  // 9. 보호자-동물 연결
  await prisma.guardianAnimal.upsert({
    where: {
      guardianId_animalId: {
        guardianId: guardian.id,
        animalId: animal1.id,
      },
    },
    update: {},
    create: {
      guardianId: guardian.id,
      animalId: animal1.id,
      isPrimary: true,
      relation: '가족',
    },
  });

  await prisma.guardianAnimal.upsert({
    where: {
      guardianId_animalId: {
        guardianId: guardian.id,
        animalId: animal2.id,
      },
    },
    update: {},
    create: {
      guardianId: guardian.id,
      animalId: animal2.id,
      isPrimary: true,
      relation: '가족',
    },
  });
  console.log('✅ Guardian-Animal relationships created');

  // 10. 테스트 진료 기록 생성
  const record1 = await prisma.medicalRecord.create({
    data: {
      animalId: animal1.id,
      hospitalId: hospital.id,
      vetId: vet.id,
      visitDate: new Date('2024-01-15'),
      visitType: VisitType.CHECKUP,
      chiefComplaint: '정기 건강검진',
      subjective: '보호자 진술: 최근 식욕이 약간 감소한 것 같음',
      objective: '체중 3.5kg, 체온 38.5°C, 심박수 120bpm, 호흡수 24회/분. 신체검사상 특이소견 없음.',
      assessment: '전반적으로 건강 상태 양호. 경미한 치석 관찰.',
      plan: '6개월 후 스케일링 권장. 다음 건강검진 1년 후 예약.',
      weight: 3.5,
      temperature: 38.5,
      heartRate: 120,
      respiratoryRate: 24,
      isShared: true,
    },
  });

  const record2 = await prisma.medicalRecord.create({
    data: {
      animalId: animal2.id,
      hospitalId: hospital.id,
      vetId: vet.id,
      visitDate: new Date('2024-02-20'),
      visitType: VisitType.VACCINATION,
      chiefComplaint: '종합백신 접종',
      subjective: '보호자 진술: 특이 증상 없음',
      objective: '체중 4.2kg, 체온 38.8°C. 신체검사 정상.',
      assessment: '건강 상태 양호. 예방접종 진행.',
      plan: '3주 후 2차 접종 예정.',
      weight: 4.2,
      temperature: 38.8,
      isShared: true,
    },
  });
  console.log('✅ Medical records created');

  // 11. 예방접종 기록 생성
  await prisma.vaccination.create({
    data: {
      animalId: animal1.id,
      vaccineName: 'DHPPL',
      vaccineType: '종합백신',
      manufacturer: '한국동물약품',
      administeredAt: new Date('2023-03-15'),
      nextDueDate: new Date('2024-03-15'),
      administeredBy: '이수의',
      hospitalName: '행복한 동물병원',
    },
  });

  await prisma.vaccination.create({
    data: {
      animalId: animal2.id,
      vaccineName: 'FVRCP',
      vaccineType: '고양이 종합백신',
      manufacturer: '한국동물약품',
      administeredAt: new Date('2024-02-20'),
      nextDueDate: new Date('2024-03-13'),
      administeredBy: '이수의',
      hospitalName: '행복한 동물병원',
    },
  });
  console.log('✅ Vaccination records created');

  // 12. 처방전 생성
  await prisma.prescription.create({
    data: {
      medicalRecordId: record1.id,
      medicineName: '치석 예방 츄',
      dosage: '1개',
      frequency: '1일 1회',
      duration: '지속',
      instructions: '식후 급여',
      quantity: 30,
    },
  });
  console.log('✅ Prescriptions created');

  console.log('\n🎉 Database seeding completed!');
  console.log('\n📋 Test Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Super Admin:    admin@petmedi.kr / admin123!');
  console.log('🏥 Hospital Admin: hospital@petmedi.kr / hospital123!');
  console.log('👨‍⚕️ Veterinarian:   vet@petmedi.kr / vet123!');
  console.log('👤 Guardian:       guardian@petmedi.kr / guardian123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

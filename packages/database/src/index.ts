// Import from the generated Prisma client (local to this package)
import { PrismaClient, Prisma } from '../generated/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export types and Prisma namespace from generated client
export { PrismaClient, Prisma };

// Re-export all enums
export {
  UserRole,
  Species,
  Gender,
  HospitalStatus,
  VisitType,
  ConsentType,
} from '../generated/client';

// Export prisma instance as default
export default prisma;

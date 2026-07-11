import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Create default Admin user
  const adminEmail = 'admin@jikadara.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Admin',
        role: 'ADMIN',
      },
    });
    console.log(`✅ Admin user created: ${admin.email} (password: admin123)`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

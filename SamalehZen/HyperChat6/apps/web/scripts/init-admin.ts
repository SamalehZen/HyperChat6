import { prisma } from '../../../packages/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('ADMIN_EMAIL or ADMIN_PASSWORD missing');
    process.exit(1);
  }

  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log('Already initialized, user exists:', existing.email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const u = await prisma.user.create({
    data: { email, passwordHash, role: 'admin' },
    select: { id: true, email: true, role: true },
  });
  console.log('Admin created:', u);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

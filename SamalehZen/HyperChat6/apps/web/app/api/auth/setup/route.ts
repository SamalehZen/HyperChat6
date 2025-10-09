import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export async function POST(request: NextRequest) {
  const anyUser = await prisma.user.findFirst();
  if (anyUser) return NextResponse.json({ error: 'Déjà initialisé' }, { status: 403 });

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ error: 'ADMIN_EMAIL et ADMIN_PASSWORD requis' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.admin,
    },
  });

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } }, { status: 201 });
}

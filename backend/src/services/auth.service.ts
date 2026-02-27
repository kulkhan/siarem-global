import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export async function loginUser(email: string, password: string, companyId: string | null) {
  let user;

  if (companyId === null) {
    // Super admin login: find user with null companyId and SUPER_ADMIN role
    user = await prisma.user.findFirst({
      where: { email, companyId: null, role: 'SUPER_ADMIN' },
    });
  } else {
    // Tenant user login: find user within the specific company
    user = await prisma.user.findFirst({
      where: { email, companyId },
    });
  }

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      companyId: user.companyId ?? null,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? null,
    },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }
  return user;
}

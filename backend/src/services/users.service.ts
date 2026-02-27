import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  const hashed = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role as 'ADMIN' | 'MANAGER' | 'USER',
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    password?: string;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}

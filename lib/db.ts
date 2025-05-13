import { PrismaClient } from "@prisma/client";

// 为了避免在开发中创建多个实例，我们在全局范围保存一个 PrismaClient 实例
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

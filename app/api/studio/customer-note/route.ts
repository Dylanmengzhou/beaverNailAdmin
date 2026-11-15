import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { BookingError } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
export async function GET(request: Request) {
  try {
    requireStaff(request);
    const userId = new URL(request.url).searchParams.get("userId");
    if (!userId) throw new BookingError("顾客 ID 不能为空");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, customerNote: true },
    });
    if (!user) throw new BookingError("顾客不存在", 404);
    return NextResponse.json(user);
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request) {
  try {
    requireStaff(request,true);
    const value = z
      .object({ userId: z.string().min(1), note: z.string().trim().max(2000) })
      .parse(await request.json());
    const user = await prisma.user.update({
      where: { id: value.userId },
      data: { customerNote: value.note || null },
      select: { id: true, customerNote: true },
    });
    return NextResponse.json(user);
  } catch (e) {
    return apiError(e);
  }
}

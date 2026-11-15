import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { BookingError } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
export async function GET(request: Request) {
  try {
    requireStaff(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new BookingError("预约 ID 不能为空");
    const record = await prisma.reservation.findUnique({
      where: { id },
      select: {
        serviceType: true,
        durationMinutes: true,
        customerRequest: true,
        referenceImageIds: true,
        userId: true,
      },
    });
    if (!record) throw new BookingError("预约不存在", 404);
    return NextResponse.json(record);
  } catch (e) {
    return apiError(e);
  }
}

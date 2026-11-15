import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { createBooking } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
import { reservationMessage, sendTelegram } from "@/lib/studio/notifications";
export async function POST(request: Request) {
  try {
    const operator = await requireStaff(request);
    const body = await request.json();
    const userId = z.string().min(1).parse(body.userId);
    const result = await createBooking(prisma, body, userId);
    const notified = await sendTelegram(
      reservationMessage(
        `预约成功提醒 ✅（${operator.username || "商家"}）`,
        result.reservation,
        result.user,
        result.artist,
      ),
    );
    return NextResponse.json(
      { success: true, reservation: result.reservation, notified },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}

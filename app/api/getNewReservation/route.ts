import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { apiError } from "@/lib/studio/http";
import { getClosedWeekdays } from "@/lib/studio/booking-db";
import { daySchema } from "@/lib/studio/validation";

export const runtime = "nodejs";
const rangeSchema = z
  .object({
    startDate: daySchema.optional(),
    endDate: daySchema.optional(),
  })
  .refine(
    (value) => Boolean(value.startDate) === Boolean(value.endDate),
    "请选择完整日期范围",
  )
  .refine(
    (value) =>
      !value.startDate || !value.endDate || value.startDate <= value.endDate,
    "结束日期不能早于开始日期",
  );

export async function POST(request: NextRequest) {
  try {
    const actor = await requireStaff(request);
    const { startDate, endDate } = rangeSchema.parse(await request.json());
    // Calendar scope comes from the verified session, never the supplied loginUser.
    const [closedWeekdays, reservations] = await Promise.all([
      getClosedWeekdays(prisma),
      prisma.reservation.findMany({
        where: {
          ...(actor.memberType === "staff" ? { nailArtistId: actor.id } : {}),
          ...(startDate && endDate
            ? {
                date: {
                  gte: new Date(startDate + "T00:00:00Z"),
                  lte: new Date(endDate + "T00:00:00Z"),
                },
              }
            : {}),
        },
        select: {
          id: true,
          date: true,
          timeSlot: true,
          serviceType: true,
          durationMinutes: true,
          isClick: true,
          nailArtistId: true,
          user: { select: { name: true, email: true, provider: true } },
          nailArtist: { select: { name: true } },
        },
        orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
      }),
    ]);
    return NextResponse.json(
      {
        success: true,
        closedWeekdays,
        message: reservations.map((booking) => ({
          id: booking.id,
          name: booking.user.name,
          email: booking.user.email,
          provider: booking.user.provider,
          date: booking.date,
          timeSlot: booking.timeSlot,
          serviceType: booking.serviceType,
          durationMinutes: booking.durationMinutes,
          isClick: booking.isClick ?? false,
          nailArtist: booking.nailArtist?.name ?? null,
          nailArtistId: booking.nailArtistId,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

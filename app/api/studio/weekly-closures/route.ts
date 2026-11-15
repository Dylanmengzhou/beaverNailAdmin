import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import {
  dateKey,
  isWeeklyClosure,
  seoulDay,
  slotInstant,
} from "@/lib/studio/booking";
import { getClosedWeekdays, lockScheduling } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";

const weekdays = z
  .array(z.number().int().min(0).max(6))
  .max(7)
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));
const rule = z.object({ closedWeekdays: weekdays, previous: weekdays });

export async function GET(request: Request) {
  try {
    await requireStaff(request);
    return NextResponse.json(
      { closedWeekdays: await getClosedWeekdays(prisma) },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireStaff(request, true);
    const { closedWeekdays, previous } = rule.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      await lockScheduling(tx, true);
      const current = await getClosedWeekdays(tx);
      if (closedWeekdays.join() === current.join()) return { closedWeekdays };
      if (previous.join() !== current.join()) {
        return {
          error: "其他管理员已修改固定休息日，请按最新设置重新选择",
          current,
        };
      }
      const added = closedWeekdays.filter((day) => !current.includes(day));
      if (added.length) {
        const now = new Date();
        const appointments = await tx.reservation.findMany({
          where: { date: { gte: new Date(seoulDay(now) + "T00:00:00Z") } },
          select: {
            id: true,
            date: true,
            timeSlot: true,
            durationMinutes: true,
            nailArtist: { select: { name: true } },
          },
          orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
        });
        const conflicts = appointments.filter(
          (a) =>
            isWeeklyClosure(dateKey(a.date), added) &&
            slotInstant(dateKey(a.date), a.timeSlot).getTime() +
              a.durationMinutes * 60000 >
              now.getTime(),
        );
        if (conflicts.length)
          return { error: "新选的休息日已有预约，请先处理以下订单", conflicts };
      }
      await tx.studioSchedule.upsert({
        where: { id: 1 },
        create: { id: 1, closedWeekdays },
        update: { closedWeekdays },
      });
      return { closedWeekdays };
    });
    return NextResponse.json(result, { status: "error" in result ? 409 : 200 });
  } catch (error) {
    return apiError(error);
  }
}

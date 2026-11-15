import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { timeOffSchema } from "@/lib/studio/validation";
import {
  lockAllStaff,
  timeOffConflicts,
  BookingError,
} from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
export async function GET(request: Request) {
  try {
    requireStaff(request);
    return NextResponse.json(
      await prisma.timeOff.findMany({
        include: { nailArtist: { select: { name: true } } },
        orderBy: { startsAt: "desc" },
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    requireStaff(request, true);
    const value = timeOffSchema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      await lockAllStaff(tx);
      if (
        value.nailArtistId &&
        !(await tx.nailArtist.findUnique({ where: { id: value.nailArtistId } }))
      )
        throw new BookingError("员工不存在", 404);
      const startsAt = new Date(value.startsAt),
        endsAt = new Date(value.endsAt);
      const conflicts = await timeOffConflicts(
        tx,
        startsAt,
        endsAt,
        value.nailArtistId,
      );
      if (conflicts.length) return { conflicts };
      return {
        record: await tx.timeOff.create({
          data: { ...value, startsAt, endsAt },
          include: { nailArtist: { select: { name: true } } },
        }),
      };
    });
    if ("conflicts" in result)
      return NextResponse.json(
        {
          error: "休息安排与已有预约冲突，请先处理以下预约",
          conflicts: result.conflicts,
        },
        { status: 409 },
      );
    return NextResponse.json(result.record, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    requireStaff(request, true);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new BookingError("缺少休息记录");
    await prisma.$transaction(async (tx) => {
      await lockAllStaff(tx);
      await tx.timeOff.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}

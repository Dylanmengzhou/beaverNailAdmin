import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyStaffIdentity } from "@/lib/studio/auth";
import { apiError } from "@/lib/studio/http";
import { BookingError } from "@/lib/studio/booking-db";
import { DEFAULT_CLOSED_WEEKDAYS, slotInstant } from "@/lib/studio/booking";
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
    const identity = verifyStaffIdentity(request);
    const { startDate, endDate } = rangeSchema.parse(await request.json());
    const hasRange = Boolean(startDate && endDate);
    const bookingsInRange = startDate && endDate
      ? Prisma.sql`AND r.date BETWEEN ${startDate}::date AND ${endDate}::date`
      : Prisma.empty;
    // These timestamp columns store UTC wall times independently of the database session's time zone.
    const timeOffInRange = startDate && endDate
      ? Prisma.sql`AND t."startsAt" < ${new Date(slotInstant(endDate, "00:00").getTime() + 86_400_000).toISOString()}::timestamp
                   AND t."endsAt" > ${slotInstant(startDate, "00:00").toISOString()}::timestamp`
      : Prisma.sql`AND FALSE`;

    // Resolve the current role and read the calendar in one database round trip.
    const [calendar] = await prisma.$queryRaw<{
      closedWeekdays: number[] | null;
      message: Prisma.JsonArray;
      timeOff: Prisma.JsonArray;
      restStaff: Prisma.JsonArray;
    }[]>`
      WITH viewer AS (
        SELECT id, COALESCE(membertype = 'manager', false) AS manages
        FROM "NailArtist"
        WHERE id = ${identity.id} AND NOT ${identity.configuredManager}
        UNION ALL
        SELECT ${identity.id}::text, true WHERE ${identity.configuredManager}
      )
      SELECT
        (SELECT "closedWeekdays" FROM "StudioSchedule" WHERE id = 1) AS "closedWeekdays",
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', r.id,
            'name', u.name,
            'email', u.email,
            'provider', u.provider,
            'date', to_char(r.date, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'timeSlot', r."timeSlot",
            'serviceType', r."serviceType",
            'durationMinutes', r."durationMinutes",
            'isClick', COALESCE(r."isClick", false),
            'nailArtist', s.name,
            'nailArtistId', r."nailArtistId"
          ) ORDER BY r.date, r."timeSlot")
          FROM "Reservation" r
          JOIN "User" u ON u.id = r."userId"
          LEFT JOIN "NailArtist" s ON s.id = r."nailArtistId"
          WHERE (viewer.manages OR r."nailArtistId" = viewer.id)
            ${bookingsInRange}
        ), '[]'::jsonb) AS message,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', t.id,
            'nailArtistId', t."nailArtistId",
            'nailArtist', CASE WHEN s.id IS NOT NULL THEN jsonb_build_object('name', s.name) END,
            'startsAt', to_char(t."startsAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'endsAt', to_char(t."endsAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          ) ORDER BY t."startsAt", t.id)
          FROM "TimeOff" t
          LEFT JOIN "NailArtist" s ON s.id = t."nailArtistId"
          WHERE (viewer.manages OR t."nailArtistId" IS NULL OR t."nailArtistId" = viewer.id)
            ${timeOffInRange}
        ), '[]'::jsonb) AS "timeOff",
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'active', s.active,
            'services', s.services,
            'durationMinutes', s."durationMinutes",
            'schedule', s.schedule,
            'serviceSettings', s."serviceSettings"
          ) ORDER BY s.name)
          FROM "NailArtist" s
          WHERE ${hasRange} AND s.active AND (viewer.manages OR s.id = viewer.id)
        ), '[]'::jsonb) AS "restStaff"
      FROM viewer
    `;
    if (!calendar) throw new BookingError("员工账号已不存在，请重新登录", 401);
    return NextResponse.json(
      {
        success: true,
        ...calendar,
        closedWeekdays: calendar.closedWeekdays ?? DEFAULT_CLOSED_WEEKDAYS,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

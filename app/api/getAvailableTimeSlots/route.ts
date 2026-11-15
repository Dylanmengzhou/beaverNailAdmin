import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { getAvailability, BookingError } from "@/lib/studio/booking-db";
import { daySchema, serviceSchema } from "@/lib/studio/validation";
import { apiError } from "@/lib/studio/http";
export async function GET(request: Request) {
  try {
    await requireStaff(request);
    const p = new URL(request.url).searchParams;
    const day = daySchema.parse(p.get("date"));
    const service = serviceSchema.parse(p.get("serviceType") || "nails");
    const id = p.get("nailArtistId");
    if (!id) throw new BookingError("请选择员工");
    return NextResponse.json({
      success: true,
      ...(await getAvailability(prisma, day, id, service)),
    });
  } catch (e) {
    return apiError(e);
  }
}

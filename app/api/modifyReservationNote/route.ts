import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { apiError } from "@/lib/studio/http";
export async function POST(request: Request) {
  try {
    await requireStaff(request);
    const value = z
      .object({
        reservationid: z.string().min(1),
        note: z.string().trim().max(2000),
      })
      .parse(await request.json());
    await prisma.reservation.update({
      where: { id: value.reservationid },
      data: { note: value.note || null },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}

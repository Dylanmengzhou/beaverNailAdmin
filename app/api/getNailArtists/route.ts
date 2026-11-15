import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/studio/http";
import { requireStaff } from "@/lib/studio/auth";
export async function GET(request: Request) {
  try {
    await requireStaff(request);
    const nailArtists = await prisma.nailArtist.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        role: true,
        services: true,
        durationMinutes: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, nailArtists });
  } catch (e) {
    return apiError(e);
  }
}

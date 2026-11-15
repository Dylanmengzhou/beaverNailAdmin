import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { homeSchema } from "@/lib/studio/validation";
import { DEFAULT_HOME } from "@/lib/studio/home";
import { BookingError } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
export async function GET(request: Request) {
  try {
    await requireStaff(request, true);
    const value = await prisma.homeContent.findUnique({
      where: { key: "homepage" },
    });
    return NextResponse.json(
      value ? homeSchema.parse(value.value) : DEFAULT_HOME,
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    await requireStaff(request, true);
    const value = homeSchema.parse(await request.json());
    const ids = [
      ...new Set(
        value.slides
          .map((s) => s.image)
          .filter((url) => url.startsWith("/api/media/"))
          .map((url) => url.split("/").pop()!),
      ),
    ];
    if (
      (await prisma.mediaAsset.count({
        where: { id: { in: ids }, purpose: "home" },
      })) !== ids.length
    )
      throw new BookingError("首页图片无效");
    await prisma.homeContent.upsert({
      where: { key: "homepage" },
      create: { key: "homepage", value },
      update: { value },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}

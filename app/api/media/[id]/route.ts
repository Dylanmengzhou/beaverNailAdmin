import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { BookingError } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new BookingError("图片不存在", 404);
    if (asset.purpose !== "home") requireStaff(request);
    return new NextResponse(new Uint8Array(asset.data), {
      headers: {
        "Content-Type": asset.mimeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control":
          asset.purpose === "home"
            ? "public, max-age=86400"
            : "private, no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

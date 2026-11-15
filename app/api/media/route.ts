import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { imageBytes } from "@/lib/studio/media";
import { BookingError } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
export async function POST(request: Request) {
  try {
    const operator = await requireStaff(request);
    const form = await request.formData();
    const purpose = form.get("purpose") === "reference" ? "reference" : "home";
    if (purpose === "home" && operator.memberType !== "manager")
      throw new BookingError("仅管理员可以编辑首页", 403);
    const file = form.get("file");
    if (!(file instanceof File)) throw new BookingError("请选择图片");
    const ownerId =
      purpose === "reference" ? String(form.get("userId") || "") : null;
    if (
      purpose === "reference" &&
      (!ownerId ||
        !(await prisma.user.findUnique({
          where: { id: ownerId },
          select: { id: true },
        })))
    )
      throw new BookingError("顾客不存在", 404);
    const image = await imageBytes(file);
    const asset = await prisma.mediaAsset.create({
      data: { ...image, purpose, ownerId },
      select: { id: true },
    });
    return NextResponse.json({ id: asset.id, url: `/api/media/${asset.id}` });
  } catch (e) {
    return apiError(e);
  }
}

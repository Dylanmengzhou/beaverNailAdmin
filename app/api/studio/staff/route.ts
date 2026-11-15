import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { lockScheduling } from "@/lib/studio/booking-db";
import { staffSchema } from "@/lib/studio/validation";
import { apiError } from "@/lib/studio/http";
import { BookingError } from "@/lib/studio/booking-db";
import {contentKey,DEFAULT_CONTENT,studioContentSchema} from "@/lib/studio/content";
import { z } from "zod";
const managementSchema = staffSchema
  .extend({
    role: z.enum(["L1", "L2", "L3", "L4", "L5", "L6"]).optional(),
    membertype:z.enum(["staff","manager"]).optional(),
    account: z
      .string()
      .trim()
      .min(4, "登录账号至少需要 4 个字符")
      .max(80)
      .optional(),
    password: z
      .string()
      .min(6, "登录密码至少需要 6 个字符")
      .max(200)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.account && value.account.length < 4)
      ctx.addIssue({
        code: "custom",
        path: ["account"],
        message: "登录账号至少需要 4 个字符",
      });
    if (value.password && value.password.length < 6)
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "登录密码至少需要 6 个字符",
      });
    if (value.password && value.account === "")
      ctx.addIssue({
        code: "custom",
        path: ["account"],
        message: "请先填写登录账号",
      });
  });
const publicFields = {
  id: true,
  name: true,
  role: true,
  active: true,
  services: true,
  durationMinutes: true,
  schedule: true,
  serviceSettings:true,
  commissionRateBps:true,
  account: true,
  membertype:true,
} as const;
export async function GET(request: Request) {
  try {
    await requireStaff(request, true);
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const item = await prisma.nailArtist.findUnique({
        where: { id },
        select: { ...publicFields, password: true },
      });
      if (!item) throw new BookingError("员工不存在，请刷新后重试", 404);
      return NextResponse.json(item, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    return NextResponse.json(
      await prisma.nailArtist.findMany({
        select: publicFields,
        orderBy: { name: "asc" },
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    await requireStaff(request, true);
    const { id, account, password, membertype, ...value } = managementSchema.parse(
      await request.json(),
    );
    const result = await prisma.$transaction(async (tx) => {
      await lockScheduling(tx);
      const content=await tx.homeContent.findUnique({where:{key:contentKey}});
      const catalog=content?studioContentSchema.parse(content.value):DEFAULT_CONTENT;
      if(value.services.some(s=>!catalog.services.some(row=>row.id===s)))throw new BookingError("请选择已存在的服务项目");
      if(value.serviceSettings && Object.keys(value.serviceSettings).some(s=>!value.services.includes(s)))value.serviceSettings=Object.fromEntries(Object.entries(value.serviceSettings).filter(([s])=>value.services.includes(s)));

      const existing = id
        ? await tx.nailArtist.findUnique({ where: { id } })
        : null;
      if (id && !existing)
        throw new BookingError("员工不存在，请刷新后重试", 404);
      if (!id && (!account || !password))
        throw new BookingError("新增员工必须填写登录账号和密码", 400);
      if (account) {
        if (
          account === "beavernail" ||
          (await tx.nailArtist.findFirst({
            where: { account, ...(id ? { id: { not: id } } : {}) },
            select: { id: true },
          }))
        )
          throw new BookingError("登录账号已被使用，请换一个账号", 409);
        if (!password && !existing?.password)
          throw new BookingError("首次设置登录账号时，请同时设置密码", 400);
      }
      const credentials = {
        ...(account !== undefined ? { account: account || null } : {}),
        ...(password ? { password } : {}),
      };
      if (id) {
        await tx.$queryRaw`SELECT id FROM "NailArtist" WHERE id = ${id} FOR UPDATE`;
        return tx.nailArtist.update({
          where: { id },
          data: {
            ...value,
            ...credentials,
            membertype:membertype??existing?.membertype??"staff",
          },
          select: publicFields,
        });
      }
      return tx.nailArtist.create({
        data: {
          ...value,
          ...credentials,
          role: value.role ?? "L3",
          membertype: membertype??"staff",
        },
        select: publicFields,
      });
    });
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireStaff(request, true);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new BookingError("请选择要移除的员工", 400);
    if (id === actor.id) throw new BookingError("不能移除当前登录的员工", 409);
    await prisma.$transaction(async (tx) => {
      await lockScheduling(tx);
      const item = await tx.nailArtist.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!item) throw new BookingError("员工不存在，请刷新后重试", 404);
      if (await tx.reservation.count({ where: { nailArtistId: id } }))
        throw new BookingError(
          "这位员工有关联预约，无法移除。可以关闭开放预约，保留历史记录。",
          409,
        );
      await tx.nailArtist.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

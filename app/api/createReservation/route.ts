import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";

// 定义请求体验证架构
const reservationSchema = z.object({
  date: z.string().refine((value) => !isNaN(Date.parse(value)), {
    message: "日期格式无效",
  }),
  timeSlot: z.string(),
  userId: z.string(),
  nailArtistId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);

  try {
    // 解析并验证请求数据
    const body = await request.json();
    const loginUser = body.loginUser;
    const result = reservationSchema.safeParse(body);

    if (!result.success) {
      // 验证失败，返回错误
      return NextResponse.json(
        {
          success: false,
          message: "输入数据验证失败",
          errors: result.error.format(),
        },
        { status: 400 }
      );
    }

    const { date, timeSlot, userId, nailArtistId } = result.data;
    const parsedDate = new Date(date);

    console.log("创建预约数据:", {
      reservationId: createId(),
      date: parsedDate,
      timeSlot,
      userId,
      nailArtistId,
    });

    // 检查时间段和日期是否已被预约（如果指定了美甲师）
    if (nailArtistId) {
      const existingReservation = await sql`
        SELECT id FROM "Reservation"
        WHERE date = ${date}
        AND "timeSlot" = ${timeSlot}
        AND "nailArtistId" = ${nailArtistId}
      `;

      if (existingReservation.length > 0) {
        return NextResponse.json(
          { success: false, message: "该时间段已被预约" },
          { status: 409 }
        );
      }
    }

    const user = await sql`
      SELECT * FROM "User"
      WHERE id = ${userId}
    `;

    const nailArtist = await sql`
      SELECT * FROM "NailArtist"
      WHERE id = ${nailArtistId}
    `;

    // 创建新预约
    const reservationId = createId();
    const now = new Date();
    const newReservation = await sql`
      INSERT INTO "Reservation" (
        id, 
        date, 
        "timeSlot", 
        "userId", 
        "nailArtistId", 
        "createdAt", 
        "updatedAt",
        "currentMemberShip"
      )
      VALUES (
        ${reservationId}, 
        ${parsedDate}, 
        ${timeSlot}, 
        ${userId}, 
        ${nailArtistId}, 
        ${now}, 
        ${now},
        ${user[0].membershipType}
      )
      RETURNING id, date, "timeSlot", "userId", "nailArtistId"
    `;
    await fetch(
      "https://botbuilder.larksuite.com/api/trigger-webhook/5b8929c8824bd9320346d9d8b87544ab" as string,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg_type: "text",
          content: {
            whoRegistered: loginUser,
            username: user[0].name,
            phone: user[0].email,
            date: new Date(date).toISOString().split("T")[0],
            time: timeSlot,
            nailArtist: nailArtist[0].name || "未分配",
            contactType: user[0].contactType,
            provider: user[0].provider,
          },
        }),
      }
    );

    return NextResponse.json(
      { success: true, reservation: newReservation[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("创建预约失败:", error);
    return NextResponse.json(
      { success: false, message: "创建预约失败，请稍后再试" },
      { status: 500 }
    );
  }
}

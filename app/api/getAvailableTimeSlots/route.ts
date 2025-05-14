import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// 所有可能的时间段
const ALL_TIME_SLOTS = ["10:00", "12:00", "14:00", "16:00", "19:00"];

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);

  // 获取查询参数
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const nailArtistId = searchParams.get("nailArtistId");

  if (!dateStr) {
    return NextResponse.json(
      { success: false, message: "日期参数不能为空" },
      { status: 400 }
    );
  }

  if (!nailArtistId) {
    return NextResponse.json(
      { success: false, message: "美甲师ID不能为空" },
      { status: 400 }
    );
  }

  try {
    const date = new Date(dateStr);

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, message: "日期格式无效" },
        { status: 400 }
      );
    }
    console.log(date, nailArtistId);
    // 获取指定日期和美甲师已预约的时间段
    const reservedTimeSlots = await sql`
      SELECT "timeSlot"
      FROM "Reservation"
      WHERE date::date = ${date}::date
      AND "nailArtistId" = ${nailArtistId}
    `;
    console.log("预约已有时间:", reservedTimeSlots);

    const reservedSlots = reservedTimeSlots.map((row) => row.timeSlot);

    // 计算可用时间段
    const availableTimeSlots = ALL_TIME_SLOTS.filter(
      (slot) => !reservedSlots.includes(slot)
    );

    return NextResponse.json(
      { success: true, availableTimeSlots },
      { status: 200 }
    );
  } catch (error) {
    console.error("获取可用时间段失败:", error);
    return NextResponse.json(
      { success: false, message: "获取可用时间段失败，请稍后再试" },
      { status: 500 }
    );
  }
}

import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { reservationId, isClick } = await request.json();

    if (!reservationId) {
      return NextResponse.json(
        { success: false, message: "预约ID是必需的" },
        { status: 400 }
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not defined");
    }
    const sql = neon(databaseUrl);

    // 更新预约的 isClick 状态
    await sql`
      UPDATE "Reservation" 
      SET "isClick" = ${isClick}
      WHERE "id" = ${reservationId}
    `;

    console.log(`✅ 已更新预约 ${reservationId} 的点击状态为: ${isClick}`);

    return NextResponse.json({
      success: true,
      message: "预约点击状态更新成功",
    });
  } catch (error) {
    console.error("更新预约点击状态失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

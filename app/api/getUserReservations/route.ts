import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);

  // 获取搜索参数
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("userId");

  if (!query || query.trim() === "") {
    return NextResponse.json(
      { success: false, message: "搜索关键词不能为空" },
      { status: 400 }
    );
  }

  try {
    // 获取用户预约
    const reservations = await sql`
      SELECT
				r.id AS "reservationId",
				u.id AS "userId",
				r.date,
				r."timeSlot",
				na.name AS "nailArtistName",
				r."note",
				r."finalPrice",
				r."depositPaid",
				r."paymentMethod",
        r."currentMemberShip",
				GREATEST(u."balance" - COALESCE((
					SELECT SUM(r2."finalPrice")
					FROM "Reservation" r2
					WHERE r2."userId" = u.id 
          AND r2."paymentMethod" = 'memberCard'
          AND (
            r2.date < r.date 
            OR (r2.date = r.date AND r2."timeSlot" < r."timeSlot")
          )
					AND r2."finalPrice" IS NOT NULL
				), 0), 0) AS "balance"
			FROM "Reservation" r
			JOIN "User" u ON r."userId" = u.id
			LEFT JOIN "NailArtist" na ON r."nailArtistId" = na.id
			WHERE r."userId" = ${query}
            ORDER BY r.date DESC
    `;
    console.log(reservations);

    return NextResponse.json({ success: true, reservations }, { status: 200 });
  } catch (error) {
    console.error("搜索用户失败:", error);
    return NextResponse.json(
      { success: false, message: "搜索用户失败，请稍后再试" },
      { status: 500 }
    );
  }
}

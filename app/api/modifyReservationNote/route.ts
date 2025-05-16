import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  const { reservationid, note } = await request.json();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL is not defined" },
      { status: 500 }
    );
  }
  const sql = neon(databaseUrl);

  // 检查reservationid是否存在
  const reservationResult = await sql`
    SELECT * FROM "Reservation" WHERE "id" = ${reservationid}
    `;
  if (reservationResult.length === 0) {
    return NextResponse.json({ error: "预约不存在" }, { status: 404 });
  }

  try {
    await sql`
    UPDATE "Reservation" SET "note" = ${note} WHERE "id" = ${reservationid}
    `;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "修改失败" }, { status: 500 });
  }
}

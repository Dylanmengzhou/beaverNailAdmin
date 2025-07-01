import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  const { reservationid, price, currency, paymentMethod } = await request.json();

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
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 }
    );
  }

  try {
    // 更新价格
    await sql`
  UPDATE "Reservation" SET "finalPrice" = ${price}, "currency" = ${currency}, "paymentMethod" = ${paymentMethod} WHERE "id" = ${reservationid}
`;
    console.log(reservationid, price, currency, paymentMethod);
    return NextResponse.json({ message: "Price modified" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to modify price" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
export async function POST(request: NextRequest) {
  const { reservationId, depositPaid } = await request.json();
  console.log(reservationId, depositPaid);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json(
      { error: "Database URL is not set" },
      { status: 500 }
    );
  }
  const sql = neon(databaseUrl);
  const reservationResult = await sql`
    SELECT * FROM "Reservation" WHERE "id" = ${reservationId}
    `;
  console.log(reservationResult);
  if (reservationResult.length === 0) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 }
    );
  }
  try {
    await sql`
    UPDATE "Reservation" SET "depositPaid" = ${depositPaid} WHERE "id" = ${reservationId}
    `;
    return NextResponse.json({ message: "Deposit status modified" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to modify deposit status" },
      { status: 500 }
    );
  }
}

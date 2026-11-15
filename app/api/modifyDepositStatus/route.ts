import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/sql";
export async function POST(request: NextRequest) {
  const { reservationId, depositPaid } = await request.json();
  console.log(reservationId, depositPaid);

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

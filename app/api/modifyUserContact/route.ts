// give me a post api to modify user contact
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);
  // first get the body of the request
  const body = await request.json();
  // console.log the body
  const { reservationid, altContact, altContactType } = body;
  console.log(reservationid, altContact, altContactType);
  //   我想逆向用reservationid来获取用户然后修改用户信息
  try {
    await sql`
      UPDATE "User"
      SET "altContactType" = ${altContactType},
          "altContact" = ${altContact}
      WHERE "id" = (
        SELECT "userId"
        FROM "Reservation"
        WHERE "id" = ${reservationid}
      );
    `;
    return NextResponse.json(
      { success: true, message: "Contact modified" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to modify contact" },
      { status: 500 }
    );
  }
}

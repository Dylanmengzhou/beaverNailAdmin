import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "edge"; // 👈 记得加这个！neon 要 edge function

export async function GET() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not defined");
	}
	const sql = neon(databaseUrl);

	try {
		const reservations = await sql`
  SELECT
    "User"."name",
    "User"."email",
	"Reservation"."id",
    "Reservation"."date",
    "Reservation"."timeSlot"
  FROM
    "Reservation"
  JOIN
    "User"
  ON
    "Reservation"."userId" = "User"."id"
`; // 👈 表名加双引号！

		return NextResponse.json(
			{ success: true, message: reservations },
			{ status: 200 }
		);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "未知错误";
		return NextResponse.json(
			{ success: false, message: errorMessage },
			{ status: 500 }
		);
	}
}

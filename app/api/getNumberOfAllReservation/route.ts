import { sql } from "@/lib/sql";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {


	try {
		const result = await sql`
      SELECT COUNT(*) AS "totalReservations"
      FROM "Reservation"
    `;

		// neon 返回的是数组，所以取第一个
		const totalReservations = result[0]?.totalReservations || 0;

		return NextResponse.json(
			{ success: true, totalReservations },
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

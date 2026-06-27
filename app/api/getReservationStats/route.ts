import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "edge"; // 👈 neon 要 Edge Runtime

export async function GET() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not defined");
	}

	const sql = neon(databaseUrl);

	try {
		const rows = await sql`
      SELECT
        TO_CHAR("Reservation"."date", 'YYYY-MM') AS "month",
        "Reservation"."nailArtistId" AS "nailArtistId",
        "Reservation"."currency" AS "currency",
        COUNT(*) AS "count",
        COUNT("Reservation"."finalPrice") AS "pricedCount",
        SUM("Reservation"."finalPrice") AS "revenue"
      FROM "Reservation"
      LEFT JOIN "NailArtist"
        ON "Reservation"."nailArtistId" = "NailArtist"."id"
      GROUP BY
        TO_CHAR("Reservation"."date", 'YYYY-MM'),
        "Reservation"."nailArtistId",
        "Reservation"."currency"
      ORDER BY "month" ASC
    `;

		const artists = await sql`
      SELECT "id", "name" FROM "NailArtist"
    `;

		const formattedRows = rows.map((row) => ({
			month: row.month as string,
			nailArtistId: (row.nailArtistId as string | null) ?? null,
			currency: (row.currency as string | null) ?? null,
			count: Number(row.count),
			pricedCount: Number(row.pricedCount),
			revenue: row.revenue == null ? 0 : Number(row.revenue),
		}));

		const formattedArtists = artists.map((a) => ({
			id: a.id as string,
			name: a.name as string,
		}));

		return NextResponse.json(
			{ success: true, rows: formattedRows, artists: formattedArtists },
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

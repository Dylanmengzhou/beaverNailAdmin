import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "edge"; // 👈 这里对的！


// 获取单个预约
export async function GET(req: Request) {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not defined");
	}
	const sql = neon(databaseUrl);

	// 用 URL 解析 query
	const { searchParams } = new URL(req.url);
	const reservationid = searchParams.get("reservationid");

	if (!reservationid) {
		return NextResponse.json(
			{ success: false, message: "预约ID不能为空" },
			{ status: 400 }
		);
	}

	try {
		const result = await sql`
			SELECT
				r.id AS "reservationId",
				u.name,
				u.email,
				u.provider,
				r.date,
				r."timeSlot",
				u."contactType"
			FROM "Reservation" r
			JOIN "User" u ON r."userId" = u.id
			WHERE r.id = ${reservationid}
			LIMIT 1
		`;
		console.log(result);

		if (result.length === 0) {
			return NextResponse.json(
				{ success: false, message: "未找到预约" },
				{ status: 404 }
			);
		}


		return NextResponse.json(result[0], { status: 200 });
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "未知错误";
		return NextResponse.json(
			{ success: false, message: errorMessage },
			{ status: 500 }
		);
	}
}




// 删除预约
export async function POST(req: Request) {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not defined");
	}
	const sql = neon(databaseUrl);

	// 同样用 URL 解析 query
	const { searchParams } = new URL(req.url);
	const reservationid = searchParams.get("reservationid");

	if (!reservationid) {
		return NextResponse.json(
			{ success: false, message: "预约ID不能为空" },
			{ status: 400 }
		);
	}

	try {
		const result = await sql`
			SELECT
				r.id AS "reservationId",
				u.name,
				u.email,
				u.provider,
				r.date,
				r."timeSlot"
			FROM "Reservation" r
			JOIN "User" u ON r."userId" = u.id
			WHERE r.id = ${reservationid}
			LIMIT 1
		`;

		if (result.length === 0) {
			return NextResponse.json(
				{ success: false, message: "未找到预约" },
				{ status: 404 }
			);
		}

		await sql`
			DELETE FROM "Reservation"
			WHERE id = ${reservationid}
		`;
		await fetch("https://botbuilder.larksuite.com/api/trigger-webhook/0a5197fbd746e1eeaf3a0afa1ddb795f" as string, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				msg_type: "text",
				content: {
					whoCancelled: "商家取消",
					username: result[0].name,
					phone: result[0].email,
					reservationId: result[0].reservationId,
					date: new Date(result[0].date).toISOString().split('T')[0],
					time: result[0].timeSlot,
				},
			}),
		});
		return NextResponse.json(
			{ success: true, message: "删除成功" },
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
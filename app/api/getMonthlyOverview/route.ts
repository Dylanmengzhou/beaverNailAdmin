import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // 👈 neon 要 Edge Runtime

// 返回某个月的看板数据：按天聚合、按支付方式聚合、汇总（以及上月汇总用于环比）
export async function GET(request: NextRequest) {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not defined");
	}

	// month 形如 "2026-06"，默认当前月由前端传入
	const month = request.nextUrl.searchParams.get("month");
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return NextResponse.json(
			{ success: false, message: "month 参数无效，需形如 YYYY-MM" },
			{ status: 400 }
		);
	}

	// 计算本月起止与上月起止（字符串边界，避免时区问题）
	const [yStr, mStr] = month.split("-");
	const y = Number(yStr);
	const m = Number(mStr);
	const pad = (n: number) => String(n).padStart(2, "0");
	const monthStart = `${month}-01`;
	const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
	const prevY = m === 1 ? y - 1 : y;
	const prevM = m === 1 ? 12 : m - 1;
	const prevStart = `${prevY}-${pad(prevM)}-01`;

	const sql = neon(databaseUrl);

	try {
		// 按天聚合（本月）
		const daily = await sql`
      SELECT
        TO_CHAR("date", 'YYYY-MM-DD') AS "day",
        COUNT(*) AS "count",
        COALESCE(SUM(CASE WHEN "currency" = 'KRW' THEN "finalPrice" ELSE 0 END), 0) AS "revenue"
      FROM "Reservation"
      WHERE "date" >= ${monthStart} AND "date" < ${nextMonth}
      GROUP BY TO_CHAR("date", 'YYYY-MM-DD')
      ORDER BY "day" ASC
    `;

		// 按支付方式聚合（本月）
		const byPayment = await sql`
      SELECT
        COALESCE("paymentMethod", 'unknown') AS "method",
        COUNT(*) AS "count"
      FROM "Reservation"
      WHERE "date" >= ${monthStart} AND "date" < ${nextMonth}
      GROUP BY "paymentMethod"
      ORDER BY "count" DESC
    `;

		// 按时间段聚合（本月）：看哪个时间点来的人最多
		const byTimeSlot = await sql`
      SELECT
        "timeSlot" AS "slot",
        COUNT(*) AS "count"
      FROM "Reservation"
      WHERE "date" >= ${monthStart} AND "date" < ${nextMonth}
      GROUP BY "timeSlot"
    `;

		// 本月汇总（KRW 营收 + 客单价）
		const thisSummary = await sql`
      SELECT
        COUNT(*) AS "count",
        COUNT("finalPrice") FILTER (WHERE "currency" = 'KRW') AS "pricedCount",
        COALESCE(SUM(CASE WHEN "currency" = 'KRW' THEN "finalPrice" ELSE 0 END), 0) AS "revenue"
      FROM "Reservation"
      WHERE "date" >= ${monthStart} AND "date" < ${nextMonth}
    `;

		// 上月汇总（用于环比）
		const prevSummary = await sql`
      SELECT
        COUNT(*) AS "count",
        COALESCE(SUM(CASE WHEN "currency" = 'KRW' THEN "finalPrice" ELSE 0 END), 0) AS "revenue"
      FROM "Reservation"
      WHERE "date" >= ${prevStart} AND "date" < ${monthStart}
    `;

		const num = (v: unknown) => (v == null ? 0 : Number(v));

		return NextResponse.json(
			{
				success: true,
				month,
				daily: daily.map((d) => ({
					day: d.day as string,
					count: num(d.count),
					revenue: num(d.revenue),
				})),
				byPayment: byPayment.map((p) => ({
					method: p.method as string,
					count: num(p.count),
				})),
				byTimeSlot: byTimeSlot.map((t) => ({
					slot: String(t.slot),
					count: num(t.count),
				})),
				summary: {
					count: num(thisSummary[0]?.count),
					pricedCount: num(thisSummary[0]?.pricedCount),
					revenue: num(thisSummary[0]?.revenue),
				},
				prev: {
					count: num(prevSummary[0]?.count),
					revenue: num(prevSummary[0]?.revenue),
				},
			},
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

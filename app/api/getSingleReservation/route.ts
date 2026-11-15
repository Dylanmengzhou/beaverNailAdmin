import prisma from "@/lib/prisma";
import { reservationMessage, sendTelegram } from "@/lib/studio/notifications";
import { sql } from "@/lib/sql";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// 获取单个预约
export async function GET(req: Request) {


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
        u.id AS "userId",
				u.name,
				u.email,
				u."altContact",
				u."altContactType",
				u.provider,
				r.date,
				r."timeSlot",
				u."contactType",
				na.name AS "nailArtistName",
				na.account AS "nailArtistAccount",
				r."note",
				r."finalPrice",
        r."receivedAmount",
        r."commissionAmount",
				r."currency",
				r."depositPaid",
				u."membershipType",
        r."paymentMethod",
        r."currentMemberShip",
        r."uploadImage",
				GREATEST(u."balance" - COALESCE((
					SELECT SUM(r2."finalPrice")
					FROM "Reservation" r2
					WHERE r2."userId" = u.id
          AND r2."paymentMethod" = 'memberCard'
          AND (
            r2.date < r.date 
            OR (r2.date = r.date AND r2."timeSlot" < r."timeSlot")
          )
					AND r2."finalPrice" IS NOT NULL
				), 0), 0) AS "balance"
			FROM "Reservation" r
			JOIN "User" u ON r."userId" = u.id
			LEFT JOIN "NailArtist" na ON r."nailArtistId" = na.id
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
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

// 删除预约
export async function POST(req: Request) {


  // 同样用 URL 解析 query
  const { searchParams } = new URL(req.url);
  const reservationid = searchParams.get("reservationid");

  // 从请求体获取操作者信息
  const requestData = await req.json();
  const { operatorName, operatorAccount, operatorType } = requestData;
  console.log(operatorName, operatorAccount, operatorType);
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
				u."contactType",
				u.email,
				u.provider,
				r.date,
				r."timeSlot",
				na.name AS "nailArtistName",
				na.account AS "nailArtistAccount"
			FROM "Reservation" r
			JOIN "User" u ON r."userId" = u.id
			LEFT JOIN "NailArtist" na ON r."nailArtistId" = na.id
			WHERE r.id = ${reservationid}
			LIMIT 1
		`;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: "未找到预约" },
        { status: 404 }
      );
    }

    const notificationRecord = await prisma.reservation.findUnique({ where: { id: reservationid }, include: { user: true, nailArtist: { select: { name: true } } } });
    await sql`
			DELETE FROM "Reservation"
			WHERE id = ${reservationid}
		`;

    // 使用函数来获取中文角色类型
    const getStaffTypeText = (type: string): string => {
      if (type === "staff") return "员工";
      if (type === "manager") return "管理员";
      return "未知";
    };

    // 构建操作者信息
    const cancelledBy = operatorName
      ? `${getStaffTypeText(operatorType)}-${operatorName}`
      : "商家取消";

    // await fetch(
    //   "https://botbuilder.larksuite.com/api/trigger-webhook/0a5197fbd746e1eeaf3a0afa1ddb795f" as string,
    //   {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       msg_type: "text",
    //       content: {
    //         whoCancelled: cancelledBy,
    //         username: result[0].name,
    //         phone: result[0].email,
    //         reservationId: result[0].reservationId,
    //         date: new Date(result[0].date).toISOString().split("T")[0],
    //         time: result[0].timeSlot,
    //         nailArtist: result[0].nailArtistName || "未分配",
    //         contactType: result[0].contactType,
    //         provider: result[0].provider,
    //       },
    //     }),
    //   }
    // );
    if (notificationRecord) await sendTelegram(reservationMessage(`预约取消提醒 ❌（${cancelledBy}）`, notificationRecord, notificationRecord.user, notificationRecord.nailArtist));
    return NextResponse.json(
      { success: true, message: "删除成功" },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error("删除预约出错:", errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

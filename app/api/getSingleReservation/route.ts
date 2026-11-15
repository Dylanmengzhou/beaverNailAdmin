import {lockCommissionMonths,recalculateCommissionMonth,scopeFor} from "@/lib/studio/commission-db";
import { requireStaff } from "@/lib/studio/auth";
import { assertSettlementOwner } from "@/lib/studio/settlement-db";
import { BookingError } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
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
    const actor = await requireStaff(req);
    const result = await sql`
			SELECT
				r.id AS "reservationId",
        r."nailArtistId",
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


    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: "未找到预约" },
        { status: 404 }
      );
    }

    if(actor.memberType!=="manager" && result[0].nailArtistId!==actor.id) result[0].commissionAmount=null;
    return NextResponse.json(result[0], { status: 200,headers:{"Cache-Control":"private, no-store"} });
  } catch (error) { return apiError(error); }
}

// Cancellation uses the authenticated actor and preserves settlement audit history.
export async function POST(req: Request) {
  try {
    const actor = await requireStaff(req);
    const id = new URL(req.url).searchParams.get("reservationid");
    if (!id) throw new BookingError("预约 ID 不能为空");
    const record = await prisma.$transaction(async tx => {
      const initial=await tx.reservation.findUnique({where:{id},select:{nailArtistId:true,serviceType:true,date:true,currency:true}});
      const scope=initial?.nailArtistId?scopeFor(initial,initial.currency||"KRW"):null;
      if(scope)await lockCommissionMonths(tx,[scope]);
      await tx.$queryRaw`SELECT id FROM "Reservation" WHERE id=${id} FOR UPDATE`;
      const booking = await tx.reservation.findUnique({where:{id},include:{user:true,nailArtist:{select:{name:true}}}});
      if (!booking) throw new BookingError("预约不存在",404);
      if(initial&&(booking.currency!==initial.currency||booking.nailArtistId!==initial.nailArtistId||booking.serviceType!==initial.serviceType||booking.date.getTime()!==initial.date.getTime()))throw new BookingError("订单已变更，请刷新后重试",409);
      assertSettlementOwner(actor,booking.nailArtistId);
      if (actor.memberType!=="manager" && booking.finalPrice!==null)
        throw new BookingError("已录入结算的预约，请联系店长或管理员取消",403);
      await tx.settlementRequest.updateMany({where:{activeReservationId:id,status:"pending"},data:{status:"cancelled",activeReservationId:null,reviewedById:actor.id,reviewedByName:actor.nailArtistName,reviewedAt:new Date(),reviewNote:"预约已取消"}});
      await tx.reservation.delete({where:{id}});
      if(scope&&booking.finalPrice!==null)await recalculateCommissionMonth(tx,scope,actor,"cancel:"+id);
      return booking;
    },{maxWait:10000,timeout:30000});
    const cancelledBy = `${actor.memberType==="manager"?"店长或管理员":"员工"}-${actor.nailArtistName}`;
    await sendTelegram(reservationMessage(`预约取消提醒 ❌（${cancelledBy}）`,record,record.user,record.nailArtist));
    return NextResponse.json({success:true,message:"预约已取消"});
  } catch(error) { return apiError(error); }
}

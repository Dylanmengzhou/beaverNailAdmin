import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { assertSettlementOwner } from "@/lib/studio/settlement-db";
import { BookingError } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
export async function POST(request: Request) {
  try {
    const actor = await requireStaff(request);
    const {reservationId,depositPaid}=z.object({reservationId:z.string().min(1),depositPaid:z.boolean()}).parse(await request.json());
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "Reservation" WHERE id=${reservationId} FOR UPDATE`;
      const booking=await tx.reservation.findUnique({where:{id:reservationId}});
      if(!booking)throw new BookingError("预约不存在",404);
      assertSettlementOwner(actor,booking.nailArtistId);
      await tx.reservation.update({where:{id:reservationId},data:{depositPaid}});
    });
    return NextResponse.json({message:"定金状态已更新"});
  }catch(error){return apiError(error);}
}

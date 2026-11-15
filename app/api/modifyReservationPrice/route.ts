import {NextResponse} from "next/server";
import {z} from "zod";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {BookingError} from "@/lib/studio/booking-db";
import {apiError} from "@/lib/studio/http";
const money=z.coerce.number().int().min(0).max(2147483647);
export async function POST(request:Request){
 try{
 const actor=requireStaff(request);
 const v=z.object({reservationid:z.string().min(1),price:money,receivedAmount:money.optional(),currency:z.enum(["KRW","CNY","USD"]),paymentMethod:z.enum(["cash","memberCard","card","wechat","alipay"])}).parse(await request.json());
 const saved=await prisma.$transaction(async tx=>{
  const booking=await tx.reservation.findUnique({where:{id:v.reservationid},include:{nailArtist:true}});
  if(!booking)throw new BookingError("预约不存在",404);
  if(actor.memberType!=="manager"&&booking.nailArtistId!==actor.id)throw new BookingError("只能结算自己的预约",403);
  const bps=booking.commissionRateBps ?? booking.nailArtist?.commissionRateBps;
  return tx.reservation.update({where:{id:v.reservationid},data:{finalPrice:v.price,currency:v.currency,paymentMethod:v.paymentMethod,...(v.receivedAmount!==undefined?{receivedAmount:v.receivedAmount,commissionRateBps:bps,commissionAmount:bps==null?null:Math.round(v.receivedAmount*bps/10000),settledAt:booking.settledAt || new Date()}: {})}});
 });
 return NextResponse.json({success:true,message:"结算已保存",reservation:saved});
 }catch(e){return apiError(e);}
}

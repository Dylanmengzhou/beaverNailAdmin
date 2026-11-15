import {applicableCommission,scopeFor,monthRevenue} from "@/lib/studio/commission-db";
import {commissionMonth} from "@/lib/studio/commission";
import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {apiError} from "@/lib/studio/http";
import {BookingError} from "@/lib/studio/booking-db";
import {assertSettlementOwner,projectPolicy} from "@/lib/studio/settlement-db";
export async function GET(request:Request){
 try{
  const actor=await requireStaff(request),id=new URL(request.url).searchParams.get("reservation");
  if(!id)throw new BookingError("请选择预约");
  const booking=await prisma.reservation.findUnique({where:{id},select:{id:true,nailArtistId:true,serviceType:true,date:true,finalPrice:true,currency:true,paymentMethod:true,commissionRateBps:true,commissionAmount:true,settlementVersion:true,settlementApprovedAt:true,settlementApprovedById:true,commissionPolicySnapshot:true,commissionRevenueBasis:true}});
  if(!booking)throw new BookingError("预约不存在",404);
  assertSettlementOwner(actor,booking.nailArtistId);
  const [policy,history]=await Promise.all([projectPolicy(prisma,booking.serviceType),prisma.settlementRequest.findMany({where:{reservationId:id},orderBy:{submittedAt:"desc"},take:30})]);
  const calculation={month:commissionMonth(booking.date),otherRevenue:{} as Record<string,number>,policies:{} as Record<string,unknown>};
  if(booking.nailArtistId)await Promise.all(["KRW","CNY","USD"].map(async currency=>{calculation.otherRevenue[currency]=await monthRevenue(prisma,scopeFor(booking,currency),booking.id);calculation.policies[currency]=await applicableCommission(prisma,booking,currency);}));
  const adjustments=await prisma.commissionAdjustment.findMany({where:{reservationId:id},orderBy:{createdAt:"desc"},take:30});
  return NextResponse.json({booking,policy,calculation,adjustments,pending:history.find(item=>item.status==="pending")||null,history},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return apiError(error);}
}

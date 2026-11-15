import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {apiError} from "@/lib/studio/http";
import {BookingError} from "@/lib/studio/booking-db";
import {seoulDay} from "@/lib/studio/booking";
export async function GET(request:Request){
 try{
  const actor=await requireStaff(request),p=new URL(request.url).searchParams,month=p.get("month")||seoulDay().slice(0,7);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new BookingError("月份格式无效");
  const [y,m]=month.split("-").map(Number),nailArtistId=actor.memberType==="manager"?(p.get("staff")||undefined):actor.id;
  const rows=await prisma.reservation.findMany({where:{...(nailArtistId?{nailArtistId}:{}),date:{gte:new Date(Date.UTC(y,m-1,1)),lt:new Date(Date.UTC(y,m,1))}},select:{id:true,date:true,timeSlot:true,serviceType:true,nailArtistId:true,nailArtist:{select:{name:true}},currency:true,finalPrice:true,receivedAmount:true,commissionAmount:true,settlementApprovedAt:true}});
  const pending=await prisma.settlementRequest.findMany({where:{status:"pending",reservationId:{in:rows.map(row=>row.id)}},select:{reservationId:true}}),pendingIds=new Set(pending.map(row=>row.reservationId));
  const totals=new Map<string,{currency:string;revenue:number;received:number;commission:number;priced:number;receivedCount:number;commissionCount:number}>();
  for(const r of rows){
   const currency=r.currency || (r.finalPrice==null?"未结算":"未标记币种");
   const t=totals.get(currency)||{currency,revenue:0,received:0,commission:0,priced:0,receivedCount:0,commissionCount:0};
   if(r.finalPrice!=null){t.revenue+=r.finalPrice;t.priced++;}
   if(r.receivedAmount!=null){t.received+=r.receivedAmount;t.receivedCount++;}
   if(r.commissionAmount!=null){t.commission+=r.commissionAmount;t.commissionCount++;}
   totals.set(currency,t);
  }
  const staff=actor.memberType==="manager"?await prisma.nailArtist.findMany({select:{id:true,name:true},orderBy:{name:"asc"}}):[];
  return NextResponse.json({month,scope:actor.memberType==="manager"?"manager":"self",count:rows.length,pendingCount:pendingIds.size,unsubmittedCount:rows.filter(row=>row.finalPrice===null&&!pendingIds.has(row.id)).length,legacyCount:rows.filter(row=>row.finalPrice!==null&&!row.settlementApprovedAt).length,totals:[...totals.values()],staff,rows:rows.map(r=>({...r,settlementStatus:pendingIds.has(r.id)?"pending":r.finalPrice===null?"unsubmitted":r.settlementApprovedAt?"approved":"legacy",artist:r.nailArtist?.name||"—",nailArtist:undefined}))},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return apiError(e);}
}

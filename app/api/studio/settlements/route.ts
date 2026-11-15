import {NextResponse} from "next/server";
import {z} from "zod";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {apiError} from "@/lib/studio/http";
import {BookingError} from "@/lib/studio/booking-db";
import {submitSettlement} from "@/lib/studio/settlement-db";
export async function GET(request:Request){
 try{
  const actor=await requireStaff(request),params=new URL(request.url).searchParams;
  const status=params.get("status")||"pending";
  if(!["pending","approved","rejected","withdrawn","all"].includes(status))throw new BookingError("申请状态无效");
  const page=z.coerce.number().int().min(1).max(10000).parse(params.get("page")||1);
  const where={reservationId:{not:null},...(status==="all"?{}:{status}),...(actor.memberType==="staff"?{nailArtistId:actor.id}:{}),...(actor.memberType==="manager"&&params.get("staff")?{nailArtistId:params.get("staff")!}:{})};
  const [count,rows]=await Promise.all([prisma.settlementRequest.count({where}),prisma.settlementRequest.findMany({where,orderBy:{submittedAt:status==="pending"?"asc":"desc"},skip:(page-1)*20,take:20})]);
  return NextResponse.json({count,page,rows},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return apiError(error);}
}
export async function POST(request:Request){
 try{
  const actor=await requireStaff(request),input=await request.json(),{action}=z.object({action:z.enum(["submit","confirm"]).default("submit")}).parse(input);
  const result=await submitSettlement(prisma,actor,input,action==="confirm");
  return NextResponse.json({success:true,request:result,message:action==="confirm"?"结算已确认":"结算申请已提交，等待店长或管理员审核"});
 }catch(error){return apiError(error);}
}

import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {apiError} from "@/lib/studio/http";
import {BookingError,lockScheduling} from "@/lib/studio/booking-db";
import {policyInputSchema} from "@/lib/studio/commission";
import {contentKey,DEFAULT_CONTENT,studioContentSchema} from "@/lib/studio/content";

export async function GET(request:Request){
 try{
  const actor=await requireStaff(request),serviceId=new URL(request.url).searchParams.get("service")||undefined;
  const content=await prisma.homeContent.findUnique({where:{key:contentKey}}),catalog=content?studioContentSchema.parse(content.value):DEFAULT_CONTENT;
  const person=actor.memberType==="staff"?await prisma.nailArtist.findUnique({where:{id:actor.id},select:{services:true}}):null;
  const previous=actor.memberType==="staff"?await prisma.reservation.findMany({where:{nailArtistId:actor.id},distinct:["serviceType"],select:{serviceType:true}}):[];
  const visibleServices=person?[...new Set([...person.services,...previous.map(row=>row.serviceType)])]:undefined;
  const rules=await prisma.commissionPolicy.findMany({where:{...(serviceId?{serviceId}:{}),...(visibleServices?{AND:[{serviceId:{in:visibleServices}}]}:{}),...(actor.memberType==="staff"?{OR:[{nailArtistId:null},{nailArtistId:actor.id}]}:{})},orderBy:[{effectiveFrom:"desc"},{createdAt:"desc"}]});
  const fallbacks=await prisma.projectCommission.findMany({where:{...(serviceId?{serviceId}:{}),...(visibleServices?{AND:[{serviceId:{in:visibleServices}}]}:{})}});
  const fixedRules=fallbacks.filter(rule=>rule.rateBps!=null).flatMap(rule=>["KRW","CNY","USD"].map(currency=>({id:"fixed:"+rule.serviceId+":"+rule.version,serviceId:rule.serviceId,nailArtistId:null,currency,effectiveFrom:null,tiers:[{minimum:0,storeRateBps:10000-rule.rateBps!}]})));
  const staff=actor.memberType==="manager"?await prisma.nailArtist.findMany({select:{id:true,name:true,services:true},orderBy:{name:"asc"}}):[];
  return NextResponse.json({rules:[...rules,...fixedRules],staff,services:catalog.services.filter(service=>!visibleServices||visibleServices.includes(service.id)).map(service=>({id:service.id,name:service.names.zh})),actorId:actor.id,manager:actor.memberType==="manager"},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return apiError(error);}
}
export async function POST(request:Request){
 try{
  const actor=await requireStaff(request,true),value=policyInputSchema.parse(await request.json());
  const rule=await prisma.$transaction(async tx=>{
   await lockScheduling(tx,true);
   const content=await tx.homeContent.findUnique({where:{key:contentKey}}),catalog=content?studioContentSchema.parse(content.value):DEFAULT_CONTENT;
   if(!catalog.services.some(service=>service.id===value.serviceId))throw new BookingError("请先保存项目，再设置提成规则");
   if(value.nailArtistId&&!await tx.nailArtist.findUnique({where:{id:value.nailArtistId},select:{id:true}}))throw new BookingError("员工不存在",404);
   if(await tx.commissionPolicy.findFirst({where:{serviceId:value.serviceId,nailArtistId:value.nailArtistId,currency:value.currency,effectiveFrom:value.effectiveFrom}}))throw new BookingError("这个生效日期已有规则。历史规则保留，调整请新增生效日期。",409);
   return tx.commissionPolicy.create({data:{...value,createdById:actor.id}});
  });
  return NextResponse.json({rule,message:"提成规则已发布；已有订单和已提交申请保留原规则"});
 }catch(error){return apiError(error);}
}

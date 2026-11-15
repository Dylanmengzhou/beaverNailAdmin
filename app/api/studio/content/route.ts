import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {contentKey,studioContentSchema,DEFAULT_CONTENT} from "@/lib/studio/content";
import {BookingError,lockScheduling} from "@/lib/studio/booking-db";
import {removeDeletedServices} from "@/lib/studio/catalog-db";
import {apiError} from "@/lib/studio/http";
import {z} from "zod";
import {commissionUpdateSchema} from "@/lib/studio/settlement";
import {commissionRules} from "@/lib/studio/settlement-db";
export async function GET(request:Request){
 try{const actor=await requireStaff(request); const saved=await prisma.homeContent.findUnique({where:{key:contentKey}});
 const value=saved?studioContentSchema.parse(saved.value):DEFAULT_CONTENT;
 return NextResponse.json({...value,...(actor.memberType==="manager"?{commissionRules:await commissionRules(prisma)}:{})},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return apiError(e);}
}
export async function PUT(request:Request){
 try{const actor=await requireStaff(request,true),input=await request.json(),value=studioContentSchema.parse(input);
 const changes=z.array(commissionUpdateSchema).max(40).parse(input.commissionUpdates||[]);
 const rules=await prisma.$transaction(async tx=>{
  await lockScheduling(tx,true);
  const saved=await tx.homeContent.findUnique({where:{key:contentKey}});
  await removeDeletedServices(tx,saved?studioContentSchema.parse(saved.value):DEFAULT_CONTENT,value);
  for(const change of changes){
   if(!value.services.some(service=>service.id===change.serviceId))throw new BookingError("提成设置对应的项目不存在");
   const old=await tx.projectCommission.findUnique({where:{serviceId:change.serviceId}});
   if((old?.version||0)!==change.expectedVersion)throw new BookingError("项目提成比例已被其他人修改，请刷新后重试",409);
   await tx.projectCommission.upsert({where:{serviceId:change.serviceId},create:{serviceId:change.serviceId,rateBps:change.rateBps,updatedById:actor.id},update:{rateBps:change.rateBps,updatedById:actor.id,version:{increment:1}}});
  }
  await tx.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value},update:{value}});
  return commissionRules(tx);
 },{maxWait:10000,timeout:15000});
 return NextResponse.json({...value,commissionRules:rules});
 }catch(e){return apiError(e);}
}
export async function DELETE(request:Request){
 try{
  await requireStaff(request,true);
  const params=new URL(request.url).searchParams;
  const id=params.get("service"),eventId=params.get("event");
  if(!id&&!eventId)throw new BookingError("请选择要删除的项目或活动");
  if(id&&eventId)throw new BookingError("每次只能删除一个项目或活动");
  const value=await prisma.$transaction(async tx=>{
   await lockScheduling(tx,true);
   const saved=await tx.homeContent.findUnique({where:{key:contentKey}});
   const current=saved?studioContentSchema.parse(saved.value):DEFAULT_CONTENT;
   if(eventId&&!current.events.some(event=>event.id===eventId))throw new BookingError("活动已不存在，请刷新后重试",404);
   if(id&&!current.services.some(service=>service.id===id))throw new BookingError("项目已不存在，请刷新后重试",404);
   const services=current.services.filter(service=>service.id!==id);
   if(!services.some(service=>service.enabled))throw new BookingError("至少保留一个开放预约的项目。请先创建或启用其他项目，再删除此项目。",409);
   const next=studioContentSchema.parse({...current,services,events:current.events.filter(event=>event.id!==eventId)});
   await removeDeletedServices(tx,current,next);
   await tx.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value:next},update:{value:next}});
   return {...next,commissionRules:await commissionRules(tx)};
  });
  return NextResponse.json(value);
 }catch(e){return apiError(e);}
}

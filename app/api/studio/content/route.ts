import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {contentKey,studioContentSchema,DEFAULT_CONTENT} from "@/lib/studio/content";
import {BookingError,lockScheduling} from "@/lib/studio/booking-db";
import {removeDeletedServices} from "@/lib/studio/catalog-db";
import {apiError} from "@/lib/studio/http";
export async function GET(request:Request){
 try{requireStaff(request); const saved=await prisma.homeContent.findUnique({where:{key:contentKey}});
 return NextResponse.json(saved?studioContentSchema.parse(saved.value):DEFAULT_CONTENT,{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return apiError(e);}
}
export async function PUT(request:Request){
 try{requireStaff(request,true);const value=studioContentSchema.parse(await request.json());
 await prisma.$transaction(async tx=>{
  await lockScheduling(tx,true);
  const saved=await tx.homeContent.findUnique({where:{key:contentKey}});
  await removeDeletedServices(tx,saved?studioContentSchema.parse(saved.value):DEFAULT_CONTENT,value);
  await tx.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value},update:{value}});
 });
 return NextResponse.json(value);
 }catch(e){return apiError(e);}
}
export async function DELETE(request:Request){
 try{
  requireStaff(request,true);
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
   return next;
  });
  return NextResponse.json(value);
 }catch(e){return apiError(e);}
}

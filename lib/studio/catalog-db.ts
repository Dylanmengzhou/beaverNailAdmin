import type {Prisma} from "@prisma/client";
import {BookingError} from "./booking-db";
import type {StudioContent} from "./content";

// Call while holding the exclusive scheduling lock, shared with booking creation.
export async function removeDeletedServices(tx:Prisma.TransactionClient, current:StudioContent, next:StudioContent){
 const removed=current.services.filter(service=>!next.services.some(row=>row.id===service.id));
 if(!removed.length)return;
 const ids=removed.map(service=>service.id);
 const booking=await tx.reservation.findFirst({where:{serviceType:{in:ids}},select:{serviceType:true}});
 if(booking){
  const name=removed.find(service=>service.id===booking.serviceType)!.names.zh;
  throw new BookingError(`「${name}」已有预约记录，不能删除。请关闭“开放顾客预约”以停用项目，已有订单和统计会保留。`,409);
 }
 const staff=await tx.nailArtist.findMany({where:{services:{hasSome:ids}},orderBy:{id:"asc"},select:{id:true,services:true,serviceSettings:true}});
 for(const person of staff){
  const settings=person.serviceSettings;
  await tx.nailArtist.update({where:{id:person.id},data:{
   services:person.services.filter(id=>!ids.includes(id)),
   ...(settings&&typeof settings==="object"&&!Array.isArray(settings)?{serviceSettings:Object.fromEntries(Object.entries(settings).filter(([id])=>!ids.includes(id)))}:{}),
  }});
 }
 await tx.projectCommission.deleteMany({where:{serviceId:{in:ids}}});
}

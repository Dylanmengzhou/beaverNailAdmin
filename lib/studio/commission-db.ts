import {randomUUID} from "node:crypto";
import {Prisma} from "@prisma/client";
import type {StaffActor} from "./auth";
import {BookingError} from "./booking-db";
import {calculateCommission,commissionMonth,monthRange,readCommissionSnapshot,type CommissionSnapshot} from "./commission";

type DB=Prisma.TransactionClient;
export type CommissionScope={nailArtistId:string;serviceType:string;month:string;currency:string};
export function scopeFor(booking:{nailArtistId:string|null;serviceType:string;date:Date},currency:string):CommissionScope{
 if(!booking.nailArtistId)throw new BookingError("请先为预约分配服务员工");
 return {nailArtistId:booking.nailArtistId,serviceType:booking.serviceType,month:commissionMonth(booking.date),currency};
}
export async function lockCommissionMonths(db:DB,scopes:CommissionScope[]){
 const keys=[...new Set(scopes.map(scope=>JSON.stringify([scope.nailArtistId,scope.serviceType,scope.month,scope.currency])))].sort();
 for(const key of keys)await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"commission:"+key},0))::text`;
}
export async function monthRevenue(db:DB,scope:CommissionScope,excludeId?:string){
 const total=await db.reservation.aggregate({where:{nailArtistId:scope.nailArtistId,serviceType:scope.serviceType,date:monthRange(scope.month),currency:scope.currency,...(excludeId?{id:{not:excludeId}}:{})},_sum:{finalPrice:true}});
 const revenue=total._sum.finalPrice||0;
 if(!Number.isSafeInteger(revenue))throw new BookingError("月营业额超出计算范围");
 return revenue;
}
export async function applicableCommission(db:DB,booking:{serviceType:string;nailArtistId:string|null;date:Date},currency:string):Promise<CommissionSnapshot|null>{
 const day=booking.date.toISOString().slice(0,10);
 const own=booking.nailArtistId?await db.commissionPolicy.findFirst({where:{serviceId:booking.serviceType,nailArtistId:booking.nailArtistId,currency,effectiveFrom:{lte:day}},orderBy:[{effectiveFrom:"desc"},{createdAt:"desc"}]}):null;
 const policy=own||await db.commissionPolicy.findFirst({where:{serviceId:booking.serviceType,nailArtistId:null,currency,effectiveFrom:{lte:day}},orderBy:[{effectiveFrom:"desc"},{createdAt:"desc"}]});
 if(policy)return readCommissionSnapshot({...policy});
 const fixed=await db.projectCommission.findUnique({where:{serviceId:booking.serviceType}});
 return fixed?.rateBps!=null?{id:"fixed:"+booking.serviceType+":"+fixed.version,effectiveFrom:null,serviceId:booking.serviceType,nailArtistId:null,currency,tiers:[{minimum:0,storeRateBps:10000-fixed.rateBps}]}:null;
}

// Called only when approved revenue changes, never when a policy is published.
// Each order selects a tier from its own historical snapshot, not today's rule.
export async function recalculateCommissionMonth(db:DB,scope:CommissionScope,actor:StaffActor,triggerKey:string){
 const revenue=await monthRevenue(db,scope);
 const rows=await db.reservation.findMany({where:{nailArtistId:scope.nailArtistId,serviceType:scope.serviceType,date:monthRange(scope.month),currency:scope.currency,finalPrice:{not:null},commissionPolicySnapshot:{not:Prisma.DbNull}},orderBy:{id:"asc"}});
 const changes=[];
 for(const row of rows){
  const policy=readCommissionSnapshot(row.commissionPolicySnapshot);
  if(!policy)continue;
  const calculation=calculateCommission(row.finalPrice!,revenue,policy);
  if(row.commissionAmount===calculation.amount&&row.commissionRateBps===calculation.rateBps&&row.commissionRevenueBasis===revenue)continue;
  changes.push({id:row.id,audit:randomUUID(),amount:calculation.amount,rate:calculation.rateBps,basis:revenue,previous:row.commissionAmount,policy,price:row.finalPrice});
 }
 if(changes.length){
  const payload=JSON.stringify(changes);
  await db.$executeRaw`INSERT INTO "CommissionAdjustment" (id,"reservationId","reservationKey","triggerKey","nailArtistId","serviceType",month,currency,"finalPrice","previousAmount","commissionAmount","commissionRateBps","revenueBasis","policySnapshot","actorId","actorName") SELECT x.audit,x.id,x.id,${triggerKey},${scope.nailArtistId},${scope.serviceType},${scope.month},${scope.currency},x.price,x.previous,x.amount,x.rate,x.basis,x.policy,${actor.id},${actor.nailArtistName} FROM jsonb_to_recordset(${payload}::jsonb) AS x(id text,audit text,amount integer,rate integer,basis double precision,previous integer,policy jsonb,price integer)`;
  await db.$executeRaw`UPDATE "Reservation" r SET "commissionAmount"=x.amount,"commissionRateBps"=x.rate,"commissionRevenueBasis"=x.basis,"updatedAt"=CURRENT_TIMESTAMP FROM jsonb_to_recordset(${payload}::jsonb) AS x(id text,amount integer,rate integer,basis double precision) WHERE r.id=x.id`;
 }
 return revenue;
}

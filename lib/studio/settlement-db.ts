import {Prisma,type PrismaClient} from "@prisma/client";
import {BookingError,lockScheduling} from "./booking-db";
import {contentKey,DEFAULT_CONTENT,studioContentSchema} from "./content";
import {settlementInputSchema,type CommissionRules} from "./settlement";
import {applicableCommission,lockCommissionMonths,scopeFor,monthRevenue,recalculateCommissionMonth} from "./commission-db";
import {calculateCommission,readCommissionSnapshot} from "./commission";
import type {StaffActor} from "./auth";

type DB=Prisma.TransactionClient;
export async function commissionRules(db:DB):Promise<CommissionRules>{
 return Object.fromEntries((await db.projectCommission.findMany()).map(rule=>[rule.serviceId,{rateBps:rule.rateBps,version:rule.version}]));
}
async function lockedBooking(db:DB,id:string,currency?:string){
 const current=await db.reservation.findUnique({where:{id},select:{nailArtistId:true,serviceType:true,date:true,currency:true}});
 if(!current)throw new BookingError("预约不存在",404);
 if(current.nailArtistId)await lockCommissionMonths(db,[scopeFor(current,currency||current.currency||"KRW"),scopeFor(current,current.currency||currency||"KRW")]);
 await db.$queryRaw`SELECT id FROM "Reservation" WHERE id=${id} FOR UPDATE`;
 const booking=await db.reservation.findUnique({where:{id},include:{nailArtist:{select:{name:true}}}});
 if(!booking)throw new BookingError("预约不存在",404);
 if(booking.nailArtistId!==current.nailArtistId||booking.serviceType!==current.serviceType||booking.currency!==current.currency||booking.date.getTime()!==current.date.getTime())throw new BookingError("订单项目、员工、日期或币种已变更，请刷新后重试",409);
 return booking;
}
export function assertSettlementOwner(actor:StaffActor,artistId:string|null){
 if(actor.memberType!=="manager"&&artistId!==actor.id)throw new BookingError("只能为自己的预约提交结算",403);
}
export async function projectPolicy(db:DB,serviceId:string){
 const content=await db.homeContent.findUnique({where:{key:contentKey}});
 const service=(content?studioContentSchema.parse(content.value):DEFAULT_CONTENT).services.find(service=>service.id===serviceId);
 const rule=await db.projectCommission.findUnique({where:{serviceId}});
 return {serviceId,serviceName:service?.names.zh||serviceId,rateBps:rule?.rateBps??null};
}

export async function submitSettlement(db:PrismaClient,actor:StaffActor,input:unknown,confirm=false){
 const value=settlementInputSchema.parse(input);
 if(confirm&&actor.memberType!=="manager")throw new BookingError("只有店长或管理员可以确认结算",403);
 if(confirm&&value.version===undefined)throw new BookingError("请刷新订单后再确认结算",409);
 return db.$transaction(async tx=>{
  await lockScheduling(tx);
  const booking=await lockedBooking(tx,value.reservationid,value.currency);
  assertSettlementOwner(actor,booking.nailArtistId);
  if(value.version!==undefined&&value.version!==booking.settlementVersion)throw new BookingError("订单结算已被更新，请刷新后重新提交",409);
  const pending=await tx.settlementRequest.findUnique({where:{activeReservationId:booking.id}});
  if(pending){
   if(!confirm&&pending.submittedById===actor.id&&pending.price===value.price&&pending.currency===value.currency&&pending.paymentMethod===value.paymentMethod)return pending;
   throw new BookingError("这单已有待审核申请，请先处理当前申请",409);
  }
  const policy=await projectPolicy(tx,booking.serviceType);
  const snapshot=await applicableCommission(tx,booking,value.currency);
  if(!snapshot)throw new BookingError("该订单日期尚未设置提成规则，请联系店长或管理员在“项目与价格”中设置",409);
  if(value.policyId&&value.policyId!==snapshot.id)throw new BookingError("提成规则已更新，请刷新规则并检查后重新提交",409);
  const scope=scopeFor(booking,value.currency),revenue=await monthRevenue(tx,scope,booking.id)+value.price;
  const calculation=calculateCommission(value.price,revenue,snapshot);
  const now=new Date(),commissionAmount=calculation.amount;
  const request=await tx.settlementRequest.create({data:{
   reservationId:booking.id,reservationKey:booking.id,activeReservationId:confirm?null:booking.id,
   nailArtistId:booking.nailArtistId,artistName:booking.nailArtist?.name||"未分配员工",serviceType:booking.serviceType,serviceName:policy.serviceName,
   date:booking.date,timeSlot:booking.timeSlot,price:value.price,currency:value.currency,paymentMethod:value.paymentMethod,
   commissionRateBps:calculation.rateBps,commissionAmount,commissionPolicySnapshot:snapshot,commissionRevenueBasis:revenue,baseVersion:booking.settlementVersion,
   status:confirm?"approved":"pending",submittedById:actor.id,submittedByName:actor.nailArtistName||actor.username,
   ...(confirm?{reviewedById:actor.id,reviewedByName:actor.nailArtistName||actor.username,reviewedAt:now,approvedCommissionAmount:commissionAmount,approvedCommissionRateBps:calculation.rateBps,approvedRevenueBasis:revenue}:{}),
  }});
  if(confirm)await tx.reservation.update({where:{id:booking.id},data:{finalPrice:value.price,currency:value.currency,paymentMethod:value.paymentMethod,commissionPolicySnapshot:snapshot,settledAt:now,settlementApprovedAt:now,settlementApprovedById:actor.id,settlementVersion:{increment:1}}});
  if(confirm){
   await recalculateCommissionMonth(tx,scope,actor,request.id);
   if(booking.currency&&booking.currency!==value.currency)await recalculateCommissionMonth(tx,scopeFor(booking,booking.currency),actor,request.id);
  }
  return request;
 },{maxWait:10000,timeout:30000});
}

export async function decideSettlement(db:PrismaClient,actor:StaffActor,id:string,action:"approve"|"reject"|"withdraw",note:string){
 if(action!=="withdraw"&&actor.memberType!=="manager")throw new BookingError("只有店长或管理员可以审核结算",403);
 if(action==="reject"&&!note.trim())throw new BookingError("请填写退回原因");
 return db.$transaction(async tx=>{
  const initial=await tx.settlementRequest.findUnique({where:{id}});
  if(!initial||!initial.reservationId)throw new BookingError("申请对应的预约已不存在",404);
  const booking=await lockedBooking(tx,initial.reservationId,initial.currency);
  const request=await tx.settlementRequest.findUniqueOrThrow({where:{id}});
  if(action==="withdraw"&&request.submittedById!==actor.id)throw new BookingError("只能撤回自己提交的申请",403);
  if(request.status!=="pending"||request.activeReservationId!==booking.id)throw new BookingError("该申请已处理，请刷新查看结果",409);
  let approvedData={};
  if(action==="approve"){
   if(request.baseVersion!==booking.settlementVersion||request.nailArtistId!==booking.nailArtistId||request.serviceType!==booking.serviceType)throw new BookingError("订单员工、项目或结算已变更，请退回申请后重新提交",409);
   const now=new Date(),snapshot=readCommissionSnapshot(request.commissionPolicySnapshot);
   const scope=scopeFor(booking,request.currency),revenue=await monthRevenue(tx,scope,booking.id)+request.price;
   const calculation=snapshot?calculateCommission(request.price,revenue,snapshot):{amount:request.commissionAmount,rateBps:request.commissionRateBps};
   await tx.reservation.update({where:{id:booking.id},data:{finalPrice:request.price,currency:request.currency,paymentMethod:request.paymentMethod,...(!snapshot?{commissionRateBps:calculation.rateBps,commissionAmount:calculation.amount}:{}),commissionPolicySnapshot:snapshot||Prisma.DbNull,settledAt:now,settlementApprovedAt:now,settlementApprovedById:actor.id,settlementVersion:{increment:1}}});
   await recalculateCommissionMonth(tx,scope,actor,request.id);
   if(booking.currency&&booking.currency!==request.currency)await recalculateCommissionMonth(tx,scopeFor(booking,booking.currency),actor,request.id);
   approvedData={approvedCommissionAmount:calculation.amount,approvedCommissionRateBps:calculation.rateBps,approvedRevenueBasis:revenue};
  }
  return tx.settlementRequest.update({where:{id},data:{...approvedData,status:action==="approve"?"approved":action==="reject"?"rejected":"withdrawn",activeReservationId:null,reviewedById:actor.id,reviewedByName:actor.nailArtistName||actor.username,reviewedAt:new Date(),reviewNote:note.trim()||null}});
 },{maxWait:10000,timeout:30000});
}

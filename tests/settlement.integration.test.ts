import test from "node:test";
import assert from "node:assert/strict";
import {PrismaClient} from "@prisma/client";
import jwt from "jsonwebtoken";
import {DEFAULT_CONTENT,contentKey} from "../lib/studio/content";

const db=new PrismaClient(),url=new URL(process.env.DATABASE_URL!);
assert.equal(url.host,"127.0.0.1:55432");
assert.match(url.pathname,/^\/beaver_(?:studio|settlement)_test(?:_[a-z0-9_]+)?$/);
const base=process.env.STUDIO_TEST_ADMIN_ORIGIN||"http://127.0.0.1:3001",web=process.env.STUDIO_TEST_CUSTOMER_ORIGIN||"http://127.0.0.1:3000";
for(const origin of [base,web])assert.ok(["127.0.0.1","localhost"].includes(new URL(origin).hostname));
const prefix="settlement_test_"+Date.now(),employee=prefix+"_staff",other=prefix+"_other",manager=prefix+"_manager",customer=prefix+"_customer";
const token=(id:string,role="staff")=>jwt.sign({id,username:id==="beavernail-id"?"beavernail":id,memberType:role},process.env.JWT_SECRET!,{expiresIn:"15m"});
const staffToken=token(employee),managerToken=token(manager),otherToken=token(other),rootToken=token("beavernail-id","manager");
async function call(path:string,who=staffToken,method="GET",body?:unknown){
 const response=await fetch(base+path,{method,headers:{Authorization:"Bearer "+who,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,body:await response.json()};
}
const payload=(id:string,price=100000)=>({reservationid:id,price,currency:"KRW",paymentMethod:"memberCard"});
const submit=(id:string,price=100000,who=staffToken)=>call("/api/studio/settlements",who,"POST",payload(id,price));
const decide=(id:string,action:string,who=managerToken,note="")=>call("/api/studio/settlements/"+id,who,"POST",{action,note});
const canonical=(id:string)=>db.reservation.findUniqueOrThrow({where:{id}});

test("project settlement applications, approval, permissions and backward compatibility",async t=>{
 const original=await db.homeContent.findUnique({where:{key:contentKey}}),rules=await db.projectCommission.findMany();
 const bookings:string[]=[];
 const create=async(serviceType="nails",data={})=>{const booking=await db.reservation.create({data:{userId:customer,nailArtistId:employee,date:new Date(Date.UTC(2033,10,1+bookings.length)),timeSlot:"10:00",serviceType,...data}});bookings.push(booking.id);return booking.id;};
 try{
  const content=structuredClone(DEFAULT_CONTENT);
  await db.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value:content},update:{value:content}});
  for(const [id,role] of [[employee,"staff"],[other,"staff"],[manager,"manager"]])await db.nailArtist.create({data:{id,name:id,account:id,password:"test-only-123",membertype:role,services:["nails","makeup"],commissionRateBps:9900}});
  await db.user.create({data:{id:customer,name:"审核测试顾客",provider:"test",balance:300000,membershipType:"vip"}});
  const updateRates=async(nails:number,makeup:number)=>{
   const current=await db.projectCommission.findMany();
   return call("/api/studio/content",managerToken,"PUT",{...content,commissionUpdates:[{serviceId:"nails",rateBps:nails,expectedVersion:current.find(r=>r.serviceId==="nails")?.version||0},{serviceId:"makeup",rateBps:makeup,expectedVersion:current.find(r=>r.serviceId==="makeup")?.version||0}]});
  };
  await t.test("database permissions override stale JWTs; a store manager can manage all settings",async()=>{
   assert.equal((await call("/api/auth/session",managerToken)).body.memberType,"manager");
   assert.equal((await call("/api/studio/staff",managerToken)).status,200);
   assert.equal((await call("/api/studio/staff",token(employee,"manager"))).status,403);
   assert.equal((await call("/api/studio/staff",token(prefix+"_deleted","manager"))).status,401);
   await db.nailArtist.update({where:{id:manager},data:{membertype:"staff"}});
   assert.equal((await call("/api/studio/staff",token(manager,"manager"))).status,403);
   await db.nailArtist.update({where:{id:manager},data:{membertype:"manager"}});
   assert.equal((await updateRates(2500,4000)).status,200);
   assert.equal((await call("/api/studio/weekly-closures",managerToken)).status,200);
   assert.equal((await call("/api/studio/home",managerToken)).status,200);
  });
  const first=await create(),second=await create("makeup");let firstRequest="";
  await t.test("employee submits final price; project rates override staff and client-supplied values",async()=>{
   const response=await call("/api/studio/settlements",staffToken,"POST",{...payload(first),receivedAmount:20000,commissionRateBps:10000,commissionAmount:999999,memberType:"manager"});
   assert.equal(response.status,200);firstRequest=response.body.request.id;
   assert.equal(response.body.request.commissionAmount,25000);assert.equal(response.body.request.commissionRateBps,2500);
   assert.equal((await canonical(first)).finalPrice,null);assert.equal((await canonical(first)).commissionAmount,null);
   const otherProject=await submit(second);assert.equal(otherProject.body.request.commissionAmount,40000);
   assert.equal((await submit(first)).body.request.id,firstRequest);
   assert.equal((await submit(first,110000)).status,409);
   const performance=await call("/api/studio/performance?month=2033-11");
   assert.equal(performance.body.pendingCount,2);assert.equal(performance.body.totals.reduce((n:number,r:{revenue:number})=>n+r.revenue,0),0);
   const membership=await call("/api/studio/members?q=审核测试顾客");assert.equal(membership.body.rows[0].balance,300000);
  });
  await t.test("employees cannot approve, impersonate managers, or access other employees' requests",async()=>{
   assert.equal((await decide(firstRequest,"approve",staffToken)).status,403);
   assert.equal((await decide(firstRequest,"reject",staffToken,"fake")).status,403);
   assert.equal((await decide(firstRequest,"withdraw",otherToken)).status,403);
   assert.equal((await submit(first,100000,otherToken)).status,403);
   assert.equal((await call("/api/studio/settlement?reservation="+first,otherToken)).status,403);
   assert.equal((await call("/api/studio/settlements?status=all&staff="+employee,otherToken)).body.count,0);
   assert.equal((await call("/api/studio/settlements?page=1.5")).status,400);
   assert.equal((await call("/api/studio/settlements",staffToken,"POST",{...payload(first),action:"confirm",version:0})).status,403);
  });
  await t.test("approval snapshots the submitted rate; competing approvals write canonical money once",async()=>{
   assert.equal((await updateRates(5000,4000)).status,200);
   const decisions=await Promise.all([decide(firstRequest,"approve"),decide(firstRequest,"approve",rootToken)]);
   assert.deepEqual(decisions.map(r=>r.status).sort(),[200,409]);
   const booking=await canonical(first);assert.equal(booking.finalPrice,100000);assert.equal(booking.commissionAmount,25000);assert.equal(booking.commissionRateBps,2500);assert.equal(booking.settlementVersion,1);assert.ok(booking.settlementApprovedAt);
   const audit=await db.settlementRequest.findUniqueOrThrow({where:{id:firstRequest}});assert.ok(audit.reviewedAt);assert.ok([manager,"beavernail-id"].includes(audit.reviewedById!));
   assert.equal((await call("/api/studio/members?q=审核测试顾客")).body.rows[0].balance,200000);
  });
  await t.test("amendments preserve approved money until review; rejection and withdrawal retain audit",async()=>{
   const amendment=await submit(first,120000),id=amendment.body.request.id;
   assert.equal(amendment.body.request.commissionAmount,60000);assert.equal((await canonical(first)).finalPrice,100000);
   assert.equal((await decide(id,"reject")).status,400);
   assert.equal((await decide(id,"reject",managerToken,"价格需要核对")).status,200);
   assert.equal((await canonical(first)).finalPrice,100000);
   const next=await submit(first,110000);assert.equal((await decide(next.body.request.id,"withdraw",staffToken)).status,200);
   const final=await submit(first,120000);assert.equal((await decide(final.body.request.id,"approve")).status,200);
   assert.equal((await canonical(first)).commissionAmount,60000);
   const history=await call("/api/studio/settlement?reservation="+first);assert.equal(history.body.history.length,4);
  });
  await t.test("missing rates block submission; zero rate is valid; manager direct confirmation is audited",async()=>{
   const current=await db.projectCommission.findUniqueOrThrow({where:{serviceId:"nails"}});
   await db.projectCommission.update({where:{serviceId:"nails"},data:{rateBps:null}});
   const id=await create();assert.equal((await submit(id)).status,409);
   await db.projectCommission.update({where:{serviceId:"nails"},data:{rateBps:0}});
   assert.equal((await call("/api/studio/settlements",managerToken,"POST",{...payload(id),action:"confirm"})).status,409);
   const confirmed=await call("/api/studio/settlements",managerToken,"POST",{...payload(id),action:"confirm",version:0});assert.equal(confirmed.status,200);assert.equal(confirmed.body.request.status,"approved");assert.equal((await canonical(id)).commissionAmount,0);
   assert.equal((await call("/api/studio/settlements",rootToken,"POST",{...payload(id),action:"confirm",version:0})).status,409);
   await db.projectCommission.update({where:{serviceId:"nails"},data:{rateBps:current.rateBps}});
  });
  await t.test("legacy endpoint cannot bypass approval; duplicate concurrent submissions keep one active request",async()=>{
   const id=await create();
   const requests=await Promise.all([call("/api/modifyReservationPrice",staffToken,"POST",{...payload(id),action:"confirm"}),submit(id)]);
   assert.ok(requests.every(r=>r.status===200));assert.equal(requests[0].body.request.id,requests[1].body.request.id);
   assert.equal((await canonical(id)).finalPrice,null);
   assert.equal(await db.settlementRequest.count({where:{activeReservationId:id}}),1);
   await db.reservation.update({where:{id},data:{serviceType:"makeup"}});
   assert.equal((await decide(requests[0].body.request.id,"approve")).status,409);
   assert.equal((await decide(requests[0].body.request.id,"reject",managerToken,"项目已修改")).status,200);
  });
  await t.test("project rates stay private and unrelated content saves do not erase them",async()=>{
   const privateContent=await call("/api/studio/content",managerToken);assert.ok(privateContent.body.commissionRules.nails);
   assert.equal((await call("/api/studio/content")).body.commissionRules,undefined);
   assert.equal((await call("/api/studio/content",managerToken,"PUT",content)).status,200);
   const publicContent=await(await fetch(web+"/api/studio/content")).json();assert.equal(publicContent.commissionRules,undefined);
   assert.equal((await db.homeContent.findUniqueOrThrow({where:{key:contentKey}})).value!.hasOwnProperty("commissionRules"),false);
   assert.equal((await call("/api/studio/content",managerToken,"PUT",{...content,commissionUpdates:[{serviceId:"nails",rateBps:1,expectedVersion:0}]})).status,409);
   assert.ok((await db.projectCommission.findUniqueOrThrow({where:{serviceId:"nails"}})).rateBps);
  });
  await t.test("cancellation respects ownership and keeps settlement history",async()=>{
   assert.equal((await call("/api/getSingleReservation?reservationid="+first,staffToken,"POST",{operatorType:"manager"})).status,403);
   const id=await create(),request=await submit(id);
   assert.equal((await call("/api/getSingleReservation?reservationid="+id,otherToken,"POST",{})).status,403);
   assert.equal((await call("/api/getSingleReservation?reservationid="+id,staffToken,"POST",{})).status,200);
   const audit=await db.settlementRequest.findUniqueOrThrow({where:{id:request.body.request.id}});assert.equal(audit.status,"cancelled");assert.equal(audit.reservationId,null);assert.equal(audit.reservationKey,id);
  });
  await t.test("legacy financial history is preserved and marked separately",async()=>{
   const id=await create("nails",{finalPrice:88888,commissionRateBps:3000,commissionAmount:26666,receivedAmount:50000,currency:"KRW",paymentMethod:"cash"});
   const data=await call("/api/studio/performance?month=2033-11");assert.equal(data.body.rows.find((r:{id:string})=>r.id===id).settlementStatus,"legacy");assert.equal(data.body.legacyCount,1);
   const booking=await canonical(id);assert.equal(booking.commissionAmount,26666);assert.equal(booking.receivedAmount,50000);
  });
  await t.test("profile updates cannot impersonate another user or grant manager rights",async()=>{
   const profile={id:employee,name:employee,account:employee,oldPassword:"test-only-123",newPassword:"test-only-123",confirmPassword:"test-only-123",membertype:"manager"};
   assert.equal((await call("/api/auth/changeNailArtistInfo",otherToken,"POST",profile)).status,403);
   const response=await call("/api/auth/changeNailArtistInfo",staffToken,"POST",profile);assert.equal(response.status,200);assert.equal(response.body.user.memberType,"staff");
   const managerProfile={...profile,id:manager,name:manager,account:manager};
   assert.equal((await call("/api/auth/changeNailArtistInfo",managerToken,"POST",managerProfile)).status,200);
   assert.equal((await db.nailArtist.findUniqueOrThrow({where:{id:employee}})).membertype,"staff");
  });
 }finally{
  await db.settlementRequest.deleteMany({where:{reservationKey:{in:bookings}}});
  await db.reservation.deleteMany({where:{userId:customer}});await db.user.deleteMany({where:{id:customer}});await db.nailArtist.deleteMany({where:{id:{in:[employee,other,manager]}}});
  await db.projectCommission.deleteMany();if(rules.length)await db.projectCommission.createMany({data:rules});
  if(original)await db.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value:original.value!},update:{value:original.value!}});else await db.homeContent.deleteMany({where:{key:contentKey}});
  await db.$disconnect();
 }
});

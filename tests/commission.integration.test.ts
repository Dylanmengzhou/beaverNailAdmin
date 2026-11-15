import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {PrismaClient} from "@prisma/client";
import {contentKey,DEFAULT_CONTENT} from "../lib/studio/content";

const db=new PrismaClient(),url=new URL(process.env.DATABASE_URL!);
assert.equal(url.host,"127.0.0.1:55432");assert.match(url.pathname,/^\/beaver_(?:studio|settlement)_test(?:_[a-z0-9_]+)?$/);
const base=process.env.STUDIO_TEST_ADMIN_ORIGIN||"http://127.0.0.1:3001";assert.ok(["localhost","127.0.0.1"].includes(new URL(base).hostname));
const prefix="tier_test_"+Date.now(),artist=prefix+"_employee",other=prefix+"_other",customer=prefix+"_customer",service=prefix+"_project",otherService=prefix+"_makeup";
const sign=(id:string,memberType="staff")=>jwt.sign({id,memberType,username:id==="beavernail-id"?"beavernail":id},process.env.JWT_SECRET!,{expiresIn:"15m"});
const root=sign("beavernail-id","manager"),staff=sign(artist),outsider=sign(other);
async function call(path:string,body?:unknown,who=root){const response=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{Authorization:"Bearer "+who,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});return{status:response.status,value:await response.json()};}
const rules=(low:number,high:number)=>[{minimum:0,storeRateBps:low},{minimum:4000000,storeRateBps:high}];
const publish=(effectiveFrom:string,tiers=rules(6000,5000),extra={})=>call("/api/studio/commission-policies",{serviceId:service,effectiveFrom,tiers,currency:"KRW",...extra});
const order=(id:string)=>db.reservation.findUniqueOrThrow({where:{id}});
test("monthly tiers preserve each order's effective-date rule and audit whole-month changes",async t=>{
 const original=await db.homeContent.findUnique({where:{key:contentKey}}),bookings:string[]=[];
 const create=async(day:string,project=service,person=artist)=>{const value=await db.reservation.create({data:{userId:customer,nailArtistId:person,serviceType:project,date:new Date(day),timeSlot:"12:00"}});bookings.push(value.id);return value.id;};
 const submit=(id:string,price:number,currency="KRW",who=staff)=>call("/api/studio/settlements",{reservationid:id,price,currency,paymentMethod:"cash"},who);
 const approve=(id:string)=>call("/api/studio/settlements/"+id,{action:"approve"});
 const confirm=async(id:string,price:number,currency="KRW")=>{const response=await submit(id,price,currency);assert.equal(response.status,200,JSON.stringify(response.value));const decision=await approve(response.value.request.id);assert.equal(decision.status,200,JSON.stringify(decision.value));return response.value.request.id as string;};
 try{
  const content=structuredClone(DEFAULT_CONTENT);for(const id of [service,otherService])content.services.push({id,names:{zh:id,en:id,kr:id},enabled:true,theme:"mint",sections:[],notes:[]});
  await db.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value:content},update:{value:content}});
  for(const id of [artist,other])await db.nailArtist.create({data:{id,name:id,account:id,password:"test-only-123",membertype:"staff",services:[service,otherService]}});
  await db.user.create({data:{id:customer,name:customer,provider:"test"}});
  let oldPolicy="",newPolicy="";
  await t.test("only managers publish append-only dated rules; shop percentages are explicit",async()=>{
   assert.equal((await publish("2026-10-01",rules(6000,5000))).status,200);
   const second=await publish("2026-10-20",rules(5000,4000));assert.equal(second.status,200);newPolicy=second.value.rule.id;
   const initial=await call("/api/studio/commission-policies?service="+service);oldPolicy=initial.value.rules.find((r:{effectiveFrom:string})=>r.effectiveFrom==="2026-10-01").id;
   assert.equal((await publish("2026-10-20",rules(1000,1000))).status,409);
   assert.equal((await call("/api/studio/commission-policies",{serviceId:service,effectiveFrom:"2026-11-01",tiers:rules(1,1)},staff)).status,403);
  });
  const a=await create("2026-10-19"),b=await create("2026-10-20"),c=await create("2026-10-21");
  await t.test("the service-date boundary is inclusive and pending requests do not count",async()=>{
   const stale=await call("/api/studio/settlements",{reservationid:a,price:2000000,currency:"KRW",paymentMethod:"cash",policyId:"stale-policy"},staff);assert.equal(stale.status,409);assert.equal((await order(a)).finalPrice,null);
   await confirm(a,2000000);assert.equal((await order(a)).commissionAmount,800000);
   const pending=await submit(b,1900000);assert.equal(pending.value.request.commissionAmount,950000);assert.equal((await order(a)).commissionRevenueBasis,2000000);
   assert.equal((await order(b)).finalPrice,null);assert.equal((await approve(pending.value.request.id)).status,200);
   assert.equal((await order(a)).commissionAmount,800000);assert.equal((await order(b)).commissionAmount,950000);
   assert.equal(((await order(a)).commissionPolicySnapshot as {id:string}).id,oldPolicy);assert.equal(((await order(b)).commissionPolicySnapshot as {id:string}).id,newPolicy);
  });
  await t.test("exactly four million rerates the whole month with each order's own old or new rule",async()=>{
   await confirm(c,100000);
   const first=await order(a),second=await order(b),last=await order(c);
   assert.equal(first.commissionAmount,1000000);assert.equal(second.commissionAmount,1140000);assert.equal(last.commissionAmount,60000);
   assert.equal(first.commissionRateBps,5000);assert.equal(second.commissionRateBps,6000);assert.equal(first.settlementVersion,1);
   const audit=await db.commissionAdjustment.findMany({where:{reservationId:a},orderBy:{createdAt:"asc"}});assert.ok(audit.some(row=>row.previousAmount===800000&&row.commissionAmount===1000000&&row.revenueBasis===4000000));
  });
  await t.test("publishing a new rule never rewrites an order or earlier rule",async()=>{
   const before=await order(a),afterBefore=await order(b);
   assert.equal((await publish("2026-10-25",rules(2000,1000))).status,200);
   assert.deepEqual(await order(a),before);assert.deepEqual(await order(b),afterBefore);
   assert.deepEqual((await db.commissionPolicy.findUniqueOrThrow({where:{id:oldPolicy}})).tiers,rules(6000,5000));
   const context=await call("/api/studio/settlement?reservation="+a,undefined,staff);assert.equal(context.value.booking.commissionPolicySnapshot.id,oldPolicy);
  });
  await t.test("employee, project, month and currency totals are separate",async()=>{
   assert.equal((await publish("2026-10-01",rules(6000,5000),{currency:"USD"})).status,200);
   assert.equal((await publish("2026-10-01",rules(5000,4000),{serviceId:otherService})).status,200);
   const month=await create("2026-11-01"),project=await create("2026-10-22",otherService),person=await create("2026-10-23",service,other),usd=await create("2026-10-24");
   await confirm(month,5000000);await confirm(project,4000000);await confirm(usd,4000000,"USD");
   const otherRequest=await submit(person,5000000,"KRW",outsider);assert.equal((await approve(otherRequest.value.request.id)).status,200);
   assert.equal((await order(a)).commissionRevenueBasis,4000000);assert.equal((await order(a)).commissionAmount,1000000);
   const performance=await call("/api/studio/performance?month=2026-10",undefined,staff);assert.ok(performance.value.rows.every((row:{nailArtistId:string})=>row.nailArtistId===artist));
  });
  await t.test("a correction below the threshold rerates old tiers without changing their effective dates",async()=>{
   await confirm(c,0);assert.equal((await order(a)).commissionAmount,800000);assert.equal((await order(b)).commissionAmount,950000);
   assert.equal((await order(a)).commissionRevenueBasis,3900000);
   assert.equal(((await order(a)).commissionPolicySnapshot as {id:string}).id,oldPolicy);
  });
  await t.test("simultaneous approvals serialize the monthly tier calculation",async()=>{
   const d=await create("2026-10-26"),e=await create("2026-10-27");
   const r1=await submit(d,50000),r2=await submit(e,50000);
   const decisions=await Promise.all([approve(r1.value.request.id),approve(r2.value.request.id)]);assert.ok(decisions.every(r=>r.status===200),JSON.stringify(decisions));
   assert.equal((await order(a)).commissionAmount,1000000);assert.equal((await order(a)).commissionRevenueBasis,4000000);
   assert.equal((await order(d)).commissionAmount,45000);assert.equal((await order(e)).commissionAmount,45000);
  });
  await t.test("employee-specific rules are private, and cancellation rerates and retains audits",async()=>{
   assert.equal((await publish("2026-12-01",rules(3000,2000),{nailArtistId:artist})).status,200);
   const december=await create("2026-12-01");await confirm(december,4000000);assert.equal((await order(december)).commissionAmount,3200000);
   const mine=await call("/api/studio/commission-policies?service="+service,undefined,staff),theirs=await call("/api/studio/commission-policies?service="+service,undefined,outsider);
   assert.ok(mine.value.rules.some((rule:{nailArtistId:string})=>rule.nailArtistId===artist));assert.ok(!theirs.value.rules.some((rule:{nailArtistId:string})=>rule.nailArtistId===artist));
   assert.equal((await call("/api/getSingleReservation?reservationid="+b,{})).status,200);
   assert.equal((await order(a)).commissionAmount,800000);assert.ok(await db.commissionAdjustment.count({where:{reservationKey:b,reservationId:null}}));
  });
 }finally{
  await db.commissionAdjustment.deleteMany({where:{reservationKey:{in:bookings}}});await db.settlementRequest.deleteMany({where:{reservationKey:{in:bookings}}});await db.reservation.deleteMany({where:{userId:customer}});await db.user.deleteMany({where:{id:customer}});await db.nailArtist.deleteMany({where:{id:{in:[artist,other]}}});await db.commissionPolicy.deleteMany({where:{serviceId:{in:[service,otherService]}}});
  if(original)await db.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value:original.value!},update:{value:original.value!}});else await db.homeContent.deleteMany({where:{key:contentKey}});await db.$disconnect();
 }
});

import test from "node:test";
import assert from "node:assert/strict";
import {PrismaClient} from "@prisma/client";
import jwt from "jsonwebtoken";
import {createBooking} from "../lib/studio/booking-db";
import {DEFAULT_CONTENT,contentKey} from "../lib/studio/content";
const db=new PrismaClient(),u=new URL(process.env.DATABASE_URL!);
assert.equal(u.host,"127.0.0.1:55432");assert.equal(u.pathname,"/beaver_studio_test");
const prefix="catalog_test_"+Date.now(),serviceId="service_"+Date.now(),base="http://127.0.0.1:3001",web="http://127.0.0.1:3000";
const token=(id:string,memberType:string)=>jwt.sign({id,memberType},process.env.JWT_SECRET!,{expiresIn:"5m"});
const manager=token(prefix,"manager"),staff=token(prefix+"_staff","staff"),other=token(prefix+"_other","staff");
const call=(path:string,who:string,method="GET",body?:unknown)=>fetch(base+path,{method,headers:{Authorization:"Bearer "+who,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
test("catalog, markdown, scoped performance and membership permissions",async t=>{
 const original=await db.homeContent.findUnique({where:{key:contentKey}}),value=structuredClone(DEFAULT_CONTENT);
 value.about.zh="# 门店预览\n\n**你好**\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))";
 value.services.push({id:serviceId,names:{zh:"测试造型",en:"Test style",kr:"테스트"},enabled:true,theme:"yellow",sections:[],notes:[{zh:"刷卡结算时附加税 +10%",en:"Card +10%",kr:"카드 +10%"}]});
 try{
 await t.test("staff can read content, only manager can publish, markdown is sanitized",async()=>{
  assert.equal((await call("/api/studio/content",staff)).status,200);
  assert.equal((await call("/api/studio/content",staff,"PUT",value)).status,403);
  const saved=await call("/api/studio/content",manager,"PUT",value);assert.equal(saved.status,200,await saved.text());
  const preview=await call("/api/studio/preview",manager,"POST",value);assert.equal(preview.status,200);
  const p=await preview.json();assert.match(p.aboutHtml.zh,/<h1>门店预览<\/h1>/);assert.ok(!/script|javascript:/i.test(p.aboutHtml.zh));
  const publicContent=await(await fetch(web+"/api/studio/content")).json();assert.ok(publicContent.services.some((s:{id:string})=>s.id===serviceId));assert.equal(publicContent.aboutHtml.zh,p.aboutHtml.zh);
 });
 await db.nailArtist.create({data:{id:prefix+"_staff",name:prefix,services:["nails",serviceId],commissionRateBps:2500,active:true,durationMinutes:120,schedule:[{days:[0,1,2,3,4,5,6],start:"10:00",end:"18:00"}],serviceSettings:{nails:{durationMinutes:120,schedule:[{days:[2],start:"10:00",end:"14:00"}]},[serviceId]:{durationMinutes:60,schedule:[{days:[2],start:"13:00",end:"16:00"}]}}}});
 await db.user.create({data:{id:prefix+"_user",name:prefix,membershipType:"vip",provider:"test",balance:100000}});
 await t.test("custom projects have their own time windows and duration; collisions cross services",async()=>{
  const url="/api/getAvailableTimeSlots?date=2030-11-05&nailArtistId="+prefix+"_staff&serviceType=";
  const a=await(await call(url+"nails",staff)).json(),b=await(await call(url+serviceId,staff)).json();
  assert.deepEqual(a.timeSlots,["10:00","12:00"]);assert.deepEqual(b.timeSlots,["13:00","14:00","15:00"]);assert.equal(b.durationMinutes,60);
  const booked=await createBooking(db,{date:"2030-11-05",timeSlot:"12:00",nailArtistId:prefix+"_staff",serviceType:"nails"},prefix+"_user");assert.equal(booked.reservation.durationMinutes,120);
  const next=await(await call(url+serviceId,staff)).json();assert.ok(!next.availableTimeSlots.includes("13:00"));assert.ok(next.availableTimeSlots.includes("14:00"));
  const custom=await createBooking(db,{date:"2030-11-05",timeSlot:"14:00",nailArtistId:prefix+"_staff",serviceType:serviceId},prefix+"_user");assert.equal(custom.reservation.durationMinutes,60);
 });
 const booking=await db.reservation.findFirstOrThrow({where:{userId:prefix+"_user",serviceType:serviceId}});
 await t.test("settlement records actual received and snapshots commission",async()=>{
  const payload={reservationid:booking.id,price:100000,receivedAmount:80000,currency:"KRW",paymentMethod:"cash"};
  assert.equal((await call("/api/modifyReservationPrice",other,"POST",payload)).status,403);
  const settle=await call("/api/modifyReservationPrice",staff,"POST",payload);assert.equal(settle.status,200);
  const result=(await settle.json()).reservation;assert.equal(result.commissionAmount,20000);assert.equal(result.commissionRateBps,2500);
  await db.nailArtist.update({where:{id:prefix+"_staff"},data:{commissionRateBps:5000}});
  assert.equal((await call("/api/modifyReservationPrice",staff,"POST",payload)).status,200);
  assert.equal((await db.reservation.findUniqueOrThrow({where:{id:booking.id}})).commissionAmount,20000);
 });
 await t.test("employees cannot request another employee's earnings or manager statistics",async()=>{
  const mine=await(await call("/api/studio/performance?month=2030-11&staff=other",staff)).json();
  assert.equal(mine.scope,"self");assert.equal(mine.count,2);assert.ok(mine.rows.every((r:{nailArtistId:string})=>r.nailArtistId===prefix+"_staff"));
  const total=mine.totals.find((v:{currency:string})=>v.currency==="KRW");assert.equal(total.revenue,100000);assert.equal(total.received,80000);assert.equal(total.commission,20000);
  assert.equal((await call("/api/getReservationStats",staff)).status,403);
  assert.equal((await call("/api/getMonthlyOverview?month=2030-11",staff)).status,403);
  assert.equal((await call("/api/studio/performance",other)).status,200);
 });
 await t.test("the merged statistics keep manager totals separate from signed employee scope",async()=>{
  const blocked=await(await call("/api/studio/performance?month=2030-11&staff="+prefix+"_staff&memberType=manager",other)).json();
  assert.equal(blocked.scope,"self");assert.equal(blocked.count,0);assert.deepEqual(blocked.rows,[]);assert.deepEqual(blocked.staff,[]);
  const selected=await(await call("/api/studio/performance?month=2030-11&staff="+prefix+"_staff",manager)).json();
  assert.equal(selected.scope,"manager");assert.equal(selected.count,2);assert.ok(selected.staff.some((person:{id:string})=>person.id===prefix+"_staff"));
  const overview=await call("/api/getMonthlyOverview?month=2030-11",manager);assert.equal(overview.status,200);assert.ok((await overview.json()).summary.count>=2);
  assert.equal((await call("/api/getReservationStats",manager)).status,200);
  assert.equal((await call("/api/getMonthlyOverview?month=2030-11&memberType=manager",other)).status,403);
  assert.equal((await call("/api/getReservationStats?memberType=manager",other)).status,403);
 });
 await t.test("missing, expired and forged sessions cannot access statistics or modify studio settings",async()=>{
  const expired=jwt.sign({id:prefix,memberType:"manager"},process.env.JWT_SECRET!,{expiresIn:-1});
  const forged=jwt.sign({id:prefix,memberType:"manager"},"invalid-test-signing-key",{expiresIn:"5m"});
  for(const who of ["",expired,forged])for(const path of ["/api/studio/performance","/api/getMonthlyOverview?month=2030-11","/api/getReservationStats"])
   assert.ok([401,403].includes((await call(path,who)).status));
  assert.equal((await call("/api/studio/time-off",staff,"POST",{})).status,403);
  assert.equal((await call("/api/studio/weekly-closures",staff,"PUT",{})).status,403);
 });
 await t.test("members are readable to all employees; mutations use JWT role, not supplied operatorId",async()=>{
  const list=await(await call("/api/studio/members?q="+prefix,staff)).json();assert.equal(list.rows.length,1);assert.equal(list.rows[0].balance,100000);
  assert.equal((await call("/api/memberCardRecharge",staff,"POST",{userId:prefix+"_user",amount:1000,operatorId:"beavernail-id"})).status,403);
  assert.equal((await call("/api/changeMemberType",staff,"POST",{userId:prefix+"_user",membershipType:"free",operatorId:"beavernail-id"})).status,403);
  assert.equal((await call("/api/memberCardRecharge",manager,"POST",{userId:prefix+"_user",amount:1000,operatorId:"beavernail-id"})).status,200);
  assert.equal((await db.user.findUniqueOrThrow({where:{id:prefix+"_user"}})).balance,101000);
 });
 }finally{
  await db.reservation.deleteMany({where:{userId:prefix+"_user"}});await db.user.deleteMany({where:{id:prefix+"_user"}});await db.nailArtist.deleteMany({where:{id:prefix+"_staff"}});
  if(original)await db.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value:original.value!},update:{value:original.value!}});else await db.homeContent.deleteMany({where:{key:contentKey}});
  await db.$disconnect();
 }
});

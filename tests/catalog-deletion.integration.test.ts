import test from "node:test";
import assert from "node:assert/strict";
import {PrismaClient} from "@prisma/client";
import jwt from "jsonwebtoken";
import {contentKey,DEFAULT_CONTENT,type StudioContent} from "../lib/studio/content";

const db=new PrismaClient(),url=new URL(process.env.DATABASE_URL!);
assert.equal(url.host,"127.0.0.1:55432");
assert.match(url.pathname,/^\/beaver_(?:studio|settlement)_test(?:_[a-z0-9_]+)?$/);
const base=process.env.STUDIO_TEST_ADMIN_ORIGIN||"http://127.0.0.1:3001";
assert.ok(["127.0.0.1","localhost"].includes(new URL(base).hostname));
const prefix="delete_test_"+Date.now(),id=prefix+"_project";
const manager=jwt.sign({id:"beavernail-id",username:"beavernail",memberType:"manager"},process.env.JWT_SECRET!,{expiresIn:"5m"});
const staff=jwt.sign({id:prefix,memberType:"staff"},process.env.JWT_SECRET!,{expiresIn:"5m"});
const call=(method:string,who=manager,service:string|undefined=id,body?:unknown)=>fetch(base+"/api/studio/content"+(service===undefined?"":"?service="+service),{
 method,headers:{Authorization:"Bearer "+who,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),
});
const fixture=()=>{
 const content=structuredClone(DEFAULT_CONTENT);
 content.services.push({id,names:{zh:"误建测试项目",en:"Test",kr:"테스트"},enabled:true,theme:"mint",sections:[],notes:[]});
 return content;
};
const save=async(value:StudioContent)=>{const response=await call("PUT",manager,undefined,value);assert.equal(response.status,200,await response.text());};

test("catalog project deletion preserves orders and removes unused configuration",async t=>{
 const original=await db.homeContent.findUnique({where:{key:contentKey}});
 try{
  await db.nailArtist.create({data:{id:prefix,name:prefix,services:["nails",id],serviceSettings:{nails:{durationMinutes:120,schedule:[]},[id]:{durationMinutes:60,schedule:[]}}}});
  await save(fixture());
  await t.test("only a signed manager can delete; missing and unknown projects are rejected",async()=>{
   assert.equal((await call("DELETE","")).status,401);
   assert.equal((await call("DELETE",staff)).status,403);
   assert.equal((await call("DELETE",manager,"")).status,400);
   assert.equal((await call("DELETE",manager,prefix+"_missing")).status,404);
   assert.ok((await(await call("GET")).json()).services.some((service:{id:string})=>service.id===id));
  });
  await t.test("deleting an unused project cleans its staff settings and retains other saved content",async()=>{

   await db.nailArtist.create({data:{id:prefix+"_only",name:prefix+"_only",services:[id],serviceSettings:{[id]:{durationMinutes:60,schedule:[]}}}});
   const content=fixture();content.about.zh="另一位管理员刚保存的门店介绍";
   await save(content);
   const response=await call("DELETE");assert.equal(response.status,200);
   const value=await response.json();assert.ok(!value.services.some((service:{id:string})=>service.id===id));
   assert.equal(value.about.zh,content.about.zh);assert.deepEqual(value.services,content.services.filter(service=>service.id!==id));
   const person=await db.nailArtist.findUniqueOrThrow({where:{id:prefix}});
   assert.deepEqual(person.services,["nails"]);assert.deepEqual(person.serviceSettings,{nails:{durationMinutes:120,schedule:[]}});
   const only=await db.nailArtist.findUniqueOrThrow({where:{id:prefix+"_only"}});assert.deepEqual(only.services,[]);assert.deepEqual(only.serviceSettings,{});
   assert.equal((await call("DELETE")).status,404);
  });
  await t.test("the last enabled project cannot be deleted",async()=>{
   const content=fixture();for(const service of content.services)service.enabled=service.id===id;
   await save(content);
   const response=await call("DELETE");assert.equal(response.status,409);assert.match((await response.json()).error,/至少保留一个/);
   assert.ok((await(await call("GET")).json()).services.some((service:{id:string})=>service.id===id));
  });
  await t.test("past orders block deletion through both DELETE and a full catalog PUT; disabling stays available",async()=>{
   await save(fixture());
   await db.user.create({data:{id:prefix,name:prefix,provider:"test"}});
   const booking=await db.reservation.create({data:{userId:prefix,nailArtistId:prefix,date:new Date("2020-01-01T00:00:00Z"),timeSlot:"10:00",serviceType:id}});
   const response=await call("DELETE");assert.equal(response.status,409);assert.match((await response.json()).error,/已有预约记录/);
   const removed=fixture();removed.services=removed.services.filter(service=>service.id!==id);
   assert.equal((await call("PUT",manager,undefined,removed)).status,409);
   assert.equal((await db.reservation.findUniqueOrThrow({where:{id:booking.id}})).serviceType,id);
   const disabled=fixture();disabled.services.find(service=>service.id===id)!.enabled=false;await save(disabled);
   const current=await(await call("GET")).json();assert.equal(current.services.find((service:{id:string})=>service.id===id).enabled,false);
  });
  await t.test("activity deletion requires a manager, retains other content, and allows an empty activity list",async()=>{
   const content=fixture();
   content.events=["first","second"].map(key=>({id:prefix+key,title:{zh:key,en:key,kr:key},body:{zh:"活动介绍",en:"Event",kr:"소식"},image:"",enabled:true}));
   await save(content);
   const remove=(eventId:string,who=manager,extra="")=>fetch(base+"/api/studio/content?event="+eventId+extra,{method:"DELETE",headers:{Authorization:"Bearer "+who}});
   assert.equal((await remove(content.events[0].id,"")).status,401);
   assert.equal((await remove(content.events[0].id,staff)).status,403);
   assert.equal((await remove(prefix+"missing")).status,404);
   assert.equal((await remove(content.events[0].id,manager,"&service="+id)).status,400);
   content.contact.phone="updated before deletion";await save(content);
   const response=await remove(content.events[0].id);assert.equal(response.status,200);
   const current=await response.json();assert.deepEqual(current.events,[content.events[1]]);assert.deepEqual(current.services,content.services);assert.deepEqual(current.contact,content.contact);
   assert.equal((await remove(content.events[0].id)).status,404);
   const last=await remove(content.events[1].id);assert.equal(last.status,200);assert.deepEqual((await last.json()).events,[]);
   assert.equal((await db.reservation.count({where:{userId:prefix}})),1);
  });
 }finally{
  await db.reservation.deleteMany({where:{userId:prefix}});
  await db.user.deleteMany({where:{id:prefix}});
  await db.nailArtist.deleteMany({where:{id:{in:[prefix,prefix+"_only"]}}});
  if(original)await db.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value:original.value!},update:{value:original.value!}});
  else await db.homeContent.deleteMany({where:{key:contentKey}});
  await db.$disconnect();
 }
});

import test from "node:test";
import assert from "node:assert/strict";
import {PrismaClient} from "@prisma/client";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import {contentKey,DEFAULT_CONTENT} from "../lib/studio/content";

const db=new PrismaClient(),url=new URL(process.env.DATABASE_URL!);
assert.equal(url.host,"127.0.0.1:55432");assert.match(url.pathname,/^\/beaver_(?:studio|settlement)_test(?:_[a-z0-9_]+)?$/);
const admin=process.env.STUDIO_TEST_ADMIN_ORIGIN||"http://127.0.0.1:3001",web=process.env.STUDIO_TEST_CUSTOMER_ORIGIN||"http://127.0.0.1:3000";
for(const origin of [admin,web])assert.ok(["localhost","127.0.0.1"].includes(new URL(origin).hostname));
const token=jwt.sign({id:"beavernail-id",username:"beavernail",memberType:"manager"},process.env.JWT_SECRET!,{expiresIn:"5m"}),headers={Authorization:"Bearer "+token,"Content-Type":"application/json"};
const id="poster_test_"+Date.now();
test("image-only activities work through admin, preview and the unchanged 4.0.1 response contract",async()=>{
 const original=await db.homeContent.findUnique({where:{key:contentKey}});
 try{
  const bytes=await sharp({create:{width:300,height:900,channels:3,background:"#ffafcf"}}).webp().toBuffer();
  await db.mediaAsset.create({data:{id,data:bytes,mimeType:"image/webp",purpose:"home"}});
  const value=structuredClone(DEFAULT_CONTENT);value.events=[{id,title:{zh:"旧标题不再展示",en:"Old",kr:"제목"},body:{zh:"旧正文不再展示",en:"Body",kr:"본문"},image:"/api/media/"+id,enabled:true}];
  const save=await fetch(admin+"/api/studio/content",{method:"PUT",headers,body:JSON.stringify(value)});assert.equal(save.status,200);
  const preview=await fetch(admin+"/api/studio/preview",{method:"POST",headers,body:JSON.stringify(value)});assert.equal(preview.status,200);
  const response=await fetch(web+"/api/studio/content");assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"no-store");
  const content=await response.json();assert.deepEqual(content.events,(await preview.json()).events);
  const poster=content.events[0];assert.equal(poster.id,id);assert.equal(poster.title.zh,"");assert.equal(poster.body.zh,"");assert.equal(poster.html.zh,"");
  assert.equal(poster.image,"/api/media/"+id+"?format=compatible");
  const image=await fetch(web+poster.image);assert.equal(image.status,200);assert.equal(image.headers.get("content-type"),"image/jpeg");
  const metadata=await sharp(Buffer.from(await image.arrayBuffer())).metadata();assert.equal(metadata.width,300);assert.equal(metadata.height,900);
  const disabled={...value,events:[{...value.events[0],enabled:false}]};
  const hide=await fetch(admin+"/api/studio/content",{method:"PUT",headers,body:JSON.stringify(disabled)});assert.equal(hide.status,200);
  assert.deepEqual((await(await fetch(web+"/api/studio/content")).json()).events,[]);
 }finally{
  if(original)await db.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value:original.value!},update:{value:original.value!}});else await db.homeContent.deleteMany({where:{key:contentKey}});
  await db.mediaAsset.deleteMany({where:{id}});await db.$disconnect();
 }
});

import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {contentKey,studioContentSchema,DEFAULT_CONTENT} from "@/lib/studio/content";
import {lockScheduling} from "@/lib/studio/booking-db";
import {apiError} from "@/lib/studio/http";
export async function GET(request:Request){
 try{requireStaff(request); const saved=await prisma.homeContent.findUnique({where:{key:contentKey}});
 return NextResponse.json(saved?studioContentSchema.parse(saved.value):DEFAULT_CONTENT,{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return apiError(e);}
}
export async function PUT(request:Request){
 try{requireStaff(request,true);const value=studioContentSchema.parse(await request.json());
 await prisma.$transaction(async tx=>{await lockScheduling(tx,true);await tx.homeContent.upsert({where:{key:contentKey},create:{key:contentKey,value},update:{value}});});
 return NextResponse.json(value);
 }catch(e){return apiError(e);}
}

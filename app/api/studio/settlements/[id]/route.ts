import {NextResponse} from "next/server";
import {z} from "zod";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {apiError} from "@/lib/studio/http";
import {decideSettlement} from "@/lib/studio/settlement-db";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const actor=await requireStaff(request),{id}=await params;
  const value=z.object({action:z.enum(["approve","reject","withdraw"]),note:z.string().trim().max(1000).default("")}).parse(await request.json());
  const result=await decideSettlement(prisma,actor,id,value.action,value.note);
  return NextResponse.json({success:true,request:result,message:value.action==="approve"?"结算已确认":value.action==="reject"?"申请已退回":"申请已撤回"});
 }catch(error){return apiError(error);}
}

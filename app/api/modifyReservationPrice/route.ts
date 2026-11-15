import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {apiError} from "@/lib/studio/http";
import {submitSettlement} from "@/lib/studio/settlement-db";
// Legacy admin tabs can submit requests but cannot bypass approval.
export async function POST(request:Request){
 try{
  const actor=await requireStaff(request),input=await request.json();
  const result=await submitSettlement(prisma,actor,input);
  return NextResponse.json({success:true,message:"已提交结算申请，审核确认后生效",request:result});
 }catch(error){return apiError(error);}
}

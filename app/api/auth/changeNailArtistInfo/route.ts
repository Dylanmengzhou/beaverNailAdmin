import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/studio/auth";
import { BookingError } from "@/lib/studio/booking-db";
import { apiError } from "@/lib/studio/http";
export async function POST(request:Request){
 try{
  const actor=await requireStaff(request);
  const value=z.object({id:z.string(),name:z.string().trim().min(1).max(100),account:z.string().trim().min(1).max(100),oldPassword:z.string().min(1),newPassword:z.string().min(1).max(200),confirmPassword:z.string()}).parse(await request.json());
  if(actor.id!==value.id)throw new BookingError("只能修改自己的个人账号；管理员工请使用员工设置",403);
  if(value.account.toLowerCase()==="beavernail")throw new BookingError("该账号为管理员保留账号",409);
  const person=await prisma.nailArtist.findUnique({where:{id:actor.id}});
  if(!person||person.password!==value.oldPassword)throw new BookingError("原密码不正确",401);
  if(value.newPassword!==value.oldPassword&&value.newPassword!==value.confirmPassword)throw new BookingError("新密码和确认密码不一致");
  const duplicate=await prisma.nailArtist.findFirst({where:{account:value.account,id:{not:actor.id}},select:{id:true}});
  if(duplicate)throw new BookingError("该账号已被使用",409);
  const user=await prisma.nailArtist.update({where:{id:actor.id},data:{name:value.name,account:value.account,password:value.newPassword}});
  const claims={id:user.id,username:user.account,memberType:user.membertype==="manager"?"manager":"staff",nailArtistName:user.name};
  return NextResponse.json({success:true,message:"个人信息已更新",accessToken:jwt.sign(claims,process.env.JWT_SECRET!,{expiresIn:"7d"}),refreshToken:jwt.sign(claims,process.env.JWT_SECRET!,{expiresIn:"14d"}),user:{id:user.id,name:user.name,account:user.account,memberType:claims.memberType,nailArtistName:user.name}});
 }catch(error){return apiError(error);}
}

import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {requireStaff} from "@/lib/studio/auth";
import {apiError} from "@/lib/studio/http";
export async function GET(request:Request){
 try{
 requireStaff(request);const p=new URL(request.url).searchParams,q=(p.get("q")||"").slice(0,100),page=Math.max(1,Math.min(10000,Number(p.get("page"))||1));
 const where={membershipType:"vip",...(q?{OR:[{name:{contains:q,mode:"insensitive" as const}},{email:{contains:q,mode:"insensitive" as const}},{username:{contains:q,mode:"insensitive" as const}}]}:{})};
 const [count,rows]=await Promise.all([prisma.user.count({where}),prisma.user.findMany({where,select:{id:true,name:true,nickname:true,email:true,contactType:true,membershipType:true,balance:true,reservations:{select:{finalPrice:true,paymentMethod:true}}},orderBy:{createdAt:"desc"},take:20,skip:(page-1)*20})]);
 return NextResponse.json({count,page,rows:rows.map(({reservations,...u})=>({...u,reservationCount:reservations.length,balance:Math.max(0,(u.balance||0)-reservations.filter(r=>r.paymentMethod==="memberCard").reduce((t,r)=>t+(r.finalPrice||0),0))}))});
 }catch(e){return apiError(e);}
}

import jwt, { type JwtPayload } from "jsonwebtoken";
import { BookingError } from "./booking-db";
import prisma from "@/lib/prisma";
export type StaffActor={id:string;username:string;memberType:"manager"|"staff";nailArtistName:string;exp:number};
export function verifyStaffIdentity(request: Request) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new BookingError("请先配置 JWT_SECRET", 503);
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer "))
    throw new BookingError("请先登录管理端", 401);
  try {
    const payload = jwt.verify(header.slice(7), secret, {
      algorithms: ["HS256"],
    }) as JwtPayload;
    if (
      typeof payload.id!=="string" || !payload.id || !payload.exp ||
      !["manager", "staff"].includes(payload.memberType)
    )
      throw new Error("Forbidden");
    return {
      id: payload.id,
      exp: payload.exp,
      configuredManager: payload.id === "beavernail-id" && payload.username === "beavernail" && payload.memberType === "manager",
    };
  } catch {
    throw new BookingError("身份无效或无权执行此操作", 403);
  }
}

export async function requireStaff(request: Request, managerOnly = false):Promise<StaffActor> {
  const identity = verifyStaffIdentity(request);
  // Store accounts use current DB permissions, so a stale token cannot retain
  // manager access after demotion. The configured administrator has no DB row.
  if(identity.configuredManager)
    return {id:identity.id,username:"beavernail",memberType:"manager",nailArtistName:"管理员",exp:identity.exp};
  const person=await prisma.nailArtist.findUnique({where:{id:identity.id},select:{id:true,name:true,account:true,membertype:true}});
  if(!person)throw new BookingError("员工账号已不存在，请重新登录",401);
  const memberType=person.membertype==="manager"?"manager":"staff";
  if(managerOnly&&memberType!=="manager")throw new BookingError("此操作需要店长或管理员权限",403);
  return {id:person.id,username:person.account||person.name,memberType,nailArtistName:person.name,exp:identity.exp};
}

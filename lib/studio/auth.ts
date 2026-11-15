import jwt, { type JwtPayload } from "jsonwebtoken";
import { BookingError } from "./booking-db";
export function requireStaff(request: Request, managerOnly = false) {
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
      !payload.id ||
      !["manager", "staff"].includes(payload.memberType) ||
      (managerOnly && payload.memberType !== "manager")
    )
      throw new Error("Forbidden");
    return payload as JwtPayload & {
      id: string;
      memberType: string;
      username?: string;
    };
  } catch {
    throw new BookingError("身份无效或无权执行此操作", 403);
  }
}

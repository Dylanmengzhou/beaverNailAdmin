import { NextRequest, NextResponse } from "next/server";
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/api/auth/login" || /^\/api\/media\/[^/]+$/.test(path))
    return NextResponse.next();
  const secret = process.env.JWT_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "管理端未配置 JWT_SECRET" },
      { status: 503 },
    );
  try {
    const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!token) throw new Error("No token");
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token");
    const decode = (s: string) =>
      Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0),
      );
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    if (
      header.alg !== "HS256" ||
      !payload.exp ||
      payload.exp <= Date.now() / 1000 ||
      !["manager", "staff"].includes(payload.memberType)
    )
      throw new Error("Invalid claims");
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    if (
      !(await crypto.subtle.verify(
        "HMAC",
        key,
        decode(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
      ))
    )
      throw new Error("Invalid signature");
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "请先登录管理端" }, { status: 401 });
  }
}
export const config = { matcher: ["/api/:path*"] };

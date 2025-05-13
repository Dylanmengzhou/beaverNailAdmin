import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// 验证是否为管理员
const verifyManager = (req: NextRequest) => {
  try {
    // 从请求头获取Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { verified: false, message: "缺少有效的身份验证凭证" };
    }

    const token = authHeader.split(" ")[1];
    // 解析JWT
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      return { verified: false, message: "无效的令牌格式" };
    }

    // 解码JWT负载
    const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());

    // 验证用户类型
    if (payload.memberType !== "manager") {
      return { verified: false, message: "无权访问，需要经理权限" };
    }

    return { verified: true, userId: payload.id };
  } catch (error) {
    console.error("身份验证失败:", error);
    return { verified: false, message: "身份验证过程中发生错误" };
  }
};

// 获取所有美甲师
export async function GET(request: NextRequest) {
  try {
    // 验证是否为管理员
    const auth = verifyManager(request);
    if (!auth.verified) {
      return NextResponse.json({ message: auth.message }, { status: 403 });
    }

    // 连接数据库
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not defined");
    }
    const sql = neon(databaseUrl);

    // 查询所有美甲师
    const nailArtists = await sql`
      SELECT "id", "name", "role", "membertype", "account" 
      FROM "NailArtist"
    `;

    return NextResponse.json({ nailArtists }, { status: 200 });
  } catch (error) {
    console.error("获取美甲师数据失败:", error);
    return NextResponse.json(
      { message: "服务器错误，请稍后再试" },
      { status: 500 }
    );
  }
}

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

// 删除指定ID的美甲师
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证是否为管理员
    const auth = verifyManager(request);
    if (!auth.verified) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "未提供有效的美甲师ID" },
        { status: 400 }
      );
    }

    // 连接数据库
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not defined");
    }
    const sql = neon(databaseUrl);

    // 先检查美甲师是否存在
    const existingArtist = await sql`
      SELECT "name" FROM "NailArtist" WHERE "id" = ${id}
    `;

    if (existingArtist.length === 0) {
      return NextResponse.json(
        { success: false, message: "找不到指定ID的美甲师" },
        { status: 404 }
      );
    }

    // 删除美甲师
    await sql`
      DELETE FROM "NailArtist" WHERE "id" = ${id}
    `;

    return NextResponse.json(
      { success: true, message: "美甲师已成功删除" },
      { status: 200 }
    );
  } catch (error) {
    console.error("删除美甲师失败:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误，请稍后再试" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);
  try {
    const { userId, membershipType, operatorId } = await request.json();

    // 验证参数
    if (!userId || !membershipType || !operatorId) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 验证会员类型
    if (!["vip", "free"].includes(membershipType)) {
      return NextResponse.json(
        { success: false, message: "无效的会员类型" },
        { status: 400 }
      );
    }

    // 验证用户是否存在
    const user = await sql`SELECT * FROM "User" WHERE id = ${userId}`;

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }
    console.log(operatorId);
    // 验证操作员权限（假设只有manager和staff可以修改）
    if (operatorId !== "beavernail-id") {
      const operator =
        await sql`SELECT * FROM "NailArtist" WHERE id = ${operatorId}`;

      console.log(operator);

      if (
        operator.length === 0 ||
        !["manager", "staff"].includes(operator[0].membertype || "")
      ) {
        return NextResponse.json(
          { success: false, message: "权限不足" },
          { status: 403 }
        );
      }
    }

    // 更新用户会员类型
    await sql`UPDATE "User" SET "membershipType" = ${membershipType} WHERE id = ${userId}`;

    return NextResponse.json({
      success: true,
      message: "会员类型更新成功",
      data: {
        userId: userId,
        memberType: membershipType,
      },
    });
  } catch (error) {
    console.error("更改会员类型失败:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

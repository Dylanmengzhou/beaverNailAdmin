import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);

  // 获取请求参数
  const { userId, amount, operatorId } = await request.json();

  console.log("充值请求参数:", { userId, amount, operatorId });

  if (!userId || !amount || !operatorId) {
    return NextResponse.json(
      { success: false, message: "参数不能为空" },
      { status: 400 }
    );
  }

  // 验证金额是否为正数
  if (amount <= 0) {
    return NextResponse.json(
      { success: false, message: "充值金额必须大于0" },
      { status: 400 }
    );
  }

  try {
    // 更新用户余额并设置会员类型（处理balance为NULL的情况）
    const result = await sql`
      UPDATE "User"
      SET "balance" = COALESCE("balance", 0) + ${amount},
          "membershipType" = 'vip'
      WHERE id = ${userId}
      RETURNING "balance", id, "membershipType"
    `;

    console.log("充值结果:", result);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: "用户不存在或更新失败" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result[0],
        message: "充值成功",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("充值失败:", error);
    return NextResponse.json(
      { success: false, message: "充值失败，请稍后再试" },
      { status: 500 }
    );
  }
}

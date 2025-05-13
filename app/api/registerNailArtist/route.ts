import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";

// 定义请求体验证架构
const registerSchema = z.object({
  name: z.string().min(2, {
    message: "姓名必须至少包含2个字符。",
  }),
  role: z.enum(["L1", "L2", "L3", "L4", "L5", "L6"], {
    message: "请选择有效的角色等级。",
  }),
  account: z.string().min(4, {
    message: "账号必须至少包含4个字符。",
  }),
  password: z.string().min(6, {
    message: "密码必须至少包含6个字符。",
  }),
});

export async function POST(request: NextRequest) {
  try {
    // 解析并验证请求数据
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      // 验证失败，返回错误
      return NextResponse.json(
        { message: "输入数据验证失败", errors: result.error.format() },
        { status: 400 }
      );
    }

    const { name, role, account, password } = result.data;
    const membertype = "staff";
    // 生成"name-随机字符串"格式的ID
    const uniqueId = `${name}-id`;

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not defined");
    }
    const sql = neon(databaseUrl);
    // 检查账户是否已存在
    const existingUser = await sql`
        SELECT * FROM "NailArtist" WHERE name = ${name}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { message: "该名字已被注册，请使用其他名字" },
        { status: 409 }
      );
    }

    // 创建新用户
    const newArtist = await sql`
        INSERT INTO "NailArtist" (id, name, role, account, password, membertype)
        VALUES (${uniqueId}, ${name}, ${role}, ${account}, ${password}, ${membertype})
        RETURNING id, name, role, account, membertype
    `;

    return NextResponse.json(
      {
        message: "美甲师注册成功",
        artist: newArtist[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("注册美甲师失败:", error);
    return NextResponse.json(
      { message: "服务器错误，请稍后再试" },
      { status: 500 }
    );
  }
}

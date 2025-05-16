// 获取美甲师信息
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import jwt from "jsonwebtoken";
export async function POST(request: NextRequest) {
  const requestData = await request.json();
  const { id, name, account, oldPassword, newPassword, confirmPassword } =
    requestData;
  const isChangingPassword = oldPassword !== newPassword;

  console.log("变更信息:", { id, name, account, isChangingPassword });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL is not defined" },
      { status: 500 }
    );
  }
  const sql = neon(databaseUrl);

  // 检查用户是否存在
  try {
    const result = await sql`
    SELECT * FROM "NailArtist" WHERE id = ${id}
  `;
    if (result.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
  } catch (error) {
    console.error("获取美甲师信息失败:", error);
    return NextResponse.json({ error: "获取美甲师信息失败" }, { status: 500 });
  }

  // 验证密码
  const oldPasswordResult = await sql`
    SELECT * FROM "NailArtist" WHERE id = ${id} AND password = ${oldPassword}
  `;
  if (oldPasswordResult.length === 0) {
    return NextResponse.json({ error: "密码不正确" }, { status: 401 });
  }

  // 如果在更改密码，检查确认密码
  if (isChangingPassword && newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "新密码和确认密码不一致" },
      { status: 400 }
    );
  }

  // 更新用户信息
  try {
    await sql`
      UPDATE "NailArtist" SET name = ${name}, account = ${account}, password = ${newPassword} WHERE id = ${id}
    `;

    // 获取更新后的用户信息
    const updatedUserInfo = await sql`
      SELECT * FROM "NailArtist" WHERE id = ${id}
    `;

    if (updatedUserInfo.length === 0) {
      return NextResponse.json(
        { error: "更新用户后获取信息失败" },
        { status: 500 }
      );
    }

    const user = updatedUserInfo[0];
    const SECRET = process.env.JWT_SECRET || "secret";

    // 生成新的token
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.account,
        memberType: user.membertype,
        nailArtistName: user.name,
      },
      SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        username: user.account,
        memberType: user.membertype,
        nailArtistName: user.name,
      },
      SECRET,
      { expiresIn: "14d" }
    );

    // 返回更新后的token和用户信息
    return NextResponse.json({
      success: true,
      message: "美甲师信息更新成功",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        account: user.account,
        memberType: user.membertype,
        nailArtistName: user.name,
      },
    });
  } catch (error) {
    console.error("更新美甲师信息失败:", error);
    return NextResponse.json({ error: "更新美甲师信息失败" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);

  // 获取搜索参数
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query || query.trim() === "") {
    return NextResponse.json(
      { success: false, message: "搜索关键词不能为空" },
      { status: 400 }
    );
  }

  try {
    // 搜索用户
    const users = await sql`
      SELECT 
        id, 
        name, 
        username, 
        email, 
        image,
        gender,
        provider,
        "contactType",
        "altContact",
        "altContactType"
      FROM "User"
      WHERE 
        (name ILIKE ${`%${query}%`} OR 
        "altContact" ILIKE ${`%${query}%`} OR 
        email ILIKE ${`%${query}%`})
    `;
    console.log(users);

    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    console.error("搜索用户失败:", error);
    return NextResponse.json(
      { success: false, message: "搜索用户失败，请稍后再试" },
      { status: 500 }
    );
  }
}

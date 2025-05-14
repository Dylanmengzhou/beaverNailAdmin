import {  NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);

  try {
    // 获取所有美甲师
    const nailArtists = await sql`
      SELECT id, name, role
      FROM "NailArtist"
      ORDER BY name ASC
    `;

    return NextResponse.json({ success: true, nailArtists }, { status: 200 });
  } catch (error) {
    console.error("获取美甲师失败:", error);
    return NextResponse.json(
      { success: false, message: "获取美甲师失败，请稍后再试" },
      { status: 500 }
    );
  }
}

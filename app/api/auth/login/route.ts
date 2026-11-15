import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/sql";
const SECRET = process.env.JWT_SECRET;

export async function POST(req: Request) {
  if (!SECRET) return NextResponse.json({ error: "请先配置 JWT_SECRET" }, { status: 503 });
  let input;
  try { input = await req.json(); } catch { return NextResponse.json({ error: "请求格式错误" }, { status: 400 }); }
  const { username, password } = input || {};
  if (typeof username !== "string" || typeof password !== "string" || !username || !password || username.length > 100 || password.length > 200)
    return NextResponse.json({ error: "请输入有效的账号和密码" }, { status: 400 });
  const configuredHash = process.env.STUDIO_MANAGER_PASSWORD_HASH;
  let managerPasswordValid = false;
  if (username === "beavernail" && configuredHash) {
    const [scheme, salt, digest] = configuredHash.split(":");
    if (scheme === "scrypt" && salt && /^[a-f0-9]{128}$/.test(digest || ""))
      managerPasswordValid = timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, "hex"));
  }
  if (username === "beavernail" && managerPasswordValid) {
    const accessToken = jwt.sign(
      {
        id: "beavernail-id",
        username: "beavernail",
        memberType: "manager",
        nailArtistName: "beavernail",
      },
      SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      {
        id: "beavernail-id",
        username: "beavernail",
        memberType: "manager",
        nailArtistName: "beavernail",
      },
      SECRET,
      { expiresIn: "14d" }
    );

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: "beavernail-id",
        name: "beavernail",
        account: "beavernail",
        memberType: "manager",
        nailArtistName: "beavernail",
      },
    });
  }


  try {
    // 根据用户名和密码查询美甲师
    const nailArtistInfo = await sql`
      SELECT
        "NailArtist"."id",
        "NailArtist"."name",
        "NailArtist"."account",
        "NailArtist"."membertype",
        "NailArtist"."name" as "nailArtistName"
      FROM
        "NailArtist"
      WHERE
        "NailArtist"."account" = ${username} AND
        "NailArtist"."password" = ${password}
    `;


    // 如果找到匹配的美甲师
    if (nailArtistInfo.length > 0) {
      const accessToken = jwt.sign(
        {
          id: nailArtistInfo[0].id,
          username: nailArtistInfo[0].account,
          memberType: nailArtistInfo[0].membertype==="manager"?"manager":"staff",
          nailArtistName: nailArtistInfo[0].nailArtistName,
        },
        SECRET,
        { expiresIn: "7d" }
      );

      const refreshToken = jwt.sign(
        {
          id: nailArtistInfo[0].id,
          username: nailArtistInfo[0].account,
          memberType: nailArtistInfo[0].membertype==="manager"?"manager":"staff",
          nailArtistName: nailArtistInfo[0].nailArtistName,
        },
        SECRET,
        { expiresIn: "14d" }
      );

      return NextResponse.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: nailArtistInfo[0].id,
          name: nailArtistInfo[0].name,
          account: nailArtistInfo[0].account,
          memberType: nailArtistInfo[0].membertype==="manager"?"manager":"staff",
          nailArtistName: nailArtistInfo[0].nailArtistName,
        },
      });
    }

    // 没有找到匹配的美甲师
    return NextResponse.json(
      {
        success: false,
        error: "账号或密码错误",
      },
      { status: 401 }
    );
  } catch (error) {
    console.error("登录错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: "登录失败，请稍后再试",
      },
      { status: 500 }
    );
  }
}

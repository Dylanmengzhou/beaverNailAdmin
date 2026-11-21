import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/sql";
import type { StaffActor } from "@/lib/studio/auth";
const SECRET = process.env.JWT_SECRET;

function loginResponse(
  actor: Omit<StaffActor, "exp">,
  displayName: string,
  secret: string,
) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const accessLifetime = 7 * 24 * 60 * 60;
  const claims = { ...actor, iat: issuedAt };
  return NextResponse.json({
    success: true,
    accessToken: jwt.sign(claims, secret, { expiresIn: accessLifetime }),
    refreshToken: jwt.sign(claims, secret, { expiresIn: "14d" }),
    user: {
      id: actor.id,
      name: displayName,
      account: actor.username,
      memberType: actor.memberType,
      nailArtistName: actor.nailArtistName,
    },
    session: {
      ...actor,
      exp: issuedAt + accessLifetime,
      nailArtistName: actor.id === "beavernail-id" ? "管理员" : actor.nailArtistName,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}

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
    return loginResponse(
      { id: "beavernail-id", username, memberType: "manager", nailArtistName: username },
      username,
      SECRET,
    );
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


    const artist = nailArtistInfo[0];
    if (artist) {
      return loginResponse(
        {
          id: artist.id,
          username: artist.account,
          memberType: artist.membertype === "manager" ? "manager" : "staff",
          nailArtistName: artist.nailArtistName,
        },
        artist.name,
        SECRET,
      );
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

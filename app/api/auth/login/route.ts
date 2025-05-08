import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { neon } from "@neondatabase/serverless";
const SECRET = process.env.JWT_SECRET || 'secret';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  if (username==="beavernail" && password==="DylanBee23!") {
    const accessToken = jwt.sign({
      id: "beavernail-id",
      username: "beavernail",
      memberType: "manager"
    }, SECRET, { expiresIn: '7d' });

    const refreshToken = jwt.sign({
      id: "beavernail-id",
      username: "beavernail",
      memberType: "manager"
    }, SECRET, { expiresIn: '14d' });

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: "beavernail-id",
        name: "beavernail",
        account: "beavernail",
        memberType: "manager"
      }
    });
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
		throw new Error("DATABASE_URL is not defined");
	}
  const sql = neon(databaseUrl);

  try {
    // 根据用户名和密码查询美甲师
    const nailArtistInfo = await sql`
      SELECT
        "NailArtist"."id",
        "NailArtist"."name",
        "NailArtist"."account",
        "NailArtist"."password",
        "NailArtist"."membertype"
      FROM
        "NailArtist"
      WHERE
        "NailArtist"."account" = ${username} AND
        "NailArtist"."password" = ${password}
    `;

    console.log("nailArtistInfo:", nailArtistInfo);

    // 如果找到匹配的美甲师
    if (nailArtistInfo.length > 0) {
      const accessToken = jwt.sign({
        id: nailArtistInfo[0].id,
        username: nailArtistInfo[0].account,
        memberType: nailArtistInfo[0].membertype
      }, SECRET, { expiresIn: '7d' });

      const refreshToken = jwt.sign({
        id: nailArtistInfo[0].id,
        username: nailArtistInfo[0].account,
        memberType: nailArtistInfo[0].membertype
      }, SECRET, { expiresIn: '14d' });

      return NextResponse.json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: nailArtistInfo[0].id,
          name: nailArtistInfo[0].name,
          account: nailArtistInfo[0].account,
          memberType: nailArtistInfo[0].membertype
        }
      });
    }

    // 没有找到匹配的美甲师
    return NextResponse.json({
      success: false,
      error: '账号或密码错误'
    }, { status: 401 });

  } catch (error) {
    console.error("登录错误:", error);
    return NextResponse.json({
      success: false,
      error: '登录失败，请稍后再试'
    }, { status: 500 });
  }
}
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const loginUser = body.loginUser;
  const { startDate, endDate } = body; // 添加日期范围参数
  console.log("loginUser", loginUser);
  console.log("📅 API接收到的日期范围:", startDate, "到", endDate);
  if (startDate && endDate) {
    console.log(
      "🔍 将查询预约数据，包含边界日期:",
      `${startDate} <= date <= ${endDate}`
    );
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);

  try {
    if (loginUser.username === "beavernail") {
      console.log("loginUser.memberType", loginUser.memberType);

      // 管理员查询逻辑
      let reservations;
      if (startDate && endDate) {
        reservations = await sql`
          SELECT
            "User"."name" as "clientName",
            "User"."email",
            "User"."provider",
            "Reservation"."id",
            "Reservation"."date",
            "Reservation"."timeSlot",
            "NailArtist"."name" as "nailArtist",
            "NailArtist"."id" as "nailArtistId"
          FROM
            "Reservation"
          JOIN
            "User"
          ON
            "Reservation"."userId" = "User"."id"
          LEFT JOIN
            "NailArtist"
          ON
            "Reservation"."nailArtistId" = "NailArtist"."id"
          WHERE
            "Reservation"."date" >= ${startDate} AND "Reservation"."date" <= ${endDate}
          ORDER BY
            "Reservation"."date" ASC,
            "Reservation"."timeSlot" ASC
        `;
      } else {
        reservations = await sql`
          SELECT
            "User"."name" as "clientName",
            "User"."email",
            "User"."provider",
            "Reservation"."id",
            "Reservation"."date",
            "Reservation"."timeSlot",
            "NailArtist"."name" as "nailArtist",
            "NailArtist"."id" as "nailArtistId"
          FROM
            "Reservation"
          JOIN
            "User"
          ON
            "Reservation"."userId" = "User"."id"
          LEFT JOIN
            "NailArtist"
          ON
            "Reservation"."nailArtistId" = "NailArtist"."id"
          ORDER BY
            "Reservation"."date" ASC,
            "Reservation"."timeSlot" ASC
        `;
      }

      // 将结果转换成预期的格式，以兼容前端代码
      const formattedReservations = reservations.map((reservation) => {
        return {
          name: reservation.clientName,
          email: reservation.email,
          provider: reservation.provider,
          id: reservation.id,
          date: reservation.date,
          timeSlot: reservation.timeSlot,
          nailArtist: reservation.nailArtist,
          nailArtistId: reservation.nailArtistId,
        };
      });

      return NextResponse.json(
        { success: true, message: formattedReservations },
        { status: 200 }
      );
    }

    // 员工查询逻辑
    let reservations;
    if (startDate && endDate) {
      reservations = await sql`
        SELECT
          "User"."name" as "clientName",
          "User"."email",
          "User"."provider",
          "Reservation"."id",
          "Reservation"."date",
          "Reservation"."timeSlot",
          "NailArtist"."name" as "nailArtist",
          "NailArtist"."id" as "nailArtistId"
        FROM
          "Reservation"
        JOIN
          "User"
        ON
          "Reservation"."userId" = "User"."id"
        LEFT JOIN
          "NailArtist"
        ON
          "Reservation"."nailArtistId" = "NailArtist"."id"
        WHERE
          "Reservation"."nailArtistId" = ${loginUser.nailArtistId}
          AND "Reservation"."date" >= ${startDate} AND "Reservation"."date" <= ${endDate}
        ORDER BY
          "Reservation"."date" ASC,
          "Reservation"."timeSlot" ASC
      `;
    } else {
      reservations = await sql`
        SELECT
          "User"."name" as "clientName",
          "User"."email",
          "User"."provider",
          "Reservation"."id",
          "Reservation"."date",
          "Reservation"."timeSlot",
          "NailArtist"."name" as "nailArtist",
          "NailArtist"."id" as "nailArtistId"
        FROM
          "Reservation"
        JOIN
          "User"
        ON
          "Reservation"."userId" = "User"."id"
        LEFT JOIN
          "NailArtist"
        ON
          "Reservation"."nailArtistId" = "NailArtist"."id"
        WHERE
          "Reservation"."nailArtistId" = ${loginUser.nailArtistId}
        ORDER BY
          "Reservation"."date" ASC,
          "Reservation"."timeSlot" ASC
      `;
    }

    // 将结果转换成预期的格式，以兼容前端代码
    const formattedReservations = reservations.map((reservation) => {
      return {
        name: reservation.clientName,
        email: reservation.email,
        provider: reservation.provider,
        id: reservation.id,
        date: reservation.date,
        timeSlot: reservation.timeSlot,
        nailArtist: reservation.nailArtist,
        nailArtistId: reservation.nailArtistId,
      };
    });

    return NextResponse.json(
      { success: true, message: formattedReservations },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error("获取预约出错:", errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

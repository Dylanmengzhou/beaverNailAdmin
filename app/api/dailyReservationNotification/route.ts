import { Hono } from "hono";
import { handle } from "hono/vercel";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

const app = new Hono().basePath("/api");

// POST: /api/example/dailyReservationNotification
app.post("/dailyReservationNotification", async (c) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }
  const sql = neon(databaseUrl);

  const body = await c.req.json();
  console.log("Request Body:", body);

  // ✅ 替换 / 为 -，以防止无效日期格式
  const dateInput = body.currentDate.replace(/\//g, "-");

  // ✅ 构造基础日期对象
  const baseDate = new Date(dateInput);

  // ✅ 如果你想以韩国时区为基准，手动偏移+9小时
  const KST_OFFSET = 9 * 60 * 60 * 1000; // 9小时（毫秒）
  const kstDate = new Date(baseDate.getTime() + KST_OFFSET);

  const oneDayAfterDate = new Date(kstDate);
  oneDayAfterDate.setDate(oneDayAfterDate.getDate() + 1);

  const endDate = new Date(oneDayAfterDate);
  endDate.setDate(endDate.getDate() + 1);

  // ✅ 格式化为 ISO 字符串用于 timestamp 查询
  const oneDayAfterDateISO = oneDayAfterDate.toISOString().split("T")[0];
  const endDateISO = endDate.toISOString().split("T")[0];

  const startTimestamp = `${oneDayAfterDateISO}T00:00:00.000Z`;
  const endTimestamp = `${endDateISO}T00:00:00.000Z`;

  try {
    const reservation = await sql`
      SELECT * FROM "Reservation"
      WHERE "date" >= ${startTimestamp}
        AND "date" < ${endTimestamp}
      LIMIT 1000000;
    `;

    const numberOfReservations = reservation.length.toString();
    console.log("Number of reservations:", numberOfReservations);

    return c.json({
      msg_type: "text",
      content: {
        message: "success",
        numberOfReservations: numberOfReservations.toString(),
      },
    });
  } catch (error) {
    console.error("Error while querying reservations:", error);
    return c.json({
      msg_type: "text",
      content: {
        message: "error",
        numberOfReservations: "0",
      },
    });
  }
});

// make a get request to the api
app.get("/dailyReservationNotification", async (c) => {
  return c.json({
    message: "success",
  });
});

export const POST = handle(app);
export const GET = handle(app);
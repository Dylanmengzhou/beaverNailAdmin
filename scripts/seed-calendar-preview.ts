import { PrismaClient } from "@prisma/client";
import { availableSlots, SERVICES } from "../lib/studio/booking";
import { getClosedWeekdays, lockScheduling } from "../lib/studio/booking-db";

// Preview records are deliberately confined to the isolated local database.
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  database.pathname !== "/beaver_studio_test"
) {
  throw new Error(
    "Calendar previews require the isolated local beaver_studio_test database.",
  );
}
const month = process.argv.find((argument) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(argument),
);
if (!month)
  throw new Error("Usage: npm run seed:calendar -- YYYY-MM [--clear]");
const clear = process.argv.includes("--clear");
const prefix = `calendar_preview_${month.replace("-", "_")}_`;
const start = new Date(`${month}-01T00:00:00Z`);
const end = new Date(
  Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
);
const firstInstant = new Date(`${month}-01T00:00:00+09:00`);
const nextMonth = end.toISOString().slice(0, 7);
const endInstant = new Date(`${nextMonth}-01T00:00:00+09:00`);
const beforeMonth = new Date(firstInstant.getTime() - 1);
const names = [
  "林小满",
  "陈可可",
  "Yuna",
  "Mina",
  "周心怡",
  "朴善雅",
  "Elaine",
  "张一诺",
  "李知恩",
  "Hana",
  "许安然",
  "王思思",
  "Jisoo",
  "程小雨",
  "Emma",
  "赵悦",
  "刘星辰",
  "苏浅",
  "Sora",
  "Chloe",
  "金敏智",
  "郑予安",
  "Olivia",
  "周圆圆",
  "徐嘉宁",
  "Nari",
  "张梦琪",
  "何雨桐",
  "Aria",
  "李若晴",
  "夏夏",
  "Yuri",
];
const providers = ["credentials", "wechat", "google", "kakao"];
const requests = {
  nails: ["奶油色小花款", "粉紫渐变与细闪", "清透猫眼", "可爱蝴蝶结装饰"],
  makeup: ["清透日常妆", "韩系上镜妆", "柔和粉色妆容", "演唱会亮片妆"],
};
const db = new PrismaClient();

async function main() {
  try {
    if (clear) {
      const removed = await db.$transaction(async (tx) => {
        await lockScheduling(tx);
        const users = await tx.user.findMany({
          where: { id: { startsWith: prefix } },
          select: { id: true },
        });
        const reservations = await tx.reservation.deleteMany({
          where: { userId: { in: users.map((user) => user.id) } },
        });
        await tx.user.deleteMany({
          where: { id: { in: users.map((user) => user.id) } },
        });
        return reservations.count;
      });
      console.log(
        JSON.stringify({ month, removedPreviewReservations: removed }),
      );
    } else {
      const result = await db.$transaction(
        async (tx) => {
          await lockScheduling(tx);
          const closedWeekdays = await getClosedWeekdays(tx);
          const staff = await tx.nailArtist.findMany({
            where: { active: true },
            orderBy: { name: "asc" },
          });
          const off = await tx.timeOff.findMany({
            where: {
              startsAt: { lt: endInstant },
              endsAt: { gt: firstInstant },
            },
          });
          const existing = await tx.reservation.findMany({
            where: { date: { gte: start, lt: end } },
          });
          let created = 0;
          for (
            let date = new Date(start);
            date < end;
            date.setUTCDate(date.getUTCDate() + 1)
          ) {
            const day = date.toISOString().slice(0, 10);
            for (const artist of staff) {
              const services = SERVICES.filter((service) =>
                artist.services.includes(service),
              );
              if (!services.length) continue;
              const occupied = existing.filter(
                (booking) => booking.nailArtistId === artist.id,
              );
              const slots = availableSlots(
                day,
                artist,
                services[0],
                occupied,
                off,
                beforeMonth,
                closedWeekdays,
              );
              for (const [slotIndex, slot] of slots.entries()) {
                const id = `${prefix}${artist.id}_${day.slice(8)}_${slot.replace(":", "")}`;
                const service =
                  services[(date.getUTCDate() + slotIndex) % services.length];
                const style =
                  requests[service][
                    (date.getUTCDate() + slotIndex) % requests[service].length
                  ];
                await tx.user.upsert({
                  where: { id },
                  update: {},
                  create: {
                    id,
                    name: names[created % names.length],
                    provider: providers[created % providers.length],
                    email: `calendar.preview.${created + 1}@example.test`,
                    customerNote: "本地满月日历展示用顾客",
                  },
                });
                const booking = await tx.reservation.create({
                  data: {
                    date: new Date(date),
                    timeSlot: slot,
                    userId: id,
                    nailArtistId: artist.id,
                    serviceType: service,
                    durationMinutes: artist.durationMinutes,
                    isClick: created % 5 !== 0,
                    currentMemberShip: "free",
                    note: `[本地预览 ${month}] ${style}`,
                    customerRequest: `款式参考：${style}`,
                  },
                });
                existing.push(booking);
                created++;
              }
            }
          }
          // Include historical days in the preview verification; production booking rules are unchanged.
          let remaining = 0;
          for (
            let date = new Date(start);
            date < end;
            date.setUTCDate(date.getUTCDate() + 1)
          ) {
            const day = date.toISOString().slice(0, 10);
            for (const artist of staff) {
              const service = SERVICES.find((value) =>
                artist.services.includes(value),
              );
              if (service)
                remaining += availableSlots(
                  day,
                  artist,
                  service,
                  existing.filter(
                    (booking) => booking.nailArtistId === artist.id,
                  ),
                  off,
                  beforeMonth,
                closedWeekdays,
                ).length;
            }
          }
          if (remaining) throw new Error(`${remaining} slots remain unfilled`);
          const byStaff = staff.map((artist) => ({
            name: artist.name,
            count: existing.filter(
              (booking) => booking.nailArtistId === artist.id,
            ).length,
          }));
          return { created, total: existing.length, remaining, byStaff };
        },
        { timeout: 60000 },
      );
      console.log(JSON.stringify({ month, ...result }));
    }
  } finally {
    await db.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

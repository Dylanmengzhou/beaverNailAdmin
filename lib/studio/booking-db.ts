import {contentKey,studioContentSchema,DEFAULT_CONTENT} from "./content";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  DEFAULT_CLOSED_WEEKDAYS,
  forService,
  availableSlots,
  candidateSlots,
  dateKey,
  slotInstant,
  type ServiceType,
} from "./booking";
import { bookingSchema } from "./validation";
export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
type DB = Prisma.TransactionClient;
export async function getClosedWeekdays(db: DB) {
  const settings = await db.studioSchedule.findUnique({ where: { id: 1 } });
  return settings?.closedWeekdays ?? [...DEFAULT_CLOSED_WEEKDAYS];
}
export async function getAvailability(
  db: DB,
  day: string,
  staffId: string,
  service: string,
) {
  const person = await db.nailArtist.findUnique({ where: { id: staffId } });
  const saved = await db.homeContent.findUnique({where:{key:contentKey}});
  const catalog = saved?studioContentSchema.parse(saved.value):DEFAULT_CONTENT;
  if(!catalog.services.some(s=>s.id===service && s.enabled)) throw new BookingError("服务项目已停用或不存在",404);
  const staff = person && forService(person,service);
  if (!staff) throw new BookingError("员工不存在", 404);
  const [reservations, timeOff, closedWeekdays] = await Promise.all([
    db.reservation.findMany({
      where: { nailArtistId: staffId, date: new Date(`${day}T00:00:00Z`) },
      select: { date: true, timeSlot: true, durationMinutes: true },
    }),
    db.timeOff.findMany({
      where: {
        OR: [{ nailArtistId: staffId }, { nailArtistId: null }],
        startsAt: {
          lt: new Date(slotInstant(day, "00:00").getTime() + 86400000),
        },
        endsAt: { gt: slotInstant(day, "00:00") },
      },
    }),
    getClosedWeekdays(db),
  ]);
  const timeSlots = candidateSlots(day, staff, service, closedWeekdays);
  const availableTimeSlots = availableSlots(
    day,
    staff,
    service,
    reservations,
    timeOff,
    new Date(),
    closedWeekdays,
  );
  return {
    timeSlots,
    availableTimeSlots,
    unavailableTimes: timeSlots.filter(
      (time) => !availableTimeSlots.includes(time),
    ),
    durationMinutes: staff.durationMinutes,
  };
}
export async function createBooking(
  db: PrismaClient,
  input: unknown,
  userId: string,
) {
  const value = bookingSchema.parse(input);
  return db.$transaction(
    async (tx) => {
      await lockScheduling(tx);
      // All writers (bookings, staff schedules and time off) lock the same staff row.
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "NailArtist" WHERE id = ${value.nailArtistId} FOR UPDATE`;
      if (!rows.length) throw new BookingError("员工不存在", 404);
      const availability = await getAvailability(
        tx,
        value.date,
        value.nailArtistId,
        value.serviceType,
      );
      if (!availability.availableTimeSlots.includes(value.timeSlot))
        throw new BookingError("该员工在此时段不可预约，请重新选择", 409);
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new BookingError("顾客不存在", 404);
      const assets = await tx.mediaAsset.count({
        where: {
          id: { in: [...new Set(value.referenceImageIds)] },
          ownerId: userId,
          purpose: "reference",
        },
      });
      if (assets !== value.referenceImageIds.length)
        throw new BookingError("款式图片无效或不属于当前顾客");
      const reservation = await tx.reservation.create({
        data: {
          date: new Date(`${value.date}T00:00:00Z`),
          timeSlot: value.timeSlot,
          nailArtistId: value.nailArtistId,
          userId,
          currentMemberShip: user.membershipType,
          serviceType: value.serviceType,
          durationMinutes: availability.durationMinutes,
          referenceImageIds: value.referenceImageIds,
          customerRequest: value.customerRequest || null,
        },
      });
      const artist = await tx.nailArtist.findUniqueOrThrow({
        where: { id: value.nailArtistId },
      });
      return { reservation, user, artist };
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
export async function lockScheduling(tx: DB, exclusive = false) {
  if (exclusive)
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(94271631)::text`;
  else await tx.$queryRaw`SELECT pg_advisory_xact_lock_shared(94271631)::text`;
}
export async function lockAllStaff(tx: DB) {
  await lockScheduling(tx, true);
  await tx.$queryRaw`SELECT id FROM "NailArtist" ORDER BY id FOR UPDATE`;
}
export async function timeOffConflicts(
  tx: DB,
  startsAt: Date,
  endsAt: Date,
  nailArtistId: string | null,
) {
  const records = await tx.reservation.findMany({
    where: {
      ...(nailArtistId ? { nailArtistId } : {}),
      date: {
        gte: new Date(
          `${dateKey(new Date(startsAt.getTime() - 86400000))}T00:00:00Z`,
        ),
        lte: new Date(
          `${dateKey(new Date(endsAt.getTime() + 86400000))}T00:00:00Z`,
        ),
      },
    },
    select: {
      id: true,
      date: true,
      timeSlot: true,
      durationMinutes: true,
      nailArtist: { select: { name: true } },
    },
  });
  return records.filter((r) => {
    const start = slotInstant(dateKey(r.date), r.timeSlot).getTime();
    return (
      start < endsAt.getTime() &&
      startsAt.getTime() < start + r.durationMinutes * 60000
    );
  });
}
export function serviceName(service: ServiceType | string) {
  return service === "makeup" ? "化妆" : service === "nails" ? "美甲" : service;
}

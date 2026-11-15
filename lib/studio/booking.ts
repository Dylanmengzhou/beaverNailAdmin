export const SERVICES = ["nails", "makeup"] as const;
export type ServiceType = string;
export type WorkWindow = { days: number[]; start: string; end: string };
export type StaffSchedule = {
  id: string;
  active: boolean;
  services: string[];
  durationMinutes: number;
  schedule: unknown;
  serviceSettings?: unknown;
};
export type BusyPeriod = {
  startsAt: Date | string;
  endsAt: Date | string;
  nailArtistId?: string | null;
};
export type ExistingBooking = {
  date: Date | string;
  timeSlot: string;
  durationMinutes: number;
};
export const LEGACY_SCHEDULE: WorkWindow[] = [
  { days: [0, 1, 2, 3, 4, 5, 6], start: "10:00", end: "18:00" },
  { days: [0, 1, 2, 3, 4, 5, 6], start: "19:00", end: "21:00" },
];
export const isDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !isNaN(Date.parse(value)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const isTime = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const minutes = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export const clock = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export const dateKey = (date: Date | string) =>
  typeof date === "string"
    ? date.slice(0, 10)
    : date.toISOString().slice(0, 10);
export const seoulDay = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const slotInstant = (day: string, slot: string) =>
  new Date(`${day}T${slot}:00+09:00`);
export const overlaps = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) => aStart < bEnd && bStart < aEnd;
export function workWindows(staff: StaffSchedule): WorkWindow[] {
  return (
    staff.schedule === null || staff.schedule === undefined
      ? LEGACY_SCHEDULE
      : staff.schedule
  ) as WorkWindow[];
}
export function forService(staff:StaffSchedule, service:string):StaffSchedule {
 const settings=staff.serviceSettings as Record<string,{durationMinutes:number;schedule:WorkWindow[]}> | null;
 const own=settings?.[service];
 return own?{...staff,durationMinutes:own.durationMinutes,schedule:own.schedule}:staff;
}
export const DEFAULT_CLOSED_WEEKDAYS: readonly number[] = [1];
export function isWeeklyClosure(day: string, closedWeekdays: readonly number[]) {
  return closedWeekdays.includes(new Date(day + "T00:00:00Z").getUTCDay());
}
export function candidateSlots(
  day: string,
  staff: StaffSchedule,
  service: string,
  closedWeekdays: readonly number[] = DEFAULT_CLOSED_WEEKDAYS,
): string[] {
  staff=forService(staff,service);
  if (!isDay(day) || !staff.active || !staff.services.includes(service))
    return [];
  if (isWeeklyClosure(day, closedWeekdays)) return [];
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  const result = new Set<string>();
  for (const window of workWindows(staff)) {
    if (!window.days.includes(weekday)) continue;
    for (
      let start = minutes(window.start);
      start + staff.durationMinutes <= minutes(window.end);
      start += staff.durationMinutes
    )
      result.add(clock(start));
  }
  return [...result].sort();
}
export function availableSlots(
  day: string,
  staff: StaffSchedule,
  service: string,
  reservations: ExistingBooking[],
  timeOff: BusyPeriod[],
  now = new Date(),
  closedWeekdays: readonly number[] = DEFAULT_CLOSED_WEEKDAYS,
): string[] {
  staff=forService(staff,service);
  return candidateSlots(day, staff, service, closedWeekdays).filter((slot) => {
    const start = slotInstant(day, slot).getTime();
    const end = start + staff.durationMinutes * 60000;
    if (start <= now.getTime()) return false;
    if (
      reservations.some((r) => {
        const other = slotInstant(dateKey(r.date), r.timeSlot).getTime();
        return overlaps(start, end, other, other + r.durationMinutes * 60000);
      })
    )
      return false;
    return !timeOff.some(
      (off) =>
        (!off.nailArtistId || off.nailArtistId === staff.id) &&
        overlaps(
          start,
          end,
          new Date(off.startsAt).getTime(),
          new Date(off.endsAt).getTime(),
        ),
    );
  });
}

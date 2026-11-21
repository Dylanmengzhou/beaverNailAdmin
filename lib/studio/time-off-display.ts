import { forService, isWeeklyClosure, seoulDay, slotInstant, workWindows, type StaffSchedule } from "./booking";

export type TimeOff = {
  id: string;
  nailArtistId: string | null;
  nailArtist: { name: string } | null;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};
type TimeOffRange = Pick<TimeOff, "startsAt" | "endsAt">;
export type CalendarTimeOff = Omit<TimeOff, "reason">;

export const studioZone = "Asia/Seoul";

// Only whole-store breaks affect store opening status. The exclusive end also
// keeps a break ending at midnight from marking the following day as closed.
export function storeDayStatus(day:string,closedWeekdays:readonly number[],records:readonly CalendarTimeOff[]){
  if(isWeeklyClosure(day,closedWeekdays))return {kind:"closed" as const,reason:"固定店休"};
  const start=slotInstant(day,"00:00").getTime(),end=start+24*60*60*1000;
  const periods=records.filter(record=>!record.nailArtistId)
    .map(record=>[Math.max(start,Date.parse(record.startsAt)),Math.min(end,Date.parse(record.endsAt))])
    .filter(([from,to])=>from<to).sort((a,b)=>a[0]-b[0]);
  if(!periods.length)return {kind:"open" as const,reason:"没有全店休息安排，按员工排班营业"};
  let covered=start;
  for(const [from,to] of periods){if(from>covered)break;covered=Math.max(covered,to);}
  return covered>=end?{kind:"closed" as const,reason:"全天临时店休"}:{kind:"partial" as const,reason:"有部分时段的临时店休"};
}

export type RestStaff=Omit<StaffSchedule,"id">&{id?:string;name:string};
export type RestPerson={id:string;name:string;period:string;reason:string};

function periodsOnDay(day:string,records:readonly TimeOffRange[]){
 const start=slotInstant(day,"00:00").getTime(),end=start+86400000;
 const intervals=records.map(record=>[Math.max(start,Date.parse(record.startsAt)),Math.min(end,Date.parse(record.endsAt))])
  .filter(([from,to])=>from<to).sort((a,b)=>a[0]-b[0]);
 const merged:number[][]=[];
 for(const interval of intervals){const last=merged.at(-1);if(last&&interval[0]<=last[1])last[1]=Math.max(last[1],interval[1]);else merged.push([...interval]);}
 const clock=(instant:number)=>instant===end?"24:00":time.format(new Date(instant));
 return merged.map(([from,to])=>from===start&&to===end?"全天":clock(from)+"–"+clock(to));
}

export function restDayOverview(day:string,closedWeekdays:readonly number[],records:readonly CalendarTimeOff[],staff:readonly RestStaff[]){
 const store=storeDayStatus(day,closedWeekdays,records);
 const weekday=new Date(day+"T00:00:00Z").getUTCDay();
 const people:RestPerson[]=[];
 // A whole-store closure already covers everyone; list only individual leave.
 if(store.kind==="closed")return {store,people,storePeriods:periodsOnDay(day,records.filter(record=>!record.nailArtistId))};
 for(const person of staff){
  const id=person.id;
  if(!id||!person.active)continue;
  const working=person.services.some(service=>workWindows(forService({...person,id},service)).some(window=>window.days.includes(weekday)&&window.start<window.end));
  const individual=records.filter(record=>record.nailArtistId===person.id);
  const periods=periodsOnDay(day,records.filter(record=>record.nailArtistId===person.id||(!record.nailArtistId&&store.kind==="partial")));
  if(!working)people.push({id,name:person.name,period:"全天",reason:"当天无排班"});
  else if(periods.length)people.push({id,name:person.name,period:periods.join("、"),reason:store.kind==="partial"?(periodsOnDay(day,individual).length?"店休及个人休息":"临时店休"):"临时休息"});
 }
 return {store,people,storePeriods:periodsOnDay(day,records.filter(record=>!record.nailArtistId))};
}
const shortDate = new Intl.DateTimeFormat("zh-CN", {
  timeZone: studioZone,
  month: "long",
  day: "numeric",
});
const time = new Intl.DateTimeFormat("zh-CN", {
  timeZone: studioZone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function dayLabel(day: string) {
  return shortDate.format(slotInstant(day, "12:00"));
}

export function timeOffBounds(
  start: string,
  end: string,
  allDay: boolean,
  from: string,
  to: string,
) {
  const startsAt = slotInstant(start, allDay ? "00:00" : from);
  const endsAt = slotInstant(end, allDay ? "00:00" : to);
  if (allDay) endsAt.setUTCDate(endsAt.getUTCDate() + 1);
  return { startsAt, endsAt };
}

export function calendarSpan(record: TimeOffRange) {
  // The end is exclusive, so a break ending at midnight belongs to the preceding day.
  return {
    from: seoulDay(new Date(record.startsAt)),
    to: seoulDay(new Date(Date.parse(record.endsAt) - 1)),
  };
}

export function intervalLabel(record: TimeOff) {
  const { from, to } = calendarSpan(record);
  const start = new Date(record.startsAt),
    end = new Date(record.endsAt);
  const first = time.format(start),
    last = time.format(end);
  if (first === "00:00" && last === "00:00") {
    return from === to ? from + " · 全天" : from + " 至 " + to + " · 全天";
  }
  const endDay = seoulDay(end);
  return (
    from + " " + first + " – " + (from === endDay ? "" : endDay + " ") + last
  );
}

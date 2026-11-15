"use client";

import {CalendarDays,ChevronLeft,ChevronRight,MoonStar,UsersRound} from "lucide-react";
import {Button} from "@/components/ui/button";
import {MonthPicker} from "@/components/ui/month-picker";
import {dayLabel,restDayOverview, type RestStaff,type TimeOff} from "@/lib/studio/time-off-display";
import {seoulDay,slotInstant} from "@/lib/studio/booking";

const weekdays=["一","二","三","四","五","六","日"];
const key=(date:Date)=>date.toISOString().slice(0,10);
type Overview=ReturnType<typeof restDayOverview>;

function People({overview}:{overview:Overview}){
 if(overview.store.kind==="closed")return null;
 return <div className="rest-people-list">
  {overview.people.length?overview.people.map(person=><span className="rest-person-pill" key={person.id}><strong>{person.name}</strong><span>{person.period} · {person.reason}</span></span>):<span className="rest-no-people">没有店员休息，按各自排班到店。</span>}
 </div>;
}

export default function RestOverviewCalendar({weekly,records,staff,day,month,onSelect,onMonthChange}:{
 weekly:number[];records:TimeOff[];staff:RestStaff[];day:string;month:Date;onSelect:(date:Date)=>void;onMonthChange:(date:Date)=>void;
}){
 const today=seoulDay(),monthKey=seoulDay(month).slice(0,7),[year,monthNumber]=monthKey.split("-").map(Number);
 const first=new Date(Date.UTC(year,monthNumber-1,1)),offset=(first.getUTCDay()+6)%7;
 const daysInMonth=new Date(Date.UTC(year,monthNumber,0)).getUTCDate(),count=Math.ceil((offset+daysInMonth)/7)*7;
 const days=Array.from({length:count},(_,index)=>{const date=new Date(first);date.setUTCDate(1-offset+index);const value=key(date);return {value,date,overview:restDayOverview(value,weekly,records,staff)};});
 const current=restDayOverview(today,weekly,records,staff),selected=restDayOverview(day,weekly,records,staff);
 const changeMonth=(delta:number)=>{const date=new Date(Date.UTC(year,monthNumber-1+delta,1));onMonthChange(slotInstant(key(date),"12:00"));};
 const state=(overview:Overview)=>overview.store.kind==="closed"?"全店休息":overview.store.kind==="partial"?"部分时段店休":"正常营业";
 return <section className="admin-panel rest-summary-calendar" aria-label="休息日历">
  <div className="rest-summary-toolbar"><div><h2><CalendarDays size={19}/>休息日历</h2><p>直接查看每天的店休与店员休息 · 韩国时间</p></div><div className="rest-month-controls">
   <Button type="button" variant="ghost" size="icon" aria-label="上个月" onClick={()=>changeMonth(-1)}><ChevronLeft size={17}/></Button>
   <MonthPicker value={monthKey} ariaLabel="休息月份" onChange={value=>onMonthChange(slotInstant(value+"-01","12:00"))}/>
   <Button type="button" variant="ghost" size="icon" aria-label="下个月" onClick={()=>changeMonth(1)}><ChevronRight size={17}/></Button>
   <Button type="button" variant="outline" onClick={()=>onSelect(slotInstant(today,"12:00"))}>回到今天</Button>
  </div></div>
  <div className="rest-today-overview" aria-label="今天谁休息">
   <div className="rest-today-label"><span>今天 · {dayLabel(today)}</span><strong className={"store-day-status is-"+current.store.kind}>{state(current)}</strong>{current.store.kind!=="open"&&<small>{current.store.reason}{current.store.kind==="partial"?" · "+current.storePeriods.join("、"):""}</small>}</div>
   {current.store.kind!=="closed"&&<div className="rest-today-people"><h3><UsersRound size={15}/>{current.people.length?"今天休息 · "+current.people.length+" 人":"今天没有店员休息"}</h3><People overview={current}/></div>}
  </div>
  <div className="rest-month-grid" role="grid" aria-label={year+"年"+monthNumber+"月休息安排"}>
   <div className="rest-month-weekdays" role="row">{weekdays.map(label=><span role="columnheader" key={label}>周{label}</span>)}</div>
   {Array.from({length:count/7},(_,week)=><div role="row" className="rest-month-week" key={week}>{days.slice(week*7,week*7+7).map(({value,date,overview})=><div role="gridcell" key={value} className={"rest-month-cell"+(value.slice(0,7)!==monthKey?" is-outside":"")+(value===today?" is-today":"")}>
    <Button type="button" variant="ghost" className="rest-month-day" aria-pressed={value===day} aria-current={value===today?"date":undefined} aria-label={[value,value===today&&"今天",state(overview),...overview.people.map(person=>person.name+" "+person.period+"休息")].filter(Boolean).join("，")} onClick={()=>onSelect(slotInstant(value,"12:00"))}>
     <span className="rest-day-number"><strong>{date.getUTCDate()}</strong></span>
     {overview.store.kind!=="open"&&<span className={"rest-cell-store is-"+overview.store.kind}><MoonStar className="size-3"/>{overview.store.kind==="closed"?"全店休息":"临时店休"}</span>}
     <span className="rest-cell-people">{overview.people.slice(0,3).map(person=><span className="rest-cell-person" key={person.id}><b>{person.name}</b><small>{person.period}</small></span>)}{overview.people.length>3&&<small className="rest-cell-more">另 {overview.people.length-3} 人</small>}</span>
     {!!overview.people.length&&<span className="rest-cell-summary" aria-hidden="true"><b>{overview.people[0].name}</b>{overview.people.length>1&&<small>+{overview.people.length-1}</small>}</span>}
    </Button>
   </div>)}</div>)}
  </div>
  {day!==today&&<div className="rest-selected-summary" aria-label="所选日期休息详情"><div><strong>{day} · {state(selected)}</strong><span>{selected.store.kind==="partial"?selected.storePeriods.join("、"):selected.store.reason}</span></div><People overview={selected}/></div>}
  <p className="rest-calendar-footnote">全店全天休息统一标记。点选日期查看完整休息信息；调整安排请返回休息列表，进入对应卡片。</p>
 </section>;
}

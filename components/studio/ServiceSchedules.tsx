"use client";

import {Clock3,Plus,Trash2} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {TimePicker} from "@/components/admin/FormControls";
import type {WorkWindow} from "@/lib/studio/booking";

export type Settings=Record<string,{durationMinutes:number;schedule:WorkWindow[]}>;
export default function ServiceSchedules({services,names,value,legacy,duration,onChange,busy}:{
 services:string[];names:Record<string,string>;value?:Settings;legacy:WorkWindow[];duration:number;onChange:(settings:Settings)=>void;busy:boolean;
}){
 const resolved=Object.fromEntries(services.map(key=>[key,value?.[key]||{durationMinutes:duration,schedule:legacy}]));
 const change=(key:string,update:(value:Settings[string])=>void)=>{const next=structuredClone(resolved);update(next[key]);onChange(next);};
 return <div className="content-stack">{services.map(key=><section className="content-section service-schedule-card" key={key}>
  <div className="content-section-title"><span className="content-panel-icon"><Clock3 size={18}/></span><div><h3>{names[key]||key}</h3><p className="admin-field-help">这个项目的独立工作时段</p></div></div>
  <div className="admin-field service-duration-field"><Label htmlFor={"duration-"+key}>每次服务时长 · 分钟</Label><Input id={"duration-"+key} type="number" min={30} max={480} step={15} value={resolved[key].durationMinutes} disabled={busy} onChange={event=>change(key,value=>{value.durationMinutes=Number(event.target.value);})}/></div>
  {resolved[key].schedule.map((window,index)=><div className="schedule-window" key={index}>
   <div className="schedule-window-top"><strong>工作时段 {String(index+1).padStart(2,"0")}</strong><Button aria-label={"删除"+key+"工作时段"+(index+1)} variant="ghost" size="icon" disabled={busy} onClick={()=>change(key,value=>{value.schedule.splice(index,1);})}><Trash2 size={14}/></Button></div>
   <div className="weekday-picker" role="group" aria-label={(names[key]||key)+"工作日"}>
    {["日","一","二","三","四","五","六"].map((name,day)=><Button type="button" variant="ghost" size="icon" key={day} disabled={busy} aria-label={"周"+name} aria-pressed={window.days.includes(day)} onClick={()=>change(key,value=>{const days=value.schedule[index].days;value.schedule[index].days=days.includes(day)?days.filter(existing=>existing!==day):[...days,day].sort();})}>{name}</Button>)}
   </div>
   <div className="schedule-time-fields">
    <div className="admin-field"><Label htmlFor={key+"-start-"+index}>上班时间</Label><TimePicker id={key+"-start-"+index} value={window.start} disabled={busy} label={(names[key]||key)+"上班时间 "+(index+1)} onChange={time=>change(key,value=>{value.schedule[index].start=time;})}/></div>
    <span>—</span>
    <div className="admin-field"><Label htmlFor={key+"-end-"+index}>下班时间</Label><TimePicker id={key+"-end-"+index} value={window.end} disabled={busy} label={(names[key]||key)+"下班时间 "+(index+1)} onChange={time=>change(key,value=>{value.schedule[index].end=time;})}/></div>
   </div>
  </div>)}
  <Button variant="outline" className="content-add-button" disabled={busy} onClick={()=>change(key,value=>{value.schedule.push({days:[2,3,4,5,6,0],start:"10:00",end:"18:00"});})}><Plus size={14}/>增加{names[key]||key}时段</Button>
 </section>)}<p className="admin-field-help">每项服务分别排班。同一员工的预约会互相占用时间，门店休息安排对所有项目生效。</p></div>;
}

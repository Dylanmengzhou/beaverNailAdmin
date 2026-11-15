"use client";

import {useState} from "react";
import {Plus,Trash2} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {TimePicker} from "@/components/admin/FormControls";
import type {WorkWindow} from "@/lib/studio/booking";

export type Settings=Record<string,{durationMinutes:number;schedule:WorkWindow[]}>;
const weekdays=[{day:1,name:"一"},{day:2,name:"二"},{day:3,name:"三"},{day:4,name:"四"},{day:5,name:"五"},{day:6,name:"六"},{day:0,name:"日"}];
export default function ServiceSchedules({services,names,value,legacy,duration,onChange,busy}:{
 services:string[];names:Record<string,string>;value?:Settings;legacy:WorkWindow[];duration:number;onChange:(settings:Settings)=>void;busy:boolean;
}){
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const resolved=Object.fromEntries(services.map(key=>[key,value?.[key]||{durationMinutes:duration,schedule:legacy}]));
 const change=(key:string,update:(value:Settings[string])=>void)=>{const next=structuredClone({...value,...resolved});update(next[key]);onChange(next);};
 return <div className="service-schedules">{services.map((key,serviceIndex)=><details className="editor-secondary-section service-schedule-details" key={key} open={expanded[key]??serviceIndex===0} onToggle={event=>{const open=event.currentTarget.open;setExpanded(previous=>previous[key]===open?previous:{...previous,[key]:open});}}>
  <summary><strong>{names[key]||key}</strong><span>{resolved[key].durationMinutes} 分钟 · {resolved[key].schedule.length} 个时段</span></summary>
  <div className="editor-secondary-content">
   <div className="admin-field service-duration-field"><Label htmlFor={"duration-"+key}>每次服务时长 · 分钟</Label><Input id={"duration-"+key} type="number" min={30} max={480} step={15} value={resolved[key].durationMinutes} disabled={busy} onChange={event=>change(key,value=>{value.durationMinutes=Number(event.target.value);})}/></div>
   {resolved[key].schedule.map((window,index)=><div className="schedule-window" key={index}>
    <div className="schedule-window-top"><strong>时段 {index+1}</strong><Button type="button" aria-label={"删除"+key+"工作时段"+(index+1)} variant="ghost" size="icon" disabled={busy} onClick={()=>change(key,value=>{value.schedule.splice(index,1);})}><Trash2 size={14}/></Button></div>
    <div className="weekday-picker" role="group" aria-label={(names[key]||key)+"工作日"}>
     {weekdays.map(({name,day})=><Button type="button" variant="ghost" size="icon" key={day} disabled={busy} aria-label={"周"+name} aria-pressed={window.days.includes(day)} onClick={()=>change(key,value=>{const days=value.schedule[index].days;value.schedule[index].days=days.includes(day)?days.filter(existing=>existing!==day):[...days,day].sort();})}>{name}</Button>)}
    </div>
    <div className="schedule-time-fields">
     <div className="admin-field"><Label htmlFor={key+"-start-"+index}>上班时间</Label><TimePicker id={key+"-start-"+index} value={window.start} disabled={busy} label={(names[key]||key)+"上班时间 "+(index+1)} onChange={time=>change(key,value=>{value.schedule[index].start=time;})}/></div>
     <div className="admin-field"><Label htmlFor={key+"-end-"+index}>下班时间</Label><TimePicker id={key+"-end-"+index} value={window.end} disabled={busy} label={(names[key]||key)+"下班时间 "+(index+1)} onChange={time=>change(key,value=>{value.schedule[index].end=time;})}/></div>
    </div>
   </div>)}
   <Button type="button" variant="outline" disabled={busy} onClick={()=>change(key,value=>{value.schedule.push({days:[2,3,4,5,6,0],start:"10:00",end:"18:00"});})}><Plus size={14}/>添加时段</Button>
  </div>
 </details>)}<p className="editor-field-note">各项目分别排班；预约时间互相占用，门店休息对全部项目生效。</p></div>;
}

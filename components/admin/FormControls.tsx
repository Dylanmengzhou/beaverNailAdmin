"use client";

import {useId, useRef, useState, type ComponentProps, type ReactNode} from "react";
import {CalendarDays, Clock3, Upload, Loader2, ImagePlus} from "lucide-react";
import {zhCN} from "react-day-picker/locale/zh-CN";
import {Button} from "@/components/ui/button";
import {Calendar} from "@/components/ui/calendar";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {cn} from "@/lib/utils";

export function AdminSelect({value,onValueChange,options,label,id,className,disabled,placeholder="请选择"}:{
  value:string;
  onValueChange:(value:string)=>void;
  options:{value:string;label:ReactNode}[];
  label:string;
  id?:string;
  className?:string;
  disabled?:boolean;
  placeholder?:string;
}) {
  return <Select value={value || "__empty__"} onValueChange={value=>onValueChange(value==="__empty__"?"":value)} disabled={disabled}>
    <SelectTrigger id={id} aria-label={label} className={cn("admin-select",className)}><SelectValue placeholder={placeholder}/></SelectTrigger>
    <SelectContent position="popper" className="admin-select-options">
      {options.map(option=><SelectItem value={option.value || "__empty__"} key={option.value}>{option.label}</SelectItem>)}
    </SelectContent>
  </Select>;
}

export function TextField({label,hint,...props}:{label:string;hint?:string}&ComponentProps<typeof Input>){
  const generated=useId(),id=props.id || generated;
  return <div className="admin-field"><Label htmlFor={id}>{label}</Label><Input {...props} id={id}/>{hint&&<p className="admin-field-help">{hint}</p>}</div>;
}

export function SettingSwitch({label,description,checked,onCheckedChange,disabled,id}:{
  label:string;description?:string;checked:boolean;onCheckedChange:(checked:boolean)=>void;disabled?:boolean;id?:string;
}){
  const generated=useId(),controlId=id || generated;
  return <div className="admin-setting-row"><div><Label htmlFor={controlId}>{label}</Label>{description&&<p>{description}</p>}</div><Switch id={controlId} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled}/></div>;
}

export function TimePicker({value,onChange,label,disabled,id}:{value:string;onChange:(value:string)=>void;label:string;disabled?:boolean;id?:string}){
  const hour=value.slice(0,2)||"00",minute=value.slice(3,5)||"00";
  const options=(count:number)=>Array.from({length:count},(_,i)=>{const number=String(i).padStart(2,"0");return {value:number,label:number};});
  return <div className="admin-time-picker" role="group" aria-label={label}>
    <Clock3 size={15} aria-hidden="true"/>
    <AdminSelect id={id} value={hour} onValueChange={h=>onChange(h+":"+minute)} options={options(24)} label={label+" · 小时"} disabled={disabled}/>
    <span aria-hidden="true">:</span>
    <AdminSelect value={minute} onValueChange={m=>onChange(hour+":"+m)} options={options(60)} label={label+" · 分钟"} disabled={disabled}/>
  </div>;
}

const dayKey=(date:Date)=>date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
const parseDay=(value?:string)=>value?new Date(value+"T12:00:00"):undefined;
export function DatePicker({value,onChange,min,max,label,id,disabled}:{
 value:string;onChange:(value:string)=>void;min?:string;max?:string;label:string;id?:string;disabled?:boolean;
}){
 const [open,setOpen]=useState(false);
 return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild>
   <Button type="button" variant="outline" id={id} className={cn("admin-date-trigger",!value&&"is-empty")} disabled={disabled} aria-label={label}>
     <CalendarDays size={16}/><span>{value || "选择日期"}</span>
   </Button>
 </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
   <Calendar mode="single" locale={zhCN} weekStartsOn={1} selected={parseDay(value)} defaultMonth={parseDay(value||min)} disabled={date=>(!!min&&dayKey(date)<min)||(!!max&&dayKey(date)>max)} onSelect={date=>{if(date){onChange(dayKey(date));setOpen(false);}}} autoFocus/>
 </PopoverContent></Popover>;
}

export function ImageUpload({label="上传图片",description="JPG、PNG 或 WebP，最大 4MB",disabled,busy,onFile}:{
 label?:string;description?:string;disabled?:boolean;busy?:boolean;onFile:(file:File)=>void|Promise<void>;
}){
 const id=useId(),fileInput=useRef<HTMLInputElement>(null);
 return <div className={cn("admin-image-upload",(disabled||busy)&&"is-disabled")}>
   <span className="admin-upload-icon">{busy?<Loader2 className="animate-spin" size={23}/>:<ImagePlus size={23}/>}</span>
   <div><strong>{busy?"正在上传…":label}</strong><p>{description}</p></div>
   <Button type="button" variant="outline" size="sm" disabled={disabled||busy} onClick={()=>fileInput.current?.click()}><Upload size={14}/>选择图片</Button>
   <input ref={fileInput} hidden id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||busy} aria-label={label} onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void onFile(file);}}/>
 </div>;
}

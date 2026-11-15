"use client";

import {Plus, Trash2} from "lucide-react";
import {AdminSelect, SettingSwitch, TextField} from "@/components/admin/FormControls";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import type {CatalogService} from "@/lib/studio/content";

const empty=()=>({zh:"",en:"",kr:""});
const themes=[{value:"pink",label:"粉色"},{value:"yellow",label:"黄色"},{value:"lilac",label:"紫色"},{value:"mint",label:"绿色"}];

export default function ProjectEditor({service,lang,busy,onChange,onDelete,isDraft}:{
 service:CatalogService;lang:"zh"|"en"|"kr";busy:boolean;onChange:(update:(service:CatalogService)=>void)=>void;onDelete:()=>void;isDraft:boolean;
}){
 const field=(label:string,value:string,change:(text:string)=>void)=>
  <TextField label={label} value={value} disabled={busy} onChange={event=>change(event.target.value)}/>;
 return <div className="content-stack project-editor">
  <section className="content-section">
   <div className="content-section-title"><h3>项目信息</h3></div>
   {field("项目名称",service.names[lang],text=>onChange(value=>{value.names[lang]=text;}))}
   <div className="admin-field"><Label htmlFor="service-theme">主题颜色</Label><AdminSelect id="service-theme" label="主题颜色" value={service.theme} disabled={busy} onValueChange={theme=>onChange(value=>{value.theme=theme as CatalogService["theme"];})} options={themes.map(theme=>({value:theme.value,label:<span className="theme-option"><i className={"theme-dot theme-"+theme.value}/>{theme.label}</span>}))}/></div>
   <SettingSwitch label="开放顾客预约" description="关闭后停止接受新预约，已有订单仍会保留。" checked={service.enabled} disabled={busy} onCheckedChange={enabled=>onChange(value=>{value.enabled=enabled;})}/>
   <p className="content-tip">员工、服务时长和工作时段在「员工与排班」中分别设置。</p>
  </section>
  <div className="project-editor-section-heading"><h3>价格菜单</h3><p>价格分组、项目和说明会一起展示在顾客端。</p></div>
  {service.sections.map((section,sectionIndex)=><section className="content-section" key={section.id}>
   <div className="content-section-title"><span className="content-section-number">{String(sectionIndex+1).padStart(2,"0")}</span><h3>价格分组</h3><Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={"删除分组 "+(section.title.zh||String(sectionIndex+1))} onClick={()=>onChange(value=>{value.sections.splice(sectionIndex,1);})}><Trash2 size={15}/></Button></div>
   {field("分组名称",section.title[lang],text=>onChange(value=>{value.sections[sectionIndex].title[lang]=text;}))}
   {field("补充说明",section.subtitle[lang],text=>onChange(value=>{value.sections[sectionIndex].subtitle[lang]=text;}))}
   <div className="price-edit-list">{section.items.map((row,rowIndex)=><div className="price-edit-row" key={row.id}>
    {field("项目",row.name[lang],text=>onChange(value=>{value.sections[sectionIndex].items[rowIndex].name[lang]=text;}))}
    {field("价格 · 韩元",row.price,text=>onChange(value=>{value.sections[sectionIndex].items[rowIndex].price=text;}))}
    {field("说明",row.note[lang],text=>onChange(value=>{value.sections[sectionIndex].items[rowIndex].note[lang]=text;}))}
    <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={"删除价格项目 "+(row.name.zh||String(rowIndex+1))} onClick={()=>onChange(value=>{value.sections[sectionIndex].items.splice(rowIndex,1);})}><Trash2 size={14}/></Button>
   </div>)}</div>
   <Button type="button" variant="outline" disabled={busy} className="content-add-button" onClick={()=>onChange(value=>{value.sections[sectionIndex].items.push({id:crypto.randomUUID(),name:empty(),price:"0",note:empty()});})}><Plus size={14}/>增加价格项目</Button>
  </section>)}
  <Button type="button" variant="outline" disabled={busy} className="content-add-button" onClick={()=>onChange(value=>{value.sections.push({id:crypto.randomUUID(),title:empty(),subtitle:empty(),items:[]});})}><Plus size={14}/>增加价格分组</Button>
  <section className="content-section content-reminders">
   <div className="content-section-title"><h3>提醒事项</h3><span>{service.notes.length} 条</span></div>
   <p className="admin-field-help">包含结算方式、附加税和到店提醒，显示在当前项目价格表下方。</p>
   {service.notes.map((note,noteIndex)=><div className="reminder-edit-row" key={noteIndex}><div className="admin-field"><Label htmlFor={"price-note-"+noteIndex}>提醒 {noteIndex+1}</Label><Textarea id={"price-note-"+noteIndex} disabled={busy} value={note[lang]} rows={2} onChange={event=>onChange(value=>{value.notes[noteIndex][lang]=event.target.value;})}/></div><Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={"删除提醒 "+(noteIndex+1)} onClick={()=>onChange(value=>{value.notes.splice(noteIndex,1);})}><Trash2 size={14}/></Button></div>)}
   <Button type="button" variant="outline" disabled={busy} className="content-add-button" onClick={()=>onChange(value=>{value.notes.push(empty());})}><Plus size={14}/>增加提醒</Button>
  </section>
  <section className="content-section">
   <div className="content-section-title"><h3>{isDraft?"放弃创建":"删除项目"}</h3></div>
   <p className="admin-field-help">{isDraft?"这个项目尚未保存，可以直接放弃创建。":"删除项目及其价格菜单和提醒事项。有预约记录的项目请关闭上方的“开放顾客预约”，保留已有订单。"}</p>
   <Button type="button" variant="destructive" disabled={busy} onClick={onDelete}><Trash2 size={15}/>{isDraft?"放弃创建":"删除整个项目"}</Button>
  </section>
 </div>;
}

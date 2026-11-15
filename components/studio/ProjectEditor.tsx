"use client";

import {useState} from "react";
import {Plus,Trash2} from "lucide-react";
import {AdminSelect,SettingSwitch,TextField} from "@/components/admin/FormControls";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {Tabs,TabsContent,TabsList,TabsTrigger} from "@/components/ui/tabs";
import CommissionRules from "./CommissionRules";
import type {CatalogService} from "@/lib/studio/content";

const empty=()=>({zh:"",en:"",kr:""});
const themes=[{value:"pink",label:"粉色"},{value:"yellow",label:"黄色"},{value:"lilac",label:"紫色"},{value:"mint",label:"绿色"}];
export type ProjectPanel="prices"|"commission"|"settings";

export default function ProjectEditor({service,lang,busy,onChange,onDelete,isDraft,panel,onPanelChange}:{
 service:CatalogService;lang:"zh"|"en"|"kr";busy:boolean;onChange:(update:(service:CatalogService)=>void)=>void;onDelete:()=>void;isDraft:boolean;
 panel:ProjectPanel;onPanelChange:(value:ProjectPanel)=>void;
}){
 const [expanded,setExpanded]=useState<string[]>(service.sections[0]?[service.sections[0].id]:[]);
 const [editingGroups,setEditingGroups]=useState<string[]>([]);
 const field=(label:string,value:string,change:(text:string)=>void)=><TextField label={label} value={value} disabled={busy} onChange={event=>change(event.target.value)}/>;
 const addGroup=()=>{
  const id=crypto.randomUUID();setExpanded(value=>[...value,id]);setEditingGroups(value=>[...value,id]);
  onChange(value=>{value.sections.push({id,title:empty(),subtitle:empty(),items:[]});});
 };
 return <Tabs value={panel} onValueChange={value=>onPanelChange(value as ProjectPanel)} className="compact-editor-tabs">
  <TabsList aria-label="项目设置分类"><TabsTrigger value="prices">价格表</TabsTrigger><TabsTrigger value="commission">提成规则</TabsTrigger><TabsTrigger value="settings">基本设置</TabsTrigger></TabsList>
  <TabsContent value="prices" forceMount>
   <div className="editor-section-toolbar"><span>{service.sections.length} 个分组 · {service.sections.reduce((count,group)=>count+group.items.length,0)} 项价格 · 韩元</span><Button variant="outline" type="button" disabled={busy} onClick={addGroup}><Plus size={14}/>添加分组</Button></div>
   <div className="price-group-list">
    {service.sections.map((group,groupIndex)=><details className="price-group" key={group.id} open={expanded.includes(group.id)} onToggle={event=>{const open=event.currentTarget.open;setExpanded(value=>open===value.includes(group.id)?value:open?[...value,group.id]:value.filter(id=>id!==group.id));}}>
     <summary><strong>{group.title[lang]||group.title.zh||"未命名分组"}</strong><span>{group.items.length} 项</span></summary>
     <div className="price-group-content">
      {!!group.items.length&&<div className="price-item-head" aria-hidden="true"><span>项目</span><span>价格 · 韩元</span><span>说明</span><span/></div>}
      {group.items.map((row,rowIndex)=><div className="price-item-row" key={row.id}>
       <Input aria-label={"项目名称 "+(groupIndex+1)+"-"+(rowIndex+1)} placeholder="项目名称" value={row.name[lang]} disabled={busy} onChange={event=>onChange(value=>{value.sections[groupIndex].items[rowIndex].name[lang]=event.target.value;})}/>
       <Input aria-label={"价格 · 韩元 "+(groupIndex+1)+"-"+(rowIndex+1)} placeholder="价格" value={row.price} disabled={busy} onChange={event=>onChange(value=>{value.sections[groupIndex].items[rowIndex].price=event.target.value;})}/>
       <Input aria-label={"价格说明 "+(groupIndex+1)+"-"+(rowIndex+1)} placeholder="补充说明（可选）" value={row.note[lang]} disabled={busy} onChange={event=>onChange(value=>{value.sections[groupIndex].items[rowIndex].note[lang]=event.target.value;})}/>
       <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={"删除价格项目 "+(row.name[lang]||String(rowIndex+1))} onClick={()=>onChange(value=>{value.sections[groupIndex].items.splice(rowIndex,1);})}><Trash2 size={14}/></Button>
      </div>)}
      {!group.items.length&&<p className="editor-empty">这个分组还没有价格项目</p>}
      <div className="editor-section-toolbar"><Button variant="ghost" type="button" disabled={busy} onClick={()=>onChange(value=>{value.sections[groupIndex].items.push({id:crypto.randomUUID(),name:empty(),price:"0",note:empty()});})}><Plus size={14}/>添加价格</Button></div><details className="price-group-settings" open={editingGroups.includes(group.id)} onToggle={event=>{const open=event.currentTarget.open;setEditingGroups(value=>open===value.includes(group.id)?value:open?[...value,group.id]:value.filter(id=>id!==group.id));}}><summary>分组设置</summary><div className="editor-form-grid">{field("分组名称",group.title[lang],text=>onChange(value=>{value.sections[groupIndex].title[lang]=text;}))}{field("补充说明",group.subtitle[lang],text=>onChange(value=>{value.sections[groupIndex].subtitle[lang]=text;}))}</div><Button variant="ghost" type="button" className="editor-danger-link" disabled={busy} onClick={()=>onChange(value=>{value.sections.splice(groupIndex,1);})}>删除分组</Button></details>
     </div>
    </details>)}
   </div>
   {!service.sections.length&&<p className="editor-empty">还没有价格分组，点击添加分组开始编辑。</p>}
  </TabsContent>
  <TabsContent value="commission" forceMount>
   {isDraft?<p className="editor-empty">先保存项目，再设置提成规则。</p>:<CommissionRules serviceId={service.id} editable/>}
  </TabsContent>
  <TabsContent value="settings" forceMount>
   <section className="editor-form-section" aria-label="项目信息">
    <div className="editor-form-grid">{field("项目名称",service.names[lang],text=>onChange(value=>{value.names[lang]=text;}))}<div className="admin-field"><Label htmlFor="service-theme">主题颜色</Label><AdminSelect id="service-theme" label="主题颜色" value={service.theme} disabled={busy} onValueChange={theme=>onChange(value=>{value.theme=theme as CatalogService["theme"];})} options={themes}/></div></div>
    <SettingSwitch label="开放顾客预约" checked={service.enabled} disabled={busy} onCheckedChange={enabled=>onChange(value=>{value.enabled=enabled;})}/>
   </section>
   <details className="editor-secondary-section"><summary>到店提醒<span>{service.notes.length} 条</span></summary><div className="editor-secondary-content">
    {service.notes.map((note,index)=><div className="reminder-edit-row" key={index}><div className="admin-field"><Label htmlFor={"price-note-"+index}>提醒 {index+1}</Label><Textarea id={"price-note-"+index} disabled={busy} value={note[lang]} rows={2} onChange={event=>onChange(value=>{value.notes[index][lang]=event.target.value;})}/></div><Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={"删除提醒 "+(index+1)} onClick={()=>onChange(value=>{value.notes.splice(index,1);})}><Trash2 size={14}/></Button></div>)}
    <Button type="button" variant="outline" disabled={busy} onClick={()=>onChange(value=>{value.notes.push(empty());})}><Plus size={14}/>添加提醒</Button>
   </div></details>
   <div className="editor-danger-zone"><p>员工和工作时段可在「员工与排班」中设置。</p><Button type="button" variant="ghost" className="editor-danger-link" disabled={busy} onClick={onDelete}>{isDraft?"放弃创建":"删除项目"}</Button></div>
  </TabsContent>
 </Tabs>;
}

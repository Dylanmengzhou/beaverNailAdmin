"use client";

import {useEffect, useState} from "react";
import dynamic from "next/dynamic";
import {useRouter,useSearchParams} from "next/navigation";
import {ArrowLeft, Check, FileText, Loader2, Paintbrush2, Plus, Save, Sparkles, Trash2} from "lucide-react";
import {toast} from "sonner";
import {adminApi} from "@/lib/admin-api";
import {useAdminSession} from "@/components/admin/AdminShell";
import {useUnsavedChanges} from "@/components/admin/UnsavedChanges";
import {PageHeading, PanelState} from "@/components/admin/PageHeading";
import {AdminSelect, TextField} from "@/components/admin/FormControls";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogTitle} from "@/components/ui/dialog";
import {EntryCard} from "@/components/admin/EntryCard";
import ProjectEditor from "@/components/studio/ProjectEditor";
import ContentPreview from "@/components/studio/ContentPreview";
import EventCard from "@/components/studio/EventCard";
import PosterEditor from "@/components/studio/PosterEditor";
import {Label} from "@/components/ui/label";
import {studioContentSchema, type StudioContent, type CatalogService} from "@/lib/studio/content";

const Editor=dynamic(()=>import("@/components/studio/DocumentEditor"),{ssr:false,loading:()=> <p className="simple-chart-state" role="status">正在打开文档…</p>});
const empty=()=>({zh:"",en:"",kr:""});
const views={
  services:{title:"项目与价格",description:"选择一个项目，统一管理项目信息、价格菜单和到店提醒。"},
  about:{title:"关于我们",description:"把工作室的故事写下来，点击预览查看顾客端的实际效果。"},
  events:{title:"近期活动",description:"上传活动海报，按原比例展示在网页和小程序中。"},
  contact:{title:"门店联系方式",description:"统一维护到店地址、联系渠道和收款信息。"},
} as const;
type View=keyof typeof views;
type Language="zh"|"en"|"kr";
type StudioEvent=StudioContent["events"][number];
const languages=[{value:"zh",label:"中文"},{value:"en",label:"English"},{value:"kr",label:"한국어"}];
const contactFields=[
  {title:"到店信息",hint:"用于顾客端的门店介绍和地址复制。",fields:[["address","门店地址"],["phone","联系电话"]]},
  {title:"联系渠道",hint:"顾客可以在联系我们页面查看并复制。",fields:[["wechat","微信"],["instagram","Instagram"],["redbook","小红书"],["email","电子邮箱"]]},
  {title:"收款信息",hint:"显示在预约确认和订单详情中，请核对账号后保存。",fields:[["bankName","收款银行"],["bankAccount","收款账号"],["bankHolder","收款人"]]},
];

export default function ContentManager(){
  const session=useAdminSession(),params=useSearchParams(),router=useRouter();
  const requestedView=params.get("view")==="prices"?"services":params.get("view");
  const view:View=Object.hasOwn(views,requestedView||"")?requestedView as View:"about";
  const projectId=params.get("project"),chosen=projectId||"nails";
  const eventId=params.get("event");
  const openProject=(id?:string)=>{
    const next=new URLSearchParams(params.toString());next.set("view","services");
    if(id)next.set("project",id);else next.delete("project");
    next.delete("create");
    confirmNavigation(()=>router.push("/dashboard/content?"+next.toString()));
  };
  const [content,setContent]=useState<StudioContent>();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState("");
  const [draftProject,setDraftProject]=useState<CatalogService>();
  const [draftEvent,setDraftEvent]=useState<StudioEvent>();
  const [deletingEvent,setDeletingEvent]=useState<StudioEvent>();
  const [eventDeleteError,setEventDeleteError]=useState("");
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [deleteError,setDeleteError]=useState("");
  const [lang,setLang]=useState<Language>("zh");
  const dirty=!!content&&(JSON.stringify(content)!==saved||!!draftProject||!!draftEvent);
  const confirmNavigation=useUnsavedChanges(dirty,()=>{
    if(saved)setContent(JSON.parse(saved));
    setDraftProject(undefined);
    setDraftEvent(undefined);
  });


  useEffect(()=>{
    if(params.get("view")==="prices"){
      const next=new URLSearchParams(params.toString());next.set("view","services");next.set("project",projectId||"nails");
      router.replace("/dashboard/content?"+next.toString());
    }
  },[params,projectId,router]);
  useEffect(()=>{
    const control=new AbortController();
    void adminApi<StudioContent>("/api/studio/content",{signal:control.signal}).then(value=>{
      setContent(value);setSaved(JSON.stringify(value));
      if(params.get("create")==="1"){
        const next=new URLSearchParams(params.toString());next.delete("create");
        if(!value.services.some(service=>service.id===projectId))next.delete("project");
        if(!value.events.some(event=>event.id===eventId))next.delete("event");
        router.replace("/dashboard/content?"+next.toString());
      }
    }).catch(error=>{if(!control.signal.aborted)setError(error.message);});
    return()=>control.abort();
  },[]);

  const update=(fn:(value:StudioContent)=>void)=>setContent(value=>{
    if(!value)return value;
    const next=structuredClone(value);fn(next);return next;
  });

  const save=async()=>{
    if(!content)return;
    if(view==="events"&&eventId&&!(draftEvent?.image||content.events.find(event=>event.id===eventId)?.image)){toast.error("请先上传活动图片");return;}
    const parsed=studioContentSchema.safeParse({...content,services:draftProject?[...content.services,draftProject]:content.services,events:draftEvent?[...content.events,draftEvent]:content.events});
    if(!parsed.success){toast.error(parsed.error.issues.map(issue=>issue.message).join("；"));return;}
    setBusy(true);
    try{
      const value=await adminApi<StudioContent>("/api/studio/content",{
        method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data),
      });
      setContent(value);setSaved(JSON.stringify(value));setDraftProject(undefined);setDraftEvent(undefined);
      if(draftProject||draftEvent){const next=new URLSearchParams(params.toString());next.delete("create");router.replace("/dashboard/content?"+next.toString());}
      toast.success("已保存，顾客端刷新后生效");
    }catch(error){toast.error(error instanceof Error?error.message:"保存失败");}
    finally{setBusy(false);}
  };
  const uploadImage=async(file:File)=>{
    if(file.size>4*1024*1024){toast.error("请选择 4MB 以内的图片");return;}
    setBusy(true);
    try{
      const body=new FormData();body.set("file",file);body.set("purpose","home");
      const result=await adminApi<{url:string}>("/api/media",{method:"POST",body});
      return result.url;
    }catch(error){toast.error(error instanceof Error?error.message:"上传失败");}
    finally{setBusy(false);}
  };
  const upload=async(file:File,id:string)=>{
    const url=await uploadImage(file);if(!url)return;
    if(draftEvent?.id===id)setDraftEvent(value=>value?{...value,image:url}:value);
    else update(value=>{const event=value.events.find(event=>event.id===id);if(event)event.image=url;});
  };

  if(error)return <PanelState title={error}><Button variant="outline" onClick={()=>location.reload()}>重新加载</Button></PanelState>;
  if(!content||!session)return <PanelState loading title="正在读取门店内容…"/>;
  if(session.memberType!=="manager")return <PanelState title="此页面仅管理员可以编辑"/>;
  const index=Math.max(0,content.services.findIndex(service=>service.id===chosen));
  const service=draftProject?.id===projectId?draftProject:content.services[index];
  const projectOverview=view==="services"&&!projectId,eventOverview=view==="events"&&!eventId;
  const overview=projectOverview||eventOverview;
  const eventLabel=(item:StudioEvent)=>"活动图片 "+(content.events.findIndex(event=>event.id===item.id)+1||content.events.length+1);
  const eventIndex=content.events.findIndex(event=>event.id===eventId);
  const event=draftEvent?.id===eventId?draftEvent:content.events[eventIndex];
  if(view==="services"&&projectId&&draftProject?.id!==projectId&&!content.services.some(service=>service.id===projectId))
    return <PanelState title="这个项目已不存在"><Button variant="outline" onClick={()=>openProject()}>返回项目列表</Button></PanelState>;
  const openEvent=(id?:string)=>confirmNavigation(()=>router.push("/dashboard/content?view=events"+(id?"&event="+encodeURIComponent(id):"")));
  if(view==="events"&&eventId&&!event)return <PanelState title="这个活动已不存在"><Button variant="outline" onClick={()=>openEvent()}>返回活动列表</Button></PanelState>;
  const field=(label:string,value:string,onChange:(value:string)=>void,hint?:string)=>
    <TextField label={label} value={value} onChange={event=>onChange(event.target.value)} disabled={busy} hint={hint}/>;
  const addService=()=>confirmNavigation(()=>{
    const id="service_"+Date.now().toString(36);
    setDraftProject({id,names:{zh:"新服务",en:"New service",kr:"새 서비스"},theme:"pink",enabled:true,sections:[],notes:[]});
    const next=new URLSearchParams(params.toString());next.set("view","services");next.set("project",id);next.set("create","1");
    router.push("/dashboard/content?"+next.toString());
  });
  const updateProject=(fn:(value:CatalogService)=>void)=>{
    if(draftProject?.id===projectId)setDraftProject(value=>{if(!value)return value;const next=structuredClone(value);fn(next);return next;});
    else update(value=>fn(value.services[index]));
  };
  const addEvent=()=>confirmNavigation(()=>{
    const id=crypto.randomUUID();setDraftEvent({id,title:empty(),body:empty(),image:"",enabled:true});
    router.push("/dashboard/content?view=events&event="+id+"&create=1");
  });
  const updateEvent=(fn:(value:StudioEvent)=>void)=>{
    if(draftEvent?.id===eventId)setDraftEvent(value=>{if(!value)return value;const next=structuredClone(value);fn(next);return next;});
    else update(value=>fn(value.events[eventIndex]));
  };
  const deleteEvent=async()=>{
    if(!deletingEvent)return;
    setBusy(true);setEventDeleteError("");
    try{
      const draft=draftEvent?.id===deletingEvent.id;
      if(draft)setDraftEvent(undefined);
      else{
        const value=await adminApi<StudioContent>("/api/studio/content?event="+encodeURIComponent(deletingEvent.id),{method:"DELETE"});
        setContent(value);setSaved(JSON.stringify(value));
      }
      setDeletingEvent(undefined);router.replace("/dashboard/content?view=events");
      toast.success(draft?"已放弃创建":"活动已删除");
    }catch(error){setEventDeleteError(error instanceof Error?error.message:"删除失败，请重试");}
    finally{setBusy(false);}
  };
  const deleteProject=async()=>{
    setBusy(true);setDeleteError("");
    try{
      if(draftProject?.id===projectId){setDraftProject(undefined);}
      else{
        const value=await adminApi<StudioContent>("/api/studio/content?service="+encodeURIComponent(service.id),{method:"DELETE"});
        setContent(value);setSaved(JSON.stringify(value));
      }
      setDeleteOpen(false);
      const next=new URLSearchParams(params.toString());next.delete("project");next.delete("create");
      router.replace("/dashboard/content?"+next.toString());
      toast.success(draftProject?"已放弃创建":"项目已删除");
    }catch(error){setDeleteError(error instanceof Error?error.message:"删除失败，请重试");}
    finally{setBusy(false);}
  };

  const previewContent={...content,services:draftProject?[...content.services,draftProject]:content.services,events:draftEvent?[...content.events,draftEvent]:content.events};
  const previewButton=<ContentPreview content={previewContent} view={view} lang={lang} service={chosen}/>;
  const simpleContent=view==="about"||view==="contact";
  return <div className={simpleContent?"simple-content-workspace simple-editing-workspace":"contents"}>
    {simpleContent&&<header className="simple-toolbar"><h1 className="sr-only">{views[view].title}</h1><div className="simple-toolbar-controls">{view==="about"&&<AdminSelect label="编辑语言" value={lang} onValueChange={value=>setLang(value as Language)} options={languages} disabled={busy}/>}</div><div className="simple-toolbar-actions">{previewButton}<Button type="button" onClick={save} disabled={busy||!dirty}>{busy&&<Loader2 size={15} className="animate-spin"/>}保存</Button></div></header>}
    {!overview&&view==="services"&&<PageHeading eyebrow="MAKE IT YOURS" title={service.names.zh} description={views[view].description}>
      {view==="services"&&<Button variant="outline" disabled={busy} onClick={()=>openProject()}><ArrowLeft size={14}/>项目列表</Button>}
      {previewButton}
      {!overview&&<span className={"content-save-state "+(dirty?"is-dirty":"")}>{dirty?<span/>:<Check size={14}/>} {dirty?"有未保存的更改":"已保存"}</span>}
      {!overview&&<Button onClick={save} disabled={busy||!dirty}>{busy?<Loader2 className="animate-spin" size={15}/>:<Save size={15}/>}保存更改</Button>}
    </PageHeading>}
    {projectOverview?<div className="studio-entry-grid" role="region" aria-label="项目列表">
      {content.services.map(project=><EntryCard key={project.id} disabled={busy} title={project.names.zh} icon={project.theme==="yellow"?Sparkles:Paintbrush2} theme={project.theme} status={project.enabled?"开放预约":"已停用"} description={project.sections.length+" 个价格分组 · "+project.sections.reduce((count,section)=>count+section.items.length,0)+" 项价格"} onClick={()=>openProject(project.id)}/>)}
      <EntryCard title="添加项目" description="创建新的服务和价格菜单" icon={Plus} theme="pink" disabled={busy} add onClick={addService} footer="新增项目"/>
    </div>:eventOverview?<div className="simple-content-workspace">
    <header className="simple-toolbar"><p className="simple-toolbar-caption">{content.events.length} 张图片 · {content.events.filter(event=>event.enabled&&event.image).length} 张展示中</p><div className="simple-toolbar-actions">{previewButton}<Button type="button" disabled={busy} onClick={addEvent}><Plus size={15}/>新增活动</Button></div></header>
    <div className="event-entry-grid" role="region" aria-label="活动列表">
      {content.events.map(event=><EventCard key={event.id} event={event} label={eventLabel(event)} busy={busy} onEdit={()=>openEvent(event.id)} onDelete={()=>{setEventDeleteError("");setDeletingEvent(event);}}/>)}
      {!content.events.length&&<p className="simple-empty">还没有活动图片</p>}
    </div>
    </div>:view==="events"?<div className="poster-workspace">
      <header className="poster-toolbar">
        <div className="poster-toolbar-title"><Button type="button" variant="ghost" size="icon" aria-label="返回活动列表" disabled={busy} onClick={()=>openEvent()}><ArrowLeft size={18}/></Button><h1>{draftEvent?"新增活动":eventLabel(event)}</h1></div>
        <div className="poster-toolbar-actions">{previewButton}<Button type="button" onClick={save} disabled={busy||!dirty}>{busy&&<Loader2 size={15} className="animate-spin"/>}保存</Button></div>
      </header>
      <PosterEditor image={event.image} enabled={event.enabled} busy={busy} isDraft={!!draftEvent} onFile={file=>{void upload(file,event.id);}} onEnabled={enabled=>updateEvent(value=>{value.enabled=enabled;})} onDelete={()=>{setEventDeleteError("");setDeletingEvent(event);}}/>
    </div>:simpleContent?<div>
      {view==="about"?<Editor key={lang} value={content.about[lang]} onChange={text=>update(value=>{value.about[lang]=text;})} disabled={busy} onImageUpload={uploadImage}/>
      :<div className="simple-contact-settings">{contactFields.map(group=><section className="simple-settings-group" key={group.title}><h2>{group.title}</h2><div className="simple-contact-fields">{group.fields.map(([key,label])=><div key={key} className={key==="address"?"is-wide":""}>{field(label,content.contact[key as keyof typeof content.contact],text=>update(value=>{value.contact[key as keyof typeof value.contact]=text;}))}</div>)}</div></section>)}</div>}
    </div>:<>
    <div className="content-toolbar admin-panel">
      <div className="content-language"><Label htmlFor="content-language">编辑语言</Label><AdminSelect id="content-language" label="编辑语言" value={lang} onValueChange={value=>setLang(value as Language)} options={languages} disabled={busy}/></div>
    </div>
    <div className="content-editor-layout view-services">
      <section className="admin-panel content-edit" data-color-mode="light">
        <div className="content-panel-heading"><span className="content-panel-icon"><FileText size={19}/></span><div><h2>{service.names.zh} · 项目与价格</h2></div></div>
        <fieldset disabled={busy} className="content-edit-fields"><ProjectEditor service={service} lang={lang} busy={busy} onChange={updateProject} isDraft={draftProject?.id===projectId} onDelete={()=>{setDeleteError("");setDeleteOpen(true);}}/></fieldset>
      </section>
    </div>
    </>}

    <Dialog open={!!deletingEvent} onOpenChange={open=>{if(!open&&!busy)setDeletingEvent(undefined);}}>
      <DialogContent closeLabel="取消删除" onEscapeKeyDown={event=>{if(busy)event.preventDefault();}} onPointerDownOutside={event=>{if(busy)event.preventDefault();}}>
        <DialogTitle>{draftEvent?.id===deletingEvent?.id?"放弃创建这个活动？":"删除「"+(deletingEvent?eventLabel(deletingEvent):"活动图片")+"」？"}</DialogTitle>
        <DialogDescription>{draftEvent?.id===deletingEvent?.id?"尚未保存的活动图片将被丢弃。":"活动图片将从网页和小程序中移除，未保存的更改也会丢弃。此操作无法撤销。"}</DialogDescription>
        {eventDeleteError&&<p role="alert" className="text-sm text-destructive">{eventDeleteError}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>setDeletingEvent(undefined)}>取消</Button><Button type="button" variant="destructive" disabled={busy} onClick={deleteEvent}>{busy&&<Loader2 size={15} className="animate-spin"/>}{draftEvent?.id===deletingEvent?.id?"放弃创建":"确认删除"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={deleteOpen} onOpenChange={open=>{if(!busy)setDeleteOpen(open);}}>
      <DialogContent closeLabel="取消删除" onEscapeKeyDown={event=>{if(busy)event.preventDefault();}} onPointerDownOutside={event=>{if(busy)event.preventDefault();}}>
        <DialogTitle>{draftProject?"放弃创建这个项目？":"删除「"+service.names.zh+"」？"}</DialogTitle>
        <DialogDescription>{draftProject?"尚未保存的项目信息、价格菜单和提醒事项都会丢弃。":"项目及其价格菜单、提醒事项将被删除，顾客端刷新后不再展示。此项目未保存的更改也会丢弃，此操作无法撤销。已有预约记录的项目无法删除，请改为停用。"}</DialogDescription>
        {deleteError&&<p role="alert" className="text-sm text-destructive">{deleteError}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>setDeleteOpen(false)}>取消</Button><Button type="button" variant="destructive" disabled={busy} onClick={deleteProject}>{busy&&<Loader2 size={15} className="animate-spin"/>}{draftProject?"放弃创建":"确认删除"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

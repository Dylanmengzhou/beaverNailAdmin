"use client";

import {useEffect, useRef, useState} from "react";
import dynamic from "next/dynamic";
import {useRouter,useSearchParams} from "next/navigation";
import {ArrowLeft, Check, Eye, FileText, ImageIcon, Loader2, Monitor, Paintbrush2, Plus, Save, Smartphone, Sparkles, Trash2} from "lucide-react";
import {toast} from "sonner";
import {adminApi} from "@/lib/admin-api";
import {useAdminSession} from "@/components/admin/AdminShell";
import {useUnsavedChanges} from "@/components/admin/UnsavedChanges";
import {PageHeading, PanelState} from "@/components/admin/PageHeading";
import {AdminSelect, ImageUpload, SettingSwitch, TextField} from "@/components/admin/FormControls";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogTitle} from "@/components/ui/dialog";
import {EntryCard} from "@/components/admin/EntryCard";
import ProjectEditor from "@/components/studio/ProjectEditor";
import {Label} from "@/components/ui/label";
import {studioContentSchema, type StudioContent, type CatalogService} from "@/lib/studio/content";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const Editor=dynamic(()=>import("@uiw/react-md-editor"),{ssr:false});
const empty=()=>({zh:"",en:"",kr:""});
const views={
  services:{title:"项目与价格",description:"选择一个项目，统一管理项目信息、价格菜单和到店提醒。"},
  about:{title:"关于我们",description:"把工作室的故事写下来，右侧会同步显示顾客端的实际效果。"},
  events:{title:"近期活动",description:"编辑活动图片与内容，并选择哪些活动展示给顾客。"},
  contact:{title:"门店联系方式",description:"统一维护到店地址、联系渠道和收款信息。"},
} as const;
type View=keyof typeof views;
type Language="zh"|"en"|"kr";
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
  const openProject=(id?:string)=>{
    const next=new URLSearchParams(params.toString());next.set("view","services");
    if(id)next.set("project",id);else next.delete("project");
    next.delete("create");
    confirmNavigation(()=>{setFrameReady(false);router.push("/dashboard/content?"+next.toString());});
  };
  const [content,setContent]=useState<StudioContent>();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState("");
  const [draftProject,setDraftProject]=useState<CatalogService>();
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [deleteError,setDeleteError]=useState("");
  const [lang,setLang]=useState<Language>("zh");
  const [mobile,setMobile]=useState(true);
  const [preview,setPreview]=useState<unknown>();
  const [previewBusy,setPreviewBusy]=useState(false);
  const [frameReady,setFrameReady]=useState(false);
  const [webOrigin,setWebOrigin]=useState("");
  const frame=useRef<HTMLIFrameElement>(null);
  const dirty=!!content&&(JSON.stringify(content)!==saved||!!draftProject);
  const confirmNavigation=useUnsavedChanges(dirty,()=>{
    if(saved)setContent(JSON.parse(saved));
    setDraftProject(undefined);
  });


  useEffect(()=>{
    if(params.get("view")==="prices"){
      const next=new URLSearchParams(params.toString());next.set("view","services");next.set("project",projectId||"nails");
      router.replace("/dashboard/content?"+next.toString());
    }
  },[params,projectId,router]);
  useEffect(()=>{
    setWebOrigin(process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN || (["localhost","127.0.0.1"].includes(location.hostname)?"http://localhost:3000":"https://www.beavernail.com"));
    const control=new AbortController();
    void adminApi<StudioContent>("/api/studio/content",{signal:control.signal}).then(value=>{
      setContent(value);setSaved(JSON.stringify(value));
      if(params.get("create")==="1"){
        const next=new URLSearchParams(params.toString());next.delete("create");
        if(!value.services.some(service=>service.id===projectId))next.delete("project");
        router.replace("/dashboard/content?"+next.toString());
      }
    }).catch(error=>{if(!control.signal.aborted)setError(error.message);});
    return()=>control.abort();
  },[]);

  const update=(fn:(value:StudioContent)=>void)=>setContent(value=>{
    if(!value)return value;
    const next=structuredClone(value);fn(next);return next;
  });

  useEffect(()=>{
    if(!content||session?.memberType!=="manager")return;
    const control=new AbortController();
    setPreviewBusy(true);
    const timer=setTimeout(()=>{
      void adminApi("/api/studio/preview",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(draftProject?{...content,services:[...content.services,draftProject]}:content),signal:control.signal,
      }).then(setPreview).catch(()=>{}).finally(()=>{if(!control.signal.aborted)setPreviewBusy(false);});
    },450);
    return()=>{clearTimeout(timer);control.abort();};
  },[content,draftProject,session?.memberType]);

  useEffect(()=>{
    if(frameReady&&preview&&webOrigin)frame.current?.contentWindow?.postMessage({type:"studio-preview",content:preview},webOrigin);
  },[frameReady,preview,webOrigin,lang,view]);
  useEffect(()=>{
    const onReady=(event:MessageEvent)=>{
      const win=frame.current?.contentWindow;
      if(win&&event.source===win&&event.origin===webOrigin&&event.data?.type==="studio-preview-ready"&&preview)
        win.postMessage({type:"studio-preview",content:preview},webOrigin);
    };
    window.addEventListener("message",onReady);
    return()=>window.removeEventListener("message",onReady);
  },[preview,webOrigin]);

  const save=async()=>{
    if(!content)return;
    const parsed=studioContentSchema.safeParse(draftProject?{...content,services:[...content.services,draftProject]}:content);
    if(!parsed.success){toast.error(parsed.error.issues.map(issue=>issue.message).join("；"));return;}
    setBusy(true);
    try{
      const value=await adminApi<StudioContent>("/api/studio/content",{
        method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data),
      });
      setContent(value);setSaved(JSON.stringify(value));setDraftProject(undefined);
      if(draftProject){const next=new URLSearchParams(params.toString());next.delete("create");router.replace("/dashboard/content?"+next.toString());}
      toast.success("已保存，顾客端刷新后生效");
    }catch(error){toast.error(error instanceof Error?error.message:"保存失败");}
    finally{setBusy(false);}
  };
  const upload=async(file:File,index:number)=>{
    if(file.size>4*1024*1024){toast.error("请选择 4MB 以内的图片");return;}
    setBusy(true);
    try{
      const body=new FormData();body.set("file",file);body.set("purpose","home");
      const result=await adminApi<{url:string}>("/api/media",{method:"POST",body});
      update(value=>{value.events[index].image=result.url;});
    }catch(error){toast.error(error instanceof Error?error.message:"上传失败");}
    finally{setBusy(false);}
  };

  if(error)return <PanelState title={error}><Button variant="outline" onClick={()=>location.reload()}>重新加载</Button></PanelState>;
  if(!content||!session)return <PanelState loading title="正在读取门店内容…"/>;
  if(session.memberType!=="manager")return <PanelState title="此页面仅管理员可以编辑"/>;
  const index=Math.max(0,content.services.findIndex(service=>service.id===chosen));
  const service=draftProject?.id===projectId?draftProject:content.services[index];
  const overview=view==="services"&&!projectId;
  if(view==="services"&&projectId&&draftProject?.id!==projectId&&!content.services.some(service=>service.id===projectId))
    return <PanelState title="这个项目已不存在"><Button variant="outline" onClick={()=>openProject()}>返回项目列表</Button></PanelState>;
  const field=(label:string,value:string,onChange:(value:string)=>void,hint?:string)=>
    <TextField label={label} value={value} onChange={event=>onChange(event.target.value)} disabled={busy} hint={hint}/>;
  const addService=()=>confirmNavigation(()=>{
    const id="service_"+Date.now().toString(36);
    setDraftProject({id,names:{zh:"新服务",en:"New service",kr:"새 서비스"},theme:"pink",enabled:true,sections:[],notes:[]});
    const next=new URLSearchParams(params.toString());next.set("view","services");next.set("project",id);next.set("create","1");
    setFrameReady(false);router.push("/dashboard/content?"+next.toString());
  });
  const updateProject=(fn:(value:CatalogService)=>void)=>{
    if(draftProject?.id===projectId)setDraftProject(value=>{if(!value)return value;const next=structuredClone(value);fn(next);return next;});
    else update(value=>fn(value.services[index]));
  };
  const deleteProject=async()=>{
    setBusy(true);setDeleteError("");
    try{
      if(draftProject?.id===projectId){setDraftProject(undefined);}
      else{
        const value=await adminApi<StudioContent>("/api/studio/content?service="+encodeURIComponent(service.id),{method:"DELETE"});
        setContent(value);setSaved(JSON.stringify(value));
      }
      setDeleteOpen(false);setFrameReady(false);
      const next=new URLSearchParams(params.toString());next.delete("project");next.delete("create");
      router.replace("/dashboard/content?"+next.toString());
      toast.success(draftProject?"已放弃创建":"项目已删除");
    }catch(error){setDeleteError(error instanceof Error?error.message:"删除失败，请重试");}
    finally{setBusy(false);}
  };

  return <>
    {!overview&&<PageHeading eyebrow="MAKE IT YOURS" title={view==="services"&&!overview?service.names.zh:views[view].title} description={views[view].description}>
      {view==="services"&&!overview&&<Button variant="outline" disabled={busy} onClick={()=>openProject()}><ArrowLeft size={14}/>项目列表</Button>}
      {!overview&&<span className={"content-save-state "+(dirty?"is-dirty":"")}>{dirty?<span/>:<Check size={14}/>} {dirty?"有未保存的更改":"已保存"}</span>}
      {!overview&&<Button onClick={save} disabled={busy||!dirty}>{busy?<Loader2 className="animate-spin" size={15}/>:<Save size={15}/>}保存更改</Button>}
    </PageHeading>}
    {overview?<div className="studio-entry-grid" role="region" aria-label="项目列表">
      {content.services.map(project=><EntryCard key={project.id} disabled={busy} title={project.names.zh} icon={project.theme==="yellow"?Sparkles:Paintbrush2} theme={project.theme} status={project.enabled?"开放预约":"已停用"} description={project.sections.length+" 个价格分组 · "+project.sections.reduce((count,section)=>count+section.items.length,0)+" 项价格"} onClick={()=>openProject(project.id)}/>)}
      <EntryCard title="添加项目" description="创建新的服务和价格菜单" icon={Plus} theme="pink" disabled={busy} add onClick={addService} footer="新增项目"/>
    </div>:<>
    <div className="content-toolbar admin-panel">
      <div className="content-language"><Label htmlFor="content-language">编辑语言</Label><AdminSelect id="content-language" label="编辑语言" value={lang} onValueChange={value=>{setFrameReady(false);setLang(value as Language);}} options={languages} disabled={busy}/></div>
      <p className="content-toolbar-hint">预览会显示当前更改，保存后顾客端生效。</p>
    </div>
    <div className={"content-editor-layout view-"+view}>
      <section className="admin-panel content-edit" data-color-mode="light">
        <div className="content-panel-heading"><span className="content-panel-icon">{view==="events"?<ImageIcon size={19}/>:<FileText size={19}/>}</span><div><h2>{view==="about"?"关于我们 · Markdown":view==="services"?service.names.zh+" · 项目与价格":views[view].title}</h2><p>{view==="about"?"支持标题、列表、图片、链接与表格。":"清晰地整理信息，让顾客更容易找到需要的内容。"}</p></div></div>
        <fieldset disabled={busy} className="content-edit-fields">
          {view==="about"&&<Editor value={content.about[lang]} onChange={text=>update(value=>{value.about[lang]=text||"";})} height={620} preview="edit" textareaProps={{"aria-label":"关于我们 Markdown 内容"}}/>}
          {view==="services"&&<ProjectEditor service={service} lang={lang} busy={busy} onChange={updateProject} isDraft={draftProject?.id===projectId} onDelete={()=>{setDeleteError("");setDeleteOpen(true);}}/>}
          {view==="contact"&&<div className="content-stack">{contactFields.map(group=><section className="content-section" key={group.title}><div className="content-section-title"><h3>{group.title}</h3></div><p className="admin-field-help">{group.hint}</p><div className="admin-form-grid">{group.fields.map(([key,label])=><div key={key}>{field(label,content.contact[key as keyof typeof content.contact],text=>update(value=>{value.contact[key as keyof typeof value.contact]=text;}))}</div>)}</div></section>)}</div>}
          {view==="events"&&<div className="content-stack">
            <Button variant="outline" className="content-add-button" onClick={()=>update(value=>{value.events.push({id:crypto.randomUUID(),title:empty(),body:empty(),image:"",enabled:false});})}><Plus size={15}/>新增活动</Button>
            {!content.events.length&&<div className="content-empty"><ImageIcon size={27}/><h3>下一份惊喜，从这里开始</h3><p>添加活动图片和介绍，开启展示后就会出现在顾客端。</p></div>}
            {content.events.map((event,eventIndex)=><section className="content-section" key={event.id}>
              <div className="content-section-title"><h3>活动 {String(eventIndex+1).padStart(2,"0")}</h3><Button variant="ghost" size="icon" aria-label={"移除活动 "+(event.title.zh||String(eventIndex+1))} onClick={()=>update(value=>{value.events.splice(eventIndex,1);})}><Trash2 size={15}/></Button></div>
              {field("活动标题",event.title[lang],text=>update(value=>{value.events[eventIndex].title[lang]=text;}))}
              <SettingSwitch label="显示活动" description="开启后会展示在网页和小程序的近期活动中。" checked={event.enabled} onCheckedChange={enabled=>update(value=>{value.events[eventIndex].enabled=enabled;})} disabled={busy}/>
              {event.image&&<img src={event.image} alt={event.title[lang]||"活动图片"} className="event-edit-image"/>}
              <ImageUpload label={event.image?"更换活动图片":"上传活动图片"} busy={busy} onFile={file=>upload(file,eventIndex)}/>
              <Label>活动内容 · Markdown</Label>
              <Editor value={event.body[lang]} onChange={text=>update(value=>{value.events[eventIndex].body[lang]=text||"";})} height={300} preview="edit" textareaProps={{"aria-label":"活动内容 "+(eventIndex+1)}}/>
            </section>)}
          </div>}
        </fieldset>
      </section>
      <section className="admin-panel content-preview">
        <div className="content-preview-heading"><div><Eye size={17}/><h2>顾客端实际预览</h2></div><span className="content-live-status">{previewBusy?<Loader2 size={12} className="animate-spin"/>:<i/>}{previewBusy?"更新中":"实时预览"}</span></div>
        <div className="content-preview-tools" role="group" aria-label="预览设备">
          <Button type="button" variant={mobile?"secondary":"ghost"} size="sm" aria-pressed={mobile} onClick={()=>setMobile(true)}><Smartphone size={15}/>手机</Button>
          <Button type="button" variant={!mobile?"secondary":"ghost"} size="sm" aria-pressed={!mobile} onClick={()=>setMobile(false)}><Monitor size={15}/>桌面</Button>
        </div>
        <p className="admin-field-help">预览与顾客端使用相同的内容和排版。</p>
        {webOrigin&&<div className="preview-viewport"><iframe title="顾客端实际预览" ref={frame} onLoad={()=>{setFrameReady(true);if(preview)frame.current?.contentWindow?.postMessage({type:"studio-preview",content:preview},webOrigin);}} src={webOrigin+"/studio-preview?view="+(view==="services"?"prices":view)+"&language="+lang+"&service="+chosen} style={{width:mobile?390:1280,maxWidth:mobile?"100%":"none",height:840}}/></div>}
      </section>
    </div>
    </>}
    <Dialog open={deleteOpen} onOpenChange={open=>{if(!busy)setDeleteOpen(open);}}>
      <DialogContent closeLabel="取消删除" onEscapeKeyDown={event=>{if(busy)event.preventDefault();}} onPointerDownOutside={event=>{if(busy)event.preventDefault();}}>
        <DialogTitle>{draftProject?"放弃创建这个项目？":"删除「"+service.names.zh+"」？"}</DialogTitle>
        <DialogDescription>{draftProject?"尚未保存的项目信息、价格菜单和提醒事项都会丢弃。":"项目及其价格菜单、提醒事项将被删除，顾客端刷新后不再展示。此项目未保存的更改也会丢弃，此操作无法撤销。已有预约记录的项目无法删除，请改为停用。"}</DialogDescription>
        {deleteError&&<p role="alert" className="text-sm text-destructive">{deleteError}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>setDeleteOpen(false)}>取消</Button><Button type="button" variant="destructive" disabled={busy} onClick={deleteProject}>{busy&&<Loader2 size={15} className="animate-spin"/>}{draftProject?"放弃创建":"确认删除"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

"use client";

import {useEffect,useRef,useState} from "react";
import {Eye,Loader2,Monitor,Smartphone} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog,DialogContent,DialogDescription,DialogTitle} from "@/components/ui/dialog";
import {adminApi} from "@/lib/admin-api";
import type {StudioContent} from "@/lib/studio/content";

export default function ContentPreview({content,view,lang,service}:{content:StudioContent;view:"services"|"about"|"events"|"contact";lang:"zh"|"en"|"kr";service:string}){
 const [open,setOpen]=useState(false),[mobile,setMobile]=useState(true);
 const [origin,setOrigin]=useState(""),[preview,setPreview]=useState<unknown>();
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[retry,setRetry]=useState(0),[ready,setReady]=useState(false);
 const frame=useRef<HTMLIFrameElement>(null);
 useEffect(()=>{setOrigin(process.env.NEXT_PUBLIC_CUSTOMER_ORIGIN||(["localhost","127.0.0.1"].includes(location.hostname)?"http://localhost:3000":"https://www.beavernail.com"));},[]);
 useEffect(()=>{
  if(!open)return;
  const control=new AbortController();setBusy(true);setError("");
  void adminApi("/api/studio/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(content),signal:control.signal})
   .then(setPreview).catch(error=>{if(!control.signal.aborted)setError(error instanceof Error?error.message:"预览暂时无法加载");})
   .finally(()=>{if(!control.signal.aborted)setBusy(false);});
  return()=>control.abort();
 },[open,content,retry]);
 useEffect(()=>{if(ready&&preview&&origin)frame.current?.contentWindow?.postMessage({type:"studio-preview",content:preview},origin);},[ready,preview,origin]);
 useEffect(()=>{
  if(!open)return;
  const onReady=(event:MessageEvent)=>{
   if(event.source===frame.current?.contentWindow&&event.origin===origin&&event.data?.type==="studio-preview-ready"&&preview)
    frame.current?.contentWindow?.postMessage({type:"studio-preview",content:preview},origin);
  };
  window.addEventListener("message",onReady);return()=>window.removeEventListener("message",onReady);
 },[open,origin,preview]);
 const changeOpen=(value:boolean)=>{setOpen(value);if(value){setReady(false);setPreview(undefined);setError("");}};
 return <>
  <Button type="button" variant="outline" onClick={()=>changeOpen(true)}><Eye size={16}/>预览</Button>
  <Dialog open={open} onOpenChange={changeOpen}>
   <DialogContent className="content-preview-dialog" closeLabel="关闭预览">
    <div className="content-preview-dialog-heading"><DialogTitle>顾客端预览</DialogTitle><DialogDescription>查看当前更改，保存后显示给顾客。</DialogDescription></div>
    <div className="content-preview-device-bar">
     <div className="content-preview-tools" role="group" aria-label="预览设备">
      <Button type="button" variant={mobile?"secondary":"ghost"} size="sm" aria-pressed={mobile} onClick={()=>setMobile(true)}><Smartphone size={15}/>手机</Button>
      <Button type="button" variant={!mobile?"secondary":"ghost"} size="sm" aria-pressed={!mobile} onClick={()=>setMobile(false)}><Monitor size={15}/>桌面</Button>
     </div>
     {busy&&<span className="content-live-status" role="status"><Loader2 size={14} className="animate-spin"/>正在生成预览…</span>}
    </div>
    {error?<div className="content-preview-state" role="alert"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>重新加载</Button></div>
     :preview&&origin?<div className="content-preview-viewport"><iframe key={view+lang+service} title="顾客端实际预览" ref={frame} onLoad={()=>{setReady(true);frame.current?.contentWindow?.postMessage({type:"studio-preview",content:preview},origin);}} src={origin+"/studio-preview?view="+(view==="services"?"prices":view)+"&language="+lang+"&service="+encodeURIComponent(service)} style={{width:mobile?390:1280,maxWidth:mobile?"100%":"none"}}/></div>
     :<div className="content-preview-state" role="status"><Loader2 size={24} className="animate-spin"/><p>正在打开预览…</p></div>}
   </DialogContent>
  </Dialog>
 </>;
}

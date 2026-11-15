"use client";

import {useId,useRef} from "react";
import {ImagePlus,Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";

export default function PosterEditor({image,enabled,busy,isDraft,onFile,onEnabled,onDelete}:{image:string;enabled:boolean;busy:boolean;isDraft:boolean;onFile:(file:File)=>void;onEnabled:(enabled:boolean)=>void;onDelete:()=>void}){
 const input=useRef<HTMLInputElement>(null),id=useId();
 return <section className="poster-editor" aria-label="活动图片编辑">
  <Button type="button" variant="ghost" className={"poster-upload "+(image?"has-image":"")} disabled={busy} aria-label={image?"更换活动图片":"上传活动图片"} onClick={()=>input.current?.click()}>
   {image?<><img src={image} alt="活动海报预览"/><span className="poster-replace">点击更换图片</span></>:<><ImagePlus size={28} strokeWidth={1.5}/><strong>上传活动图片</strong><span>JPG、PNG、WebP · 最大 4MB</span></>}
   {busy&&<span className="poster-upload-busy"><Loader2 size={24} className="animate-spin"/>正在上传</span>}
  </Button>
  <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="选择活动图片" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)onFile(file);}}/>
  <div className="poster-editor-options">
   <div><Switch id={id} checked={enabled} disabled={busy} onCheckedChange={onEnabled}/><Label htmlFor={id}>展示到顾客端</Label></div>
   <Button type="button" variant="ghost" disabled={busy} className="poster-delete" onClick={onDelete}>{isDraft?"放弃创建":"删除活动"}</Button>
  </div>
 </section>;
}

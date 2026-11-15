"use client";

import {ArrowUpRight,ImageIcon,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import type {StudioContent} from "@/lib/studio/content";

export default function EventCard({event,label,busy,onEdit,onDelete}:{event:StudioContent["events"][number];label:string;busy:boolean;onEdit:()=>void;onDelete:()=>void}){
 return <Card className="event-entry-card">
  <Button type="button" variant="ghost" className="event-entry-main" disabled={busy} onClick={onEdit} aria-label={"编辑"+label}>
   <span className="event-entry-cover">{event.image?<img src={event.image} alt=""/>:<ImageIcon size={36} strokeWidth={1.3}/>}</span>
   <span className="event-entry-copy"><strong>{label}</strong><span className="event-entry-footer">{event.image?"查看与更换图片":"上传活动图片"}<ArrowUpRight size={13}/></span></span>
  </Button>
  <span className={"event-entry-status "+(event.enabled?"is-enabled":"")}>{event.enabled?"展示中":"未展示"}</span>
  <Button type="button" variant="outline" size="icon" className="event-entry-delete" disabled={busy} aria-label={"删除"+label} onClick={onDelete}><Trash2 size={15}/></Button>
 </Card>;
}

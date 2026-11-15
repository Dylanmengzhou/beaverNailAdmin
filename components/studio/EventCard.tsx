"use client";

import {ArrowUpRight,ImageIcon,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import type {StudioContent} from "@/lib/studio/content";

export default function EventCard({event,busy,onEdit,onDelete}:{event:StudioContent["events"][number];busy:boolean;onEdit:()=>void;onDelete:()=>void}){
 const title=event.title.zh||"未命名活动";
 return <Card className="event-entry-card">
  <Button type="button" variant="ghost" className="event-entry-main" disabled={busy} onClick={onEdit} aria-label={"编辑活动 "+title}>
   <span className="event-entry-cover">{event.image?<img src={event.image} alt=""/>:<ImageIcon size={36} strokeWidth={1.3}/>}</span>
   <span className="event-entry-copy"><strong>{title}</strong><span>{event.body.zh.replace(/[#*`!\[\]()>]/g,"").trim()||"添加活动图片和介绍，让顾客了解这份惊喜。"}</span><span className="event-entry-footer">查看与编辑<ArrowUpRight size={13}/></span></span>
  </Button>
  <span className={"event-entry-status "+(event.enabled?"is-enabled":"")}>{event.enabled?"展示中":"未展示"}</span>
  <Button type="button" variant="outline" size="icon" className="event-entry-delete" disabled={busy} aria-label={"删除活动 "+title} onClick={onDelete}><Trash2 size={15}/></Button>
 </Card>;
}

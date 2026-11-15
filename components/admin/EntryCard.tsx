"use client";

import {ArrowUpRight, type LucideIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";

export function EntryCard({title,description,icon:Icon,theme="lilac",status,footer="查看与编辑",onClick,add=false,disabled=false}:{
 title:string;description:string;icon:LucideIcon;theme?:"pink"|"yellow"|"lilac"|"mint";
 status?:string;footer?:string;onClick:()=>void;add?:boolean;disabled?:boolean;
}){
 return <Card className={"studio-entry-card theme-"+theme+(add?" is-add":"")}>
  <Button type="button" variant="ghost" disabled={disabled} className="studio-entry-button" onClick={onClick} aria-label={(add?"":"管理")+title}>
   {status&&<span className="studio-entry-status"><i/>{status}</span>}
   <span className="studio-entry-symbol"><Icon className="size-8" strokeWidth={1.5}/></span>
   <strong>{title}</strong><span className="studio-entry-description">{description}</span>
   <span className="studio-entry-footer">{footer}<ArrowUpRight className="size-3"/></span>
  </Button>
 </Card>;
}

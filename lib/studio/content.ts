import {z} from "zod";
import initial from "./content-default.json";
export const localizedText = z.object({zh:z.string().max(80000),en:z.string().max(80000),kr:z.string().max(80000)});
const priceItem = z.object({id:z.string().min(1),name:localizedText,price:z.string().max(100),note:localizedText});
const section = z.object({id:z.string().min(1),title:localizedText,subtitle:localizedText,items:z.array(priceItem).max(100)});
export const catalogServiceSchema=z.object({
 id:z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/), names:localizedText,
 theme:z.enum(["pink","yellow","lilac","mint"]),enabled:z.boolean(),
 sections:z.array(section).max(30),notes:z.array(localizedText).max(30)
});
export const studioContentSchema=z.object({
 services:z.array(catalogServiceSchema).min(1).max(40),
 about:localizedText,
 events:z.array(z.object({id:z.string().min(1),title:localizedText,body:localizedText,image:z.string().max(500).refine(s=>!s || /^\/(api\/media\/[a-zA-Z0-9_-]+|images\/[a-zA-Z0-9_.-]+)$/.test(s),"请选择已上传的图片"),enabled:z.boolean()})).max(30),
 contact:z.object(Object.fromEntries(["address","phone","wechat","instagram","redbook","email","bankName","bankAccount","bankHolder"].map(k=>[k,z.string().trim().max(500)])) as Record<"address"|"phone"|"wechat"|"instagram"|"redbook"|"email"|"bankName"|"bankAccount"|"bankHolder",z.ZodString>)
}).superRefine((v,ctx)=>{
 if(!v.services.some(s=>s.enabled))ctx.addIssue({code:"custom",message:"至少启用一个服务项目"});
 if(new Set(v.services.map(s=>s.id)).size!==v.services.length)ctx.addIssue({code:"custom",message:"服务标识不能重复"});
});
export type StudioContent=z.infer<typeof studioContentSchema>;
export type CatalogService=StudioContent["services"][number];
export const DEFAULT_CONTENT:StudioContent=studioContentSchema.parse(initial);
export const contentKey="studio-content-v1";
export const localized=(v:{zh:string;en:string;kr:string},lang:string)=>v[lang as "zh"|"en"|"kr"] || v.zh;

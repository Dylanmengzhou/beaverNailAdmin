import {NextResponse} from "next/server";
import {requireStaff} from "@/lib/studio/auth";
import {renderMarkdown} from "@/lib/studio/markdown";
import {studioContentSchema} from "@/lib/studio/content";
import {apiError} from "@/lib/studio/http";
export async function POST(request:Request){
 try{requireStaff(request,true);const value=studioContentSchema.parse(await request.json());return NextResponse.json({...value,aboutHtml:Object.fromEntries(["zh","en","kr"].map(l=>[l,renderMarkdown(value.about[l as "zh"])])),events:value.events.filter(e=>e.enabled).map(e=>({...e,html:Object.fromEntries(["zh","en","kr"].map(l=>[l,renderMarkdown(e.body[l as "zh"])]))}))});}catch(e){return apiError(e);}
}

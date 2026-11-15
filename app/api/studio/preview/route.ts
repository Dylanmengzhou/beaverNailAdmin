import {NextResponse} from "next/server";
import {requireStaff} from "@/lib/studio/auth";
import {renderMarkdown} from "@/lib/studio/markdown";
import {studioContentSchema} from "@/lib/studio/content";
import {apiError} from "@/lib/studio/http";
import {eventImages} from "@/lib/studio/event-images";
export async function POST(request:Request){
 try{await requireStaff(request,true);const value=studioContentSchema.parse(await request.json());return NextResponse.json({...value,aboutHtml:Object.fromEntries(["zh","en","kr"].map(l=>[l,renderMarkdown(value.about[l as "zh"])])),events:eventImages(value.events)});}catch(e){return apiError(e);}
}

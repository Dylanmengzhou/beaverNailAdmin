import {NextResponse} from "next/server";
import {requireStaff} from "@/lib/studio/auth";
import {apiError} from "@/lib/studio/http";
export async function GET(request:Request){
 try{return NextResponse.json(await requireStaff(request),{headers:{"Cache-Control":"private, no-store"}});}
 catch(error){return apiError(error);}
}

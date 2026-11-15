"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {useAdminSession} from "@/components/admin/AdminShell";
import {adminApi} from "@/lib/admin-api";
import {currencyLabel,settlementStatusLabel} from "@/lib/studio/settlement";
import {AdminSelect} from "@/components/admin/FormControls";
import {Button} from "@/components/ui/button";
import type {SettlementRequestView} from "./SettlementCard";

export default function SettlementQueue(){
 const manager=useAdminSession()?.memberType==="manager";
 const [status,setStatus]=useState("pending"),[page,setPage]=useState(1),[data,setData]=useState<{count:number;rows:SettlementRequestView[]}>(),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const control=new AbortController();setError("");setData(undefined);
  void adminApi<{count:number;rows:SettlementRequestView[]}>("/api/studio/settlements?status="+status+"&page="+page,{signal:control.signal}).then(setData).catch(error=>{if(!control.signal.aborted)setError(error.message);});return()=>control.abort();
 },[status,page,retry]);
 return <section className="settlement-queue" aria-label={manager?"结算审核":"我的结算申请"}>
  <div className="simple-filters"><AdminSelect label="结算申请状态" value={status} onValueChange={value=>{setStatus(value);setPage(1);}} options={[{value:"pending",label:"待审核"},{value:"approved",label:"已确认"},{value:"rejected",label:"已退回"},{value:"withdrawn",label:"已撤回"},{value:"all",label:"全部申请"}]}/><span className="simple-filter-count">{data?data.count+" 条申请":"正在读取…"}</span></div>
  {error?<p role="alert">{error}<Button variant="ghost" onClick={()=>setRetry(value=>value+1)}>重新读取</Button></p>:!data?<p className="simple-empty" role="status">正在读取申请…</p>:!data.rows.length?<p className="simple-empty">{status==="pending"?"没有待审核的结算申请":"暂无这类申请"}</p>:<div className="settlement-queue-list">{data.rows.map(request=><article key={request.id}><div><strong>{request.artistName} · {request.serviceName}</strong><span>{request.date.slice(0,10)} {request.timeSlot} · {settlementStatusLabel(request.status)}</span></div><dl><div><dt>最终价格</dt><dd>{request.price.toLocaleString()} {currencyLabel(request.currency)}</dd></div><div><dt>提成 · {request.commissionRateBps/100}%</dt><dd>{request.commissionAmount.toLocaleString()} {currencyLabel(request.currency)}</dd></div></dl>{request.reservationId&&<Button asChild variant="outline"><Link href={"/reservation/"+request.reservationId}>{manager&&request.status==="pending"?"审核":"查看"}</Link></Button>}</article>)}</div>}
  {data&&data.count>20&&<div className="settlement-pagination"><Button variant="outline" disabled={page===1} onClick={()=>setPage(value=>value-1)}>上一页</Button><span>{page} / {Math.ceil(data.count/20)}</span><Button variant="outline" disabled={page*20>=data.count} onClick={()=>setPage(value=>value+1)}>下一页</Button></div>}
 </section>;
}

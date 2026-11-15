"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {useAdminSession} from "@/components/admin/AdminShell";
import {useUnsavedChanges} from "@/components/admin/UnsavedChanges";
import {adminApi} from "@/lib/admin-api";
import {commissionForPrice,currencyLabel,settlementStatusLabel} from "@/lib/studio/settlement";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {AdminSelect} from "@/components/admin/FormControls";
import {toast} from "sonner";

export type SettlementBooking={id:string;nailArtistId:string|null;serviceType:string;finalPrice:number|null;currency:string|null;paymentMethod:string|null;commissionRateBps:number|null;commissionAmount:number|null;settlementVersion:number;settlementApprovedAt:string|null;settlementApprovedById:string|null};
export type SettlementRequestView={id:string;reservationId:string|null;artistName:string;serviceName:string;date:string;timeSlot:string;price:number;currency:string;paymentMethod:string;commissionRateBps:number;commissionAmount:number;status:string;submittedById:string;submittedByName:string;submittedAt:string;reviewedByName:string|null;reviewedAt:string|null;reviewNote:string|null};
type Data={booking:SettlementBooking;policy:{serviceId:string;serviceName:string;rateBps:number|null};pending:SettlementRequestView|null;history:SettlementRequestView[]};
const methods=[{value:"cash",label:"现金"},{value:"memberCard",label:"会员卡"},{value:"card",label:"刷卡"},{value:"wechat",label:"微信"},{value:"alipay",label:"支付宝"}];
const money=(value:number|null,currency:string|null)=>value==null?"未录入":value.toLocaleString()+" "+currencyLabel(currency);
const time=(value:string)=>new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value));

export default function SettlementCard({reservationId,memberBalance,onConfirmed}:{reservationId:string;memberBalance?:number|null;onConfirmed:(value:SettlementBooking)=>void}){
 const session=useAdminSession(),manager=session?.memberType==="manager";
 const [data,setData]=useState<Data>(),[error,setError]=useState(""),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false);
 const [price,setPrice]=useState(""),[currency,setCurrency]=useState("KRW"),[payment,setPayment]=useState("cash"),[rejecting,setRejecting]=useState(false),[reason,setReason]=useState("");
 const dirty=!!data&&editing&&(price!==(data.booking.finalPrice==null?"":String(data.booking.finalPrice))||currency!==(data.booking.currency||"KRW")||payment!==(data.booking.paymentMethod||"cash"));
 const navigate=useUnsavedChanges(dirty,()=>setEditing(false));
 const load=useCallback(async(signal?:AbortSignal)=>{
  const value=await adminApi<Data>("/api/studio/settlement?reservation="+encodeURIComponent(reservationId),{signal});
  setData(value);setError("");return value;
 },[reservationId]);
 useEffect(()=>{const control=new AbortController();void load(control.signal).catch(error=>{if(!control.signal.aborted)setError(error.message);});return()=>control.abort();},[load]);
 const start=()=>{if(!data)return;setPrice(data.booking.finalPrice==null?"":String(data.booking.finalPrice));setCurrency(data.booking.currency||"KRW");setPayment(data.booking.paymentMethod||"cash");setEditing(true);};
 const submit=async()=>{
  if(!data)return;setBusy(true);
  try{
   const result=await adminApi<{message:string}>("/api/studio/settlements",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reservationid:reservationId,price:Number(price),currency,paymentMethod:payment,version:data.booking.settlementVersion,action:manager?"confirm":"submit"})});
   setEditing(false);const next=await load();if(manager)onConfirmed(next.booking);toast.success(result.message);
  }catch(error){toast.error(error instanceof Error?error.message:"提交失败");}finally{setBusy(false);}
 };
 const decide=async(action:"approve"|"reject"|"withdraw")=>{
  if(!data?.pending)return;setBusy(true);
  try{
   const result=await adminApi<{message:string}>("/api/studio/settlements/"+data.pending.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,note:reason})});
   setRejecting(false);setReason("");const next=await load();if(action==="approve")onConfirmed(next.booking);toast.success(result.message);
  }catch(error){toast.error(error instanceof Error?error.message:"处理失败");}finally{setBusy(false);}
 };
 if(error)return <section className="admin-panel settlement-card"><h2>本次结算</h2><p role="alert">{error}</p><Button variant="outline" onClick={()=>void load().catch(error=>setError(error.message))}>重新读取</Button></section>;
 if(!data)return <section className="admin-panel settlement-card" role="status">正在读取结算…</section>;
 const {booking,policy,pending,history}=data,hasPrice=booking.finalPrice!==null;
 const commission=/^\d+$/.test(price)&&policy.rateBps!==null?commissionForPrice(Number(price),policy.rateBps):null;
 const latest=history[0];
 return <section className="admin-panel settlement-card" aria-label="本次结算">
  <header className="settlement-heading"><div><h2>本次结算</h2><span className="settlement-status">{pending?(hasPrice?"更正待审核":"待审核"):hasPrice?(booking.settlementApprovedAt?"已确认":"历史已录入"):"未提交"}</span></div>{!pending&&!editing&&<Button variant="outline" type="button" onClick={start}>{hasPrice?(manager?"修改并确认":"申请更正"):(manager?"录入结算":"提交结算")}</Button>}</header>
  {editing?<form onSubmit={event=>{event.preventDefault();void submit();}}>
   <div className="settlement-form-grid">
    <div className="admin-field"><Label htmlFor="settlement-final-price">最终价格</Label><Input id="settlement-final-price" type="number" inputMode="numeric" min={0} max={2147483647} step={1} value={price} onChange={event=>setPrice(event.target.value)} disabled={busy} placeholder="填写这单的最终价格" required/></div>
    <div className="admin-field"><Label>币种</Label><AdminSelect label="结算币种" value={currency} onValueChange={setCurrency} disabled={busy} options={["KRW","CNY","USD"].map(value=>({value,label:currencyLabel(value)}))}/></div>
    <div className="admin-field"><Label>支付方式</Label><AdminSelect label="支付方式" value={payment} onValueChange={setPayment} disabled={busy} options={methods}/></div>
   </div>
   <div className="settlement-calculation"><span>{policy.serviceName} · {policy.rateBps==null?"尚未设置提成比例":(policy.rateBps/100)+"%"}</span><strong>员工提成：{money(commission,currency)}</strong></div>
   {policy.rateBps===null?<p className="settlement-help">{manager?<Link href={"/dashboard/content?view=services&project="+policy.serviceId} onClick={event=>{if(dirty){event.preventDefault();navigate(()=>window.location.assign("/dashboard/content?view=services&project="+policy.serviceId));}}}>先设置该项目的提成比例</Link>:"请联系店长或管理员设置该项目的提成比例。"}</p>:<p className="settlement-help">{manager?"确认后计入正式业绩。":"提交后等待店长或管理员确认，审核前不计入正式业绩。"}</p>}
   <div className="settlement-actions"><Button variant="ghost" type="button" disabled={busy} onClick={()=>navigate(()=>setEditing(false))}>取消</Button><Button type="submit" disabled={busy||!/^\d+$/.test(price)||Number(price)>2147483647||policy.rateBps===null}>{busy?"正在提交…":manager?"确认结算":"提交审核"}</Button></div>
  </form>:<>
   {hasPrice&&<dl className="settlement-summary"><div><dt>最终价格</dt><dd>{money(booking.finalPrice,booking.currency)}</dd></div><div><dt>员工提成</dt><dd>{money(booking.commissionAmount,booking.currency)}</dd>{booking.commissionRateBps!=null&&<small>最终价格 × {booking.commissionRateBps/100}%</small>}</div></dl>}
   {!hasPrice&&!pending&&<p className="settlement-empty">填写最终价格，系统会按项目比例计算提成。</p>}
   {latest?.status==="rejected"&&!pending&&<p className="settlement-returned">上次申请已退回：{latest.reviewNote}</p>}
  </>}
  {pending&&<div className="settlement-pending" aria-label="待审核结算申请"><div className="settlement-pending-title"><strong>待审核申请</strong><span>{pending.submittedByName} · {time(pending.submittedAt)}</span></div><p>{pending.serviceName} · {methods.find(method=>method.value===pending.paymentMethod)?.label||pending.paymentMethod} · 提成比例 {pending.commissionRateBps/100}%</p><dl className="settlement-summary"><div><dt>申请最终价格</dt><dd>{money(pending.price,pending.currency)}</dd></div><div><dt>计算提成</dt><dd>{money(pending.commissionAmount,pending.currency)}</dd></div></dl>
   {rejecting?<div className="settlement-rejection"><Label htmlFor="settlement-reject-reason">退回原因</Label><Textarea id="settlement-reject-reason" maxLength={1000} rows={2} value={reason} onChange={event=>setReason(event.target.value)} disabled={busy}/><div className="settlement-actions"><Button type="button" variant="ghost" disabled={busy} onClick={()=>setRejecting(false)}>取消</Button><Button type="button" disabled={busy||!reason.trim()} onClick={()=>void decide("reject")}>确认退回</Button></div></div>:<div className="settlement-actions">{manager?<><Button type="button" variant="outline" disabled={busy} onClick={()=>setRejecting(true)}>退回申请</Button><Button type="button" disabled={busy} onClick={()=>void decide("approve")}>确认结算</Button></>:pending.submittedById===session?.id?<Button type="button" variant="outline" disabled={busy} onClick={()=>void decide("withdraw")}>撤回申请</Button>:null}</div>}
  </div>}
  {memberBalance!=null&&<p className="settlement-help">会员卡余额（本单结算后）：{Math.max(0,Number(memberBalance)-(booking.paymentMethod==="memberCard"?(booking.finalPrice||0):0)).toLocaleString()} 韩元</p>}
  {!!history.length&&<details className="settlement-history"><summary>申请记录 · {history.length}</summary>{history.map(request=><article key={request.id}><div><strong>{settlementStatusLabel(request.status)}</strong><span>{time(request.submittedAt)}</span></div><p>{request.serviceName} · 最终价格 {money(request.price,request.currency)} · 提成 {money(request.commissionAmount,request.currency)}（{request.commissionRateBps/100}%）</p><small>提交：{request.submittedByName}{request.reviewedByName?" · 处理："+request.reviewedByName+(request.reviewedAt?"（"+time(request.reviewedAt)+"）":""):""}{request.reviewNote?" · "+request.reviewNote:""}</small></article>)}</details>}
 </section>;
}

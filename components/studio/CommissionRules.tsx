"use client";

import {useCallback,useEffect,useState} from "react";
import {adminApi} from "@/lib/admin-api";
import {seoulDay} from "@/lib/studio/booking";
import {currencyLabel} from "@/lib/studio/settlement";
import type {CommissionSnapshot,CommissionTier} from "@/lib/studio/commission";
import {AdminSelect} from "@/components/admin/FormControls";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useUnsavedChanges} from "@/components/admin/UnsavedChanges";
import {toast} from "sonner";

type Rule=CommissionSnapshot;
type Data={rules:Rule[];staff:{id:string;name:string;services:string[]}[];services:{id:string;name:string}[];actorId:string;manager:boolean};
const percentage=(bps:number)=>bps/100+"%";
const amount=(n:number)=>n>=10000&&n%10000===0?n/10000+"万":n.toLocaleString();
function periods(rules:Rule[],artistId:string|null){
 const candidates=rules.filter(rule=>!rule.nailArtistId||rule.nailArtistId===artistId);
 const dates=[...new Set(candidates.map(rule=>rule.effectiveFrom||"0001-01-01"))].sort();
 const rows:{from:string;until:string|null;rule:Rule}[]=[];
 for(const date of dates){
  const available=candidates.filter(rule=>(rule.effectiveFrom||"0001-01-01")<=date).sort((a,b)=>(b.effectiveFrom||"").localeCompare(a.effectiveFrom||""));
  const rule=available.find(rule=>!!artistId&&rule.nailArtistId===artistId)||available.find(rule=>!rule.nailArtistId);
  if(!rule||rows.at(-1)?.rule.id===rule.id)continue;
  if(rows.length)rows[rows.length-1].until=date;
  rows.push({from:date,until:null,rule});
 }
 return rows.reverse();
}
const untilLabel=(date:string)=>new Date(Date.parse(date)-86400000).toISOString().slice(0,10);
function TierList({tiers,currency}:{tiers:CommissionTier[];currency:string}){
 return <dl className="commission-tier-list">{tiers.map((tier,index)=><div key={tier.minimum}><dt>{index===0&&tiers.length===1?"全部营业额":index===0?"低于 "+amount(tiers[1].minimum):amount(tier.minimum)+"（含）"+(tiers[index+1]?"至 "+amount(tiers[index+1].minimum)+" 以下":"以上")} {currencyLabel(currency)}</dt><dd>店铺 {percentage(tier.storeRateBps)}<span>员工 {percentage(10000-tier.storeRateBps)}</span></dd></div>)}</dl>;
}
export default function CommissionRules({serviceId,editable=false}:{serviceId?:string;editable?:boolean}){
 const[data,setData]=useState<Data>(),[error,setError]=useState(""),[subject,setSubject]=useState(""),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false);
 const[date,setDate]=useState(seoulDay()),[currency,setCurrency]=useState("KRW"),[tiers,setTiers]=useState([{minimum:"0",store:"50"},{minimum:"4000000",store:"40"}]);
 const navigate=useUnsavedChanges(creating,()=>setCreating(false));
 const load=useCallback(async()=>{const value=await adminApi<Data>("/api/studio/commission-policies"+(serviceId?"?service="+encodeURIComponent(serviceId):""));setData(value);setError("");},[serviceId]);
 useEffect(()=>{void load().catch(error=>setError(error.message));},[load]);
 const publish=async()=>{
  if(!serviceId)return;setBusy(true);
  try{const response=await adminApi<{message:string}>("/api/studio/commission-policies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceId,nailArtistId:subject||null,currency,effectiveFrom:date,tiers:tiers.map(tier=>({minimum:Number(tier.minimum),storeRateBps:Math.round(Number(tier.store)*100)}))})});setCreating(false);await load();toast.success(response.message);}catch(error){toast.error(error instanceof Error?error.message:"发布失败");}finally{setBusy(false);}
 };
 if(error)return <div role="alert">{error}<Button variant="ghost" onClick={()=>void load().catch(error=>setError(error.message))}>重试</Button></div>;
 if(!data)return <p role="status">正在读取提成规则…</p>;
 const manager=editable&&data.manager,artistId=manager?(subject||null):data.actorId;
 const groups=data.services.filter(service=>!serviceId||service.id===serviceId).flatMap(service=>[currency].map(currency=>({service,currency,periods:periods(data.rules.filter(rule=>rule.serviceId===service.id&&rule.currency===currency),artistId)}))).filter(group=>group.periods.length);
 return <section className="commission-rules" aria-label="提成规则">
  <div className="commission-rules-heading"><h3>{editable?"提成规则":"我的提成规则"}</h3>{manager&&<Button variant="outline" onClick={()=>creating?navigate(()=>setCreating(false)):setCreating(true)} disabled={busy}>{creating?"收起":"新增生效规则"}</Button>}</div>
  <p className="commission-rule-note">每位员工、每月、每个项目分别累计已确认的最终价格。达标后整月使用达标档；每单按服务日期对应的规则计算。</p>
  <div className="commission-rule-filters">{manager&&<AdminSelect label="规则适用员工" value={subject} onValueChange={value=>navigate(()=>{setSubject(value);setCreating(false);})} disabled={busy} options={[{value:"",label:"全部员工 · 项目默认"},...data.staff.map(person=>({value:person.id,label:person.name}))]}/>}<AdminSelect label="规则币种" value={currency} onValueChange={setCurrency} disabled={busy} options={["KRW","CNY","USD"].map(value=>({value,label:currencyLabel(value)}))}/></div>
  {creating&&manager&&<form className="commission-rule-form" onSubmit={event=>{event.preventDefault();void publish();}}>
   <div className="commission-rule-fields"><label>生效日期<Input aria-label="规则生效日期" type="date" value={date} onChange={event=>setDate(event.target.value)} required disabled={busy}/></label></div>
   <p className="commission-rule-note">从该日零点起生效（韩国时间，含当天）。已有订单和已提交申请的规则保持不变。</p>
   <div className="commission-tier-fields">{tiers.map((tier,index)=><div key={index}><label>营业额从<Input aria-label={"第 "+(index+1)+" 档营业额门槛"} type="number" inputMode="numeric" min={0} max={2147483647} step={1} required readOnly={index===0} disabled={busy} value={tier.minimum} onChange={event=>setTiers(rows=>rows.map((row,i)=>i===index?{...row,minimum:event.target.value}:row))}/></label><label>店铺抽成 · %<Input aria-label={"第 "+(index+1)+" 档店铺抽成"} type="number" min={0} max={100} step={0.01} required disabled={busy} value={tier.store} onChange={event=>setTiers(rows=>rows.map((row,i)=>i===index?{...row,store:event.target.value}:row))}/><small>员工 {tier.store===""?"—":(10000-Math.round(Number(tier.store)*100))/100}%</small></label>{index>0&&<Button variant="ghost" type="button" disabled={busy} onClick={()=>setTiers(rows=>rows.filter((_,i)=>i!==index))}>移除</Button>}</div>)}</div>
   <div className="commission-rule-actions"><Button variant="ghost" type="button" disabled={busy||tiers.length>=8} onClick={()=>setTiers(rows=>[...rows,{minimum:String(Number(rows.at(-1)?.minimum||0)+4000000),store:"40"}])}>增加档位</Button><Button type="submit" disabled={busy}>{busy?"正在发布…":"发布规则"}</Button></div>
  </form>}
  {!groups.length&&!creating&&<p className="simple-empty">尚未设置提成规则{manager?"，点击新增生效规则。":"，请联系店长或管理员。"}</p>}
  {groups.map(group=><div className="commission-rule-group" key={group.service.id+group.currency}>
   <h4>{group.service.name} · {currencyLabel(group.currency)}</h4>
   {group.periods.map(period=><article key={period.rule.id}><header><strong>{period.from==="0001-01-01"?"历史固定规则":period.from}{period.until?" 至 "+untilLabel(period.until):period.from==="0001-01-01"?"":" 起"}</strong>{period.rule.nailArtistId&&<small>员工专属</small>}</header><TierList tiers={period.rule.tiers} currency={group.currency}/></article>)}
  </div>)}
 </section>;
}

"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {adminApi} from "@/lib/admin-api";
import {useAdminSession} from "@/components/admin/AdminShell";
import {AdminSelect} from "@/components/admin/FormControls";
import {MonthPicker} from "@/components/ui/month-picker";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from "@/components/ui/table";

type Result={
 count:number;scope:string;staff:{id:string;name:string}[];
 totals:{currency:string;revenue:number;received:number;commission:number;priced:number;receivedCount:number;commissionCount:number}[];
 rows:{id:string;date:string;timeSlot:string;artist:string;currency:string|null;finalPrice:number|null;receivedAmount:number|null;commissionAmount:number|null}[];
};
const currencyLabels:Record<string,string>={KRW:"韩元（KRW）",USD:"美元（USD）",CNY:"人民币（CNY）",未结算:"未标记币种"};

export default function PerformancePanel({month,onMonthChange}:{month:string;onMonthChange:(value:string)=>void}){
 const session=useAdminSession();
 const [staff,setStaff]=useState("");
 const [people,setPeople]=useState<Result["staff"]>([]);
 const [data,setData]=useState<Result>();
 const [error,setError]=useState("");
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  setError("");setData(undefined);
  const control=new AbortController();
  void adminApi<Result>("/api/studio/performance?month="+month+"&staff="+encodeURIComponent(staff),{signal:control.signal})
   .then(value=>{setData(value);setPeople(value.staff);})
   .catch(error=>{if(!control.signal.aborted)setError(error.message);});
  return()=>control.abort();
 },[month,staff,retry]);
 const amount=(value:number|null,currency:string|null)=>value==null?"未录入":value.toLocaleString()+" "+(currency||"未标记币种");
 return <>

  <section className="simple-filters performance-filters" aria-label="业绩筛选">
   <div className="admin-field"><Label>到店月份</Label><MonthPicker value={month} onChange={onMonthChange} ariaLabel="到店月份"/></div>
   {session?.memberType==="manager"&&<div className="admin-field"><Label htmlFor="performance-staff">服务员工</Label><AdminSelect id="performance-staff" label="服务员工" value={staff} onValueChange={setStaff} options={[{value:"",label:"全部员工"},...people.map(person=>({value:person.id,label:person.name}))]}/></div>}
   <span className="performance-booking-count">{data?data.count+" 次预约":"正在汇总…"}</span>
  </section>
  {error?<div className="simple-chart-state" role="alert"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>重新加载</Button></div>:!data?<p className="simple-chart-state" role="status">正在汇总业绩…</p>:<>
   {!data.totals.length&&<p className="simple-empty">这个月还没有业绩记录</p>}
   {data.rows.some(row=>row.finalPrice==null)&&<p className="simple-data-note">{data.rows.filter(row=>row.finalPrice==null).length} 单尚未录入金额</p>}
   {data.totals.filter(total=>total.priced||total.receivedCount||total.commissionCount).map(total=><section className="performance-summary" key={total.currency}>
    <h2>{currencyLabels[total.currency]||total.currency}</h2>
    <dl className="simple-metrics">
     {[
      {title:"营业额",amount:total.revenue,count:total.priced},
      {title:"实际收款",amount:total.received,count:total.receivedCount},
      {title:session?.memberType==="manager"?"员工提成":"个人提成",amount:total.commission,count:total.commissionCount},
     ].map(metric=><div key={metric.title}><dt>{metric.title}</dt><dd className={metric.count?undefined:"is-unrecorded"}>{metric.count?metric.amount.toLocaleString():"未录入"}</dd><small>{metric.count} 单已录入</small></div>)}
    </dl>
   </section>)}
   <details className="simple-order-details performance-details"><summary>订单明细<span>{data.rows.length} 条记录</span></summary>
    <Table>
     <TableHeader><TableRow><TableHead>到店时间</TableHead><TableHead>服务员工</TableHead><TableHead className="text-right">营业额</TableHead><TableHead className="text-right">实收</TableHead><TableHead className="text-right">提成</TableHead></TableRow></TableHeader>
     <TableBody>{data.rows.map(row=><TableRow key={row.id}>
      <TableCell><Link className="performance-order-link" href={"/reservation/"+row.id}><span>{row.date.slice(0,10)}<small>{row.timeSlot}</small></span><ArrowUpRight size={14}/></Link></TableCell>
      <TableCell>{row.artist}</TableCell>
      <TableCell className={"text-right tabular-nums "+(row.finalPrice==null?"is-unrecorded":"")}>{amount(row.finalPrice,row.currency)}</TableCell>
      <TableCell className={"text-right tabular-nums "+(row.receivedAmount==null?"is-unrecorded":"")}>{amount(row.receivedAmount,row.currency)}</TableCell>
      <TableCell className={"text-right tabular-nums "+(row.commissionAmount==null?"is-unrecorded":"")}>{amount(row.commissionAmount,row.currency)}</TableCell>
     </TableRow>)}</TableBody>
    </Table>
    {!data.rows.length&&<div className="performance-empty">当前筛选下暂无订单。</div>}
   </details>
   <p className="performance-footnote">营业额是已录入的订单金额。实收和提成未填写时显示「未录入」；提成按结算时的实收及比例计算。</p>
  </>}
 </>;
}

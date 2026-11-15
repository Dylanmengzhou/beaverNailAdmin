"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowUpRight, BadgePercent, CalendarDays, Receipt, Wallet} from "lucide-react";
import {adminApi} from "@/lib/admin-api";
import {useAdminSession} from "@/components/admin/AdminShell";
import {PanelState} from "@/components/admin/PageHeading";
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

  <section className="admin-panel performance-filters" aria-label="业绩筛选">
   <div className="admin-field"><Label>预约月份</Label><MonthPicker value={month} onChange={onMonthChange} ariaLabel="预约月份"/></div>
   {session?.memberType==="manager"&&<div className="admin-field"><Label htmlFor="performance-staff">服务员工</Label><AdminSelect id="performance-staff" label="服务员工" value={staff} onValueChange={setStaff} options={[{value:"",label:"全部员工"},...people.map(person=>({value:person.id,label:person.name}))]}/></div>}
   <span className="performance-booking-count"><CalendarDays size={16}/>{data?data.count+" 次预约":"正在汇总…"}</span>
  </section>
  {error?<PanelState title={error}><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>重新加载</Button></PanelState>:!data?<PanelState loading title="正在汇总业绩…"/>:<>
   {!data.totals.length&&<section className="admin-panel"><PanelState title="这个月还没有业绩记录">换一个月份，查看已经完成的成果。</PanelState></section>}
   {data.totals.map(total=><section className="performance-group" key={total.currency}>
    <div className="performance-group-heading"><h2>{total.currency}</h2><span>按预约月份统计</span></div>
    <div className="earnings-cards">
     {[
      {title:"营业额",amount:total.revenue,count:total.priced,icon:Receipt,color:"pink",description:"订单最终金额"},
      {title:"实际收款",amount:total.received,count:total.receivedCount,icon:Wallet,color:"lilac",description:"已确认的收款金额"},
      {title:session?.memberType==="manager"?"员工提成":"个人提成",amount:total.commission,count:total.commissionCount,icon:BadgePercent,color:"yellow",description:"按结算时的比例计算"},
     ].map(metric=><div className={"earnings-metric tone-"+metric.color} key={metric.title}>
      <div className="earnings-metric-top"><span>{metric.title}</span><metric.icon size={19}/></div>
      <strong>{metric.amount.toLocaleString()}<small>{total.currency}</small></strong>
      <p>{metric.description}</p><span className="earnings-metric-count">{metric.count} 单已录入</span>
     </div>)}
    </div>
   </section>)}
   <section className="admin-panel performance-details">
    <div className="admin-panel-heading"><div><h2>订单明细</h2><p>点击到店时间，查看对应订单和结算记录。</p></div><span className="admin-chip neutral">{data.rows.length} 条记录</span></div>
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
   </section>
   <p className="performance-footnote">历史订单没有录入实收或提成时保留「未录入」。提成按每单实收及结算时的比例计算。</p>
  </>}
 </>;
}

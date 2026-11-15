"use client";

import {useEffect,useMemo,useState,type ReactNode} from "react";
import {ChevronDown} from "lucide-react";
import {useAdminSession} from "@/components/admin/AdminShell";
import {adminApi} from "@/lib/admin-api";
import {seoulDay} from "@/lib/studio/booking";
import {Button} from "@/components/ui/button";
import {MonthPicker} from "@/components/ui/month-picker";
import {Bar,BarChart,CartesianGrid,Legend,Line,LineChart,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from "recharts";

import {artistPoints,trendPoints,type TrendRow as StatRow,type TrendArtist as Artist} from "@/lib/studio/statistics-view";
type Overview={month:string;daily:{day:string;count:number;revenue:number}[];byPayment:{method:string;count:number}[];byTimeSlot:{slot:string;count:number}[];summary:{count:number;pricedCount:number;revenue:number};prev:{count:number;revenue:number}};
const colors=["#96718a","#6e8b8a","#a38b63","#7e83a0","#82936c","#aa7c77","#5e899e","#997d9e"];
const paymentLabels:Record<string,string>={cash:"现金",memberCard:"会员卡",wechat:"微信",alipay:"支付宝",card:"刷卡",unknown:"未标记"};
const currentMonth=()=>seoulDay().slice(0,7);
const number=(value:number)=>value.toLocaleString();
const axis={fontSize:11,fill:"#9a8f97"};
const grid="#eee8ec";

function ChartPanel({title,children,expandable=false}:{title:string;children:ReactNode;expandable?:boolean}){
 const [open,setOpen]=useState(!expandable);
 return <section className={"stats-chart "+(expandable?"is-expandable":"")}>
  {expandable?<Button type="button" variant="ghost" className="stats-chart-toggle" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><span>{title}</span><ChevronDown size={15} className={open?"is-open":""}/></Button>:<h2>{title}</h2>}
  {open&&<div className="stats-chart-body">{children}</div>}
 </section>;
}
function Loading({error,retry}:{error:string;retry:()=>void}){
 return <div className="simple-chart-state" role={error?"alert":"status"}><p>{error||"正在读取数据…"}</p>{error&&<Button variant="outline" onClick={retry}>重新加载</Button>}</div>;
}
function TrendLine({data,metric}:{data:Record<string,number|string>[];metric:string}){
 const average=data.length?Math.round(data.reduce((sum,row)=>sum+Number(row[metric]||0),0)/data.length):0;
 return <ResponsiveContainer width="100%" height={230}><LineChart data={data} margin={{left:4,right:16,top:8,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false}/><XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false}/><YAxis tick={axis} tickLine={false} axisLine={false} width={58} tickFormatter={number} allowDecimals={false}/><Tooltip formatter={value=>number(Number(value))}/><ReferenceLine y={average} stroke="#c8bac3" strokeDasharray="4 4" label={{value:"平均 "+number(average),position:"insideTopRight",fill:"#a896a1",fontSize:10}}/><Line type="monotone" dataKey={metric} stroke={colors[0]} strokeWidth={2} dot={{r:2}}/></LineChart></ResponsiveContainer>;
}

export function OverviewTab({month,onMonthChange}:{month:string;onMonthChange:(value:string)=>void}){
 const session=useAdminSession(),[data,setData]=useState<Overview>(),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(session?.memberType!=="manager")return;
  const control=new AbortController();setData(undefined);setError("");
  void adminApi<Overview&{success:boolean}>("/api/getMonthlyOverview?month="+month,{signal:control.signal}).then(value=>{if(!value.success)throw new Error("读取预约概览失败");setData(value);}).catch(error=>{if(!control.signal.aborted)setError(error.message);});
  return()=>control.abort();
 },[month,session?.memberType,retry]);
 if(session?.memberType!=="manager")return null;
 const change=(now:number,before:number)=>before>0?Math.round((now-before)/before*1000)/10:null;
 const countChange=data?change(data.summary.count,data.prev.count):null,revenueChange=data?change(data.summary.revenue,data.prev.revenue):null;
 const [y,m]=month.split("-").map(Number),days=new Date(y,m,0).getDate();
 const daily=Array.from({length:days},(_,index)=>({day:String(index+1),预约数:data?.daily.find(row=>row.day===month+"-"+String(index+1).padStart(2,"0"))?.count||0}));
 const payments=[...(data?.byPayment||[])].sort((a,b)=>b.count-a.count),paymentCount=payments.reduce((sum,row)=>sum+row.count,0);
 const slots=[...(data?.byTimeSlot||[])].sort((a,b)=>a.slot.localeCompare(b.slot)).map(row=>({slot:row.slot,预约数:row.count}));
 return <>
  <div className="simple-filters"><span className="simple-filter-label">到店月份</span><MonthPicker value={month} max={currentMonth()} onChange={onMonthChange} ariaLabel="到店月份"/></div>
  {!data?<Loading error={error} retry={()=>setRetry(value=>value+1)}/>:<>
   <dl className="simple-metrics overview-metrics">{[
    {label:"预约数",value:number(data.summary.count),change:countChange},
    {label:"营业额 · 韩元",value:number(data.summary.revenue),change:revenueChange},
    {label:"客单价 · 韩元",value:number(data.summary.pricedCount?Math.round(data.summary.revenue/data.summary.pricedCount):0)},
    {label:"已标价订单 · 韩元",value:data.summary.pricedCount+" 单"},
   ].map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>{item.change!=null&&<small>环比 {item.change>0?"+":""}{item.change}%</small>}</div>)}</dl>
   {!data.summary.count?<p className="simple-empty">该月暂无预约数据</p>:<div className="stats-chart-grid">
    <ChartPanel title="每日预约"><ResponsiveContainer width="100%" height={230}><BarChart data={daily}><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false}/><XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd"/><YAxis tick={axis} tickLine={false} axisLine={false} width={30} allowDecimals={false}/><Tooltip labelFormatter={value=>m+"月"+value+"日"}/><Bar dataKey="预约数" fill={colors[0]} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></ChartPanel>
    <ChartPanel title="时间段分布" expandable><ResponsiveContainer width="100%" height={220}><BarChart data={slots}><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false}/><XAxis dataKey="slot" tick={axis} tickLine={false} axisLine={false}/><YAxis tick={axis} tickLine={false} axisLine={false} width={30} allowDecimals={false}/><Tooltip/><Bar dataKey="预约数" fill={colors[1]} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></ChartPanel>
    <ChartPanel title="支付方式" expandable><table className="simple-payment-table"><thead><tr><th>支付方式</th><th>预约数</th><th>占比</th></tr></thead><tbody>{payments.map(row=><tr key={row.method}><td>{paymentLabels[row.method]||row.method}</td><td>{row.count}</td><td>{paymentCount?Math.round(row.count/paymentCount*1000)/10:0}%</td></tr>)}</tbody></table></ChartPanel>
   </div>}
  </>}
 </>;
}

export function TrendsTab(){
 const session=useAdminSession(),[data,setData]=useState<{rows:StatRow[];artists:Artist[]}>(),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 const [start,setStart]=useState(""),[end,setEnd]=useState(""),[metric,setMetric]=useState<"count"|"revenue">("count");
 useEffect(()=>{
  if(session?.memberType!=="manager")return;
  const control=new AbortController();setError("");
  void adminApi<{success:boolean;rows:StatRow[];artists:Artist[]}>("/api/getReservationStats",{signal:control.signal}).then(value=>{
   if(!value.success)throw new Error("读取历史趋势失败");setData(value);
   const months=[...new Set(value.rows.map(row=>row.month))].sort().filter(month=>month<=currentMonth());
   setEnd(months.at(-1)||"");setStart(months[Math.max(0,months.length-6)]||"");
  }).catch(error=>{if(!control.signal.aborted)setError(error.message);});
  return()=>control.abort();
 },[session?.memberType,retry]);
 const months=useMemo(()=>[...new Set(data?.rows.map(row=>row.month)||[])].sort().filter(month=>(!start||month>=start)&&(!end||month<=end)),[data,start,end]);
 const points=useMemo(()=>trendPoints(data?.rows||[],months),[data,months]);
 const byArtist=useMemo(()=>artistPoints(data?.rows||[],data?.artists||[],months,metric),[data,months,metric]);
 if(session?.memberType!=="manager")return null;
 if(!data)return <Loading error={error} retry={()=>setRetry(value=>value+1)}/>;
 return <>
  <div className="simple-filters"><span className="simple-filter-label">时间范围</span><MonthPicker value={start} max={end||undefined} onChange={setStart} ariaLabel="开始月份"/><span className="simple-filter-label">至</span><MonthPicker value={end} min={start||undefined} onChange={setEnd} ariaLabel="结束月份"/><span className="simple-filter-count">{months.length} 个月</span></div>
  {!points.length?<p className="simple-empty">当前范围暂无预约数据</p>:<div className="stats-trend-grid">
   <ChartPanel title="每月预约"><TrendLine data={points} metric="预约数"/></ChartPanel>
   <ChartPanel title="每月营业额 · 韩元"><TrendLine data={points} metric="营业额"/></ChartPanel>
   <ChartPanel title="每月客单价 · 韩元" expandable><TrendLine data={points} metric="客单价"/></ChartPanel>
   <ChartPanel title="员工业绩" expandable><div className="stats-metric-switch" role="group" aria-label="员工业绩指标"><Button size="sm" variant={metric==="count"?"secondary":"ghost"} aria-pressed={metric==="count"} onClick={()=>setMetric("count")}>预约数</Button><Button size="sm" variant={metric==="revenue"?"secondary":"ghost"} aria-pressed={metric==="revenue"} onClick={()=>setMetric("revenue")}>营业额 · 韩元</Button></div><ResponsiveContainer width="100%" height={260}><LineChart data={byArtist}><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false}/><XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false}/><YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={55}/><Tooltip formatter={value=>number(Number(value))}/><Legend wrapperStyle={{fontSize:11}}/>{data.artists.map((artist,index)=><Line key={artist.id} dataKey={artist.id} name={artist.name} type="monotone" stroke={colors[index%colors.length]} strokeWidth={2} dot={{r:2}}/>)}</LineChart></ResponsiveContainer></ChartPanel>
  </div>}
 </>;
}

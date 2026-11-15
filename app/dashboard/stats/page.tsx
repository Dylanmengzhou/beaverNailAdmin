"use client";

import {useState} from "react";
import dynamic from "next/dynamic";
import {useRouter,useSearchParams} from "next/navigation";
import {useAdminSession} from "@/components/admin/AdminShell";
import {Tabs,TabsContent,TabsList,TabsTrigger} from "@/components/ui/tabs";
import PerformancePanel from "@/components/studio/PerformancePanel";
import {seoulDay} from "@/lib/studio/booking";

const Overview=dynamic(()=>import("@/components/studio/OperationsCharts").then(module=>module.OverviewTab),{loading:()=> <p className="simple-chart-state" role="status">正在读取预约概览…</p>});
const Trends=dynamic(()=>import("@/components/studio/OperationsCharts").then(module=>module.TrendsTab),{loading:()=> <p className="simple-chart-state" role="status">正在读取历史趋势…</p>});

export default function StatsPage(){
 const session=useAdminSession(),params=useSearchParams(),router=useRouter();
 const [month,setMonth]=useState(seoulDay().slice(0,7));
 if(!session)return <p className="simple-chart-state" role="status">正在读取经营统计…</p>;
 const manager=session.memberType==="manager";
 const requested=params.get("tab"),tab=manager&&["overview","trends"].includes(requested||"")?requested!:"performance";
 const selectTab=(value:string)=>{
  if(!manager&&value!=="performance")return;
  const next=new URLSearchParams(params.toString());next.set("tab",value);router.replace("/dashboard/stats?"+next.toString());
 };
 return <div className="analytics-page unified-statistics simple-statistics">
  <h1 className="sr-only">经营统计</h1>
  {!manager&&<p className="simple-toolbar-caption">仅显示你的业绩与订单</p>}
  {manager?<Tabs value={tab} onValueChange={selectTab}>
   <TabsList className="statistics-tabs"><TabsTrigger value="performance">业绩与结算</TabsTrigger><TabsTrigger value="overview">预约概览</TabsTrigger><TabsTrigger value="trends">历史趋势</TabsTrigger></TabsList>
   <TabsContent value="performance"><PerformancePanel month={month} onMonthChange={setMonth}/></TabsContent>
   <TabsContent value="overview"><Overview month={month} onMonthChange={setMonth}/></TabsContent>
   <TabsContent value="trends"><Trends/></TabsContent>
  </Tabs>:<PerformancePanel month={month} onMonthChange={setMonth}/>}
 </div>;
}

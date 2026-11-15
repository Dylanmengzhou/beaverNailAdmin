"use client";

import {useState} from "react";
import dynamic from "next/dynamic";
import {useRouter,useSearchParams} from "next/navigation";
import {ShieldCheck, UserRound} from "lucide-react";
import {useAdminSession} from "@/components/admin/AdminShell";
import {PageHeading,PanelState} from "@/components/admin/PageHeading";
import {Tabs,TabsContent,TabsList,TabsTrigger} from "@/components/ui/tabs";
import PerformancePanel from "@/components/studio/PerformancePanel";
import {seoulDay} from "@/lib/studio/booking";

const Overview=dynamic(()=>import("@/components/studio/OperationsCharts").then(module=>module.OverviewTab),{loading:()=> <PanelState loading title="正在加载预约概览…"/>});
const Trends=dynamic(()=>import("@/components/studio/OperationsCharts").then(module=>module.TrendsTab),{loading:()=> <PanelState loading title="正在加载历史趋势…"/>});

export default function StatsPage(){
 const session=useAdminSession(),params=useSearchParams(),router=useRouter();
 const [month,setMonth]=useState(seoulDay().slice(0,7));
 if(!session)return <PanelState loading title="正在读取经营统计…"/>;
 const manager=session.memberType==="manager";
 const requested=params.get("tab"),tab=manager&&["overview","trends"].includes(requested||"")?requested!:"performance";
 const selectTab=(value:string)=>{
  if(!manager&&value!=="performance")return;
  const next=new URLSearchParams(params.toString());next.set("tab",value);router.replace("/dashboard/stats?"+next.toString());
 };
 return <div className="analytics-page unified-statistics">
  <PageHeading eyebrow="YOUR WORK, IN NUMBERS" title="经营统计" description={manager?"汇总全店和员工的营业额、实际收款与提成，也可以查看预约概览和历史趋势。":"查看自己的营业额、实际收款与提成，记录每一份用心的成果。"}/>
  <p className="statistics-scope-note">{manager?<ShieldCheck size={15}/>:<UserRound size={15}/>}<span>{manager?"管理员视图 · 可查看全店数据，并按员工筛选业绩。":"个人视图 · 仅显示自己的业绩和订单。"}</span></p>
  {manager?<Tabs value={tab} onValueChange={selectTab}>
   <TabsList className="statistics-tabs"><TabsTrigger value="performance">业绩与结算</TabsTrigger><TabsTrigger value="overview">预约概览</TabsTrigger><TabsTrigger value="trends">历史趋势</TabsTrigger></TabsList>
   <TabsContent value="performance"><PerformancePanel month={month} onMonthChange={setMonth}/></TabsContent>
   <TabsContent value="overview"><Overview month={month} onMonthChange={setMonth}/></TabsContent>
   <TabsContent value="trends"><Trends/></TabsContent>
  </Tabs>:<PerformancePanel month={month} onMonthChange={setMonth}/>}
 </div>;
}

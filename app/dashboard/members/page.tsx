"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Crown,ArrowUpRight} from "lucide-react";
import {adminApi} from "@/lib/admin-api";
import {useAdminSession} from "@/components/admin/AdminShell";
import {PageHeading,PanelState} from "@/components/admin/PageHeading";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
type Result={count:number;rows:{id:string;name:string|null;nickname:string|null;email:string|null;balance:number;reservationCount:number}[]};
export default function Page(){
 const user=useAdminSession(),[q,setQ]=useState(""),[page,setPage]=useState(1),[data,setData]=useState<Result>(),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{const control=new AbortController();const timer=setTimeout(()=>{setError("");void adminApi<Result>("/api/studio/members?q="+encodeURIComponent(q)+"&page="+page,{signal:control.signal}).then(setData).catch(e=>{if(!control.signal.aborted)setError(e.message);});},200);return()=>{clearTimeout(timer);control.abort();};},[q,page,retry]);
 return <><PageHeading eyebrow="OUR LOVELY MEMBERS" title="会员专栏" description={user?.memberType==="manager"?"管理会员身份、余额，查看预约与消费记录。":"可查看全部会员资料、余额和消费记录。会员资料由管理员修改。"}/><div className="content-toolbar"><Input aria-label="搜索会员" placeholder="搜索昵称、姓名或联系方式" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/><Link href="/dashboard/user-reservation" className="admin-text-link">查找顾客并开通会员 ↗</Link></div>
 {error?<PanelState title={error}><Button onClick={()=>setRetry(n=>n+1)}>重试</Button></PanelState>:!data?<PanelState loading title="正在读取会员…"/>:<><p className="admin-subtle">共 {data.count} 位会员</p><div className="members-grid">{data.rows.map(member=><Link className="admin-panel member-summary" key={member.id} href={"/dashboard/user-reservation/user-detail?userId="+member.id}><Crown size={21}/><h2>{member.nickname||member.name||"未填写昵称"}</h2><p>{member.email||"暂无联系方式"}</p><div><span>会员卡余额</span><strong>{member.balance.toLocaleString()} KRW</strong></div><div><span>预约次数</span><strong>{member.reservationCount}</strong></div><span className="admin-text-link">查看会员 <ArrowUpRight size={14}/></span></Link>)}</div><div className="admin-inline"><Button variant="outline" disabled={page===1} onClick={()=>setPage(n=>n-1)}>上一页</Button><span>{page} / {Math.max(1,Math.ceil(data.count/20))}</span><Button variant="outline" disabled={page*20>=data.count} onClick={()=>setPage(n=>n+1)}>下一页</Button></div></>}
 </>;
}

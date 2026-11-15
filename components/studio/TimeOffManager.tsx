"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type DateRange } from "react-day-picker";
import {Calendar} from "@/components/ui/calendar";
import { zhCN } from "react-day-picker/locale/zh-CN";
import {ArrowLeft, CalendarDays, CalendarSync, MoonStar, Plus, UserRound} from "lucide-react";
import {useRouter,useSearchParams} from "next/navigation";
import {useUnsavedNavigation} from "@/components/admin/UnsavedChanges";
import {EntryCard} from "@/components/admin/EntryCard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { adminFetch } from "@/lib/admin-fetch";
import { isWeeklyClosure, seoulDay, slotInstant } from "@/lib/studio/booking";
import {
  calendarSpan,
  dayLabel,
  intervalLabel,
  restDayOverview,
  studioZone,
  type TimeOff,
} from "@/lib/studio/time-off-display";
import RestOverviewCalendar from "./RestOverviewCalendar";
import WeeklyClosures from "./WeeklyClosures";
import TimeOffEditor from "./TimeOffEditor";
import type { Staff } from "./StaffManager";
import "react-day-picker/style.css";
import "./time-off.css";

type View = "day" | "upcoming" | "all";
const views = { day: "当天", upcoming: "即将到来", all: "全部记录" } as const;

export default function TimeOffManager({ staff }: { staff: Staff[] }) {
  const today = seoulDay(),params=useSearchParams(),router=useRouter();
  const confirmNavigation=useUnsavedNavigation();
  const scope=params.get("rest");
  const selectedStaff=staff.find(person=>person.id===scope);
  const openScope=(value?:string)=>{
    const next=new URLSearchParams(params.toString());next.set("tab","off");
    if(value)next.set("rest",value);else next.delete("rest");
    confirmNavigation(()=>router.push("/dashboard/studio?"+next.toString()));
  };
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(slotInstant(today, "12:00"));
  const [weekly, setWeekly] = useState<number[]>([]);
  const [records, setRecords] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("upcoming");
  const [editor, setEditor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const [records, rule] = await Promise.all(
        ["time-off", "weekly-closures"].map(async (path) => {
          const response = await adminFetch("/api/studio/" + path, { signal });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "休息安排加载失败");
          return data;
        }),
      );
      if (!signal?.aborted) {
        setRecords(records);
        setWeekly(rule.closedWeekdays);
      }
    } catch (e) {
      if (!signal?.aborted)
        setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const spans = useMemo(
    () => records.map((record) => ({ record, ...calendarSpan(record) })),
    [records],
  );
  const scopedSpans=useMemo(()=>spans.filter(({record})=>scope==="all"||scope==="weekly"||!record.nailArtistId||(!!scope&&scope!=="store"&&record.nailArtistId===scope)),[spans,scope]);
  const weeklyText=weekly.length?"每周"+[1,2,3,4,5,6,0].filter(day=>weekly.includes(day)).map(day=>["日","一","二","三","四","五","六"][day]).join("、")+"休息":"未设固定休息日";
  const todayOverview=restDayOverview(today,weekly,records,staff);
  const calendarStatus=todayOverview.store.kind==="closed"?"今天全店休息":todayOverview.store.kind==="partial"?"今天部分时段店休":"今天正常营业";
  const calendarDescription=todayOverview.store.kind==="closed"?todayOverview.store.reason:todayOverview.people.length?"今天休息："+todayOverview.people.map(person=>person.name).join("、"):"今天没有店员休息";
  const upcoming=(id:string|null)=>records.filter(record=>record.nailArtistId===id&&Date.parse(record.endsAt)>Date.now()).length;
  const modifiers = useMemo(() => {
    const storeOff: DateRange[] = [];
    const staffOff: DateRange[] = [];
    for (const { record, from, to } of scopedSpans) {
      const target = record.nailArtistId ? staffOff : storeOff;
      target.push({
        from: slotInstant(from, "12:00"),
        to: slotInstant(to, "12:00"),
      });
    }
    return {
      storeOff,
      staffOff,
      weeklyOff: (date: Date) =>
        seoulDay(date) >= today && isWeeklyClosure(seoulDay(date), weekly),
    };
  }, [scopedSpans, today, weekly]);
  const fixedOff =
    view === "day" && day >= today && isWeeklyClosure(day, weekly);
  const visible = scopedSpans
    .filter(({ record, from, to }) => {
      if (view === "day") return from <= day && day <= to;
      return view === "all" || Date.parse(record.endsAt) > Date.now();
    })
    .sort(
      (a, b) =>
        (view === "all" ? -1 : 1) *
        (Date.parse(a.record.startsAt) - Date.parse(b.record.startsAt)),
    );

  function selectDay(date: Date) {
    setDay(seoulDay(date));
    setMonth(date);
    setView("day");
    setConfirmId(null);
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      const response = await adminFetch(
        "/api/studio/time-off?id=" + encodeURIComponent(id),
        { method: "DELETE" },
      );
      if (!response.ok)
        throw new Error((await response.json()).error || "撤销失败");
      setRecords((items) => items.filter((item) => item.id !== id));
      setConfirmId(null);
      toast.success("已撤销休息安排");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "撤销失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  const calendar=(
            <section
              className="admin-panel rest-calendar"
              aria-label="休息日历"
            >
              <Calendar
                className="rest-picker"
                mode="single"
                required
                selected={slotInstant(day, "12:00")}
                month={month}
                onMonthChange={(date) =>
                  selectDay(
                    seoulDay(date).slice(0, 7) === today.slice(0, 7)
                      ? slotInstant(today, "12:00")
                      : date,
                  )
                }
                onSelect={selectDay}
                locale={zhCN}
                timeZone={studioZone}
                modifiers={modifiers}
                modifiersClassNames={{
                  storeOff: "store-off",
                  weeklyOff: "weekly-off",
                  staffOff: "staff-off",
                }}
                labels={{
                  labelDayButton: (date, flags) =>
                    [
                      seoulDay(date),
                      flags.today && "今天",
                      flags.weeklyOff && "全店固定休息",
                      flags.storeOff && "全店休息",
                      flags.staffOff && "员工休息",
                      flags.selected && "已选",
                    ]
                      .filter(Boolean)
                      .join("，"),
                }}
              />
              <div className="rest-legend">
                <span><i className="weekly-dot"/>固定店休</span>
                <span><i className="temporary-dot"/>临时店休</span>
                {!!scope&&<span><i className="staff-dot"/>店员休息</span>}
                <Button variant="ghost"
                  type="button"
                  onClick={() => selectDay(slotInstant(today, "12:00"))}
                >
                  回到今天
                </Button>
              </div>
            </section>
  );
  return (
    <div className="rest-manager">
      {scope&&<header className="rest-header">
        <div>
          <h1>{scope==="weekly"?"全店固定休息日":scope==="store"?"全店临时休息":selectedStaff?selectedStaff.name+" · 休息安排":scope==="all"?"休息日历":"休息安排"}</h1>
          <p>{scope==="all"?"查看全店与店员每天的休息安排 · 韩国时间":"全店店休对所有项目和员工生效 · 首尔时间"}</p>
        </div>
        <div className="rest-header-actions">
        {scope&&<Button variant="outline" disabled={busy} onClick={()=>openScope()}><ArrowLeft size={14}/>休息列表</Button>}
        <Dialog
          open={editor}
          onOpenChange={(open) => {
            if (!busy){if(open)setEditor(true);else confirmNavigation(()=>setEditor(false));}
          }}
        >
          {scope&&scope!=="weekly"&&scope!=="all"&&<DialogTrigger asChild>
            <Button disabled={busy || loading || !!error}>
              <Plus size={16} />
              添加临时休息
            </Button>
          </DialogTrigger>}
          {editor && (
            <TimeOffEditor
              initialScope={selectedStaff?.id||""}
              day={day}
              staff={staff}
              busy={busy}
              setBusy={setBusy}
              onSave={(record) => {
                setRecords((items) => [...items, record]);
                const next=new URLSearchParams(params.toString());next.set("rest",record.nailArtistId||"store");router.push("/dashboard/studio?"+next.toString());
                selectDay(new Date(record.startsAt));
                setEditor(false);
                toast.success("休息安排已保存");
              }}
            />
          )}
        </Dialog>
        </div>
      </header>}
      {error ? (
        <div className="admin-panel rest-empty" role="alert">
          <p>{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            重新加载
          </Button>
        </div>
      ) : loading ? (
        <div role="status" className="admin-panel rest-empty">
          正在加载休息日历…
        </div>
      ) : (
        <>
          {!scope?<>
          <div className="studio-entry-grid" role="region" aria-label="休息总览">
            <EntryCard title="休息日历" description={calendarDescription} icon={CalendarDays} theme="mint" status={calendarStatus} footer="查看完整日历" onClick={()=>openScope("all")}/>
          </div>
          <div className="rest-overview-groups">
            <section aria-label="店里休息" className="rest-overview-section">
              <div className="rest-overview-section-heading"><div><h2>店里休息</h2><p>固定店休和临时店休对所有项目生效。</p></div></div>
              <div className="studio-entry-grid">
                <EntryCard title="固定店休" description={weeklyText} icon={CalendarSync} theme="yellow" status="长期安排" onClick={()=>openScope("weekly")}/>
                <EntryCard title="临时店休" description={upcoming(null)+" 条进行中或待生效的安排"} icon={MoonStar} theme="pink" status="全店休息" onClick={()=>openScope("store")}/>
              </div>
            </section>
            <section aria-label="店员休息" className="rest-overview-section">
              <div className="rest-overview-section-heading"><div><h2>店员休息</h2><p>选择店员，单独管理临时休息安排。</p></div></div>
              <div className="studio-entry-grid">{staff.map((person,index)=><EntryCard key={person.id} title={person.name} description={upcoming(person.id!)+" 条个人临时休息安排"} icon={UserRound} theme={index%2?"mint":"lilac"} status="员工休息" onClick={()=>openScope(person.id!)}/>)}</div>
              {!staff.length&&<p className="admin-field-help">添加员工后，可以在这里管理店员休息。</p>}
            </section>
          </div></>:scope==="all"?<RestOverviewCalendar weekly={weekly} records={records} staff={staff} day={day} month={month} onSelect={selectDay} onMonthChange={setMonth}/>:scope==="weekly"?<WeeklyClosures days={weekly} onChange={setWeekly}/>:!(scope==="store"||selectedStaff)?<div className="admin-panel rest-empty">这个休息对象已不存在，请返回休息列表。</div>:<>
          <p className="rest-detail-note"><CalendarSync size={15}/>{weeklyText}<span>· 对所有项目生效</span></p>
          <div className="rest-layout">
            {calendar}
            <section className="admin-panel rest-agenda" aria-label="休息记录">
              <div
                className="rest-segments"
                role="group"
                aria-label="筛选休息记录"
              >
                {(Object.keys(views) as View[]).map((key) => (
                  <Button variant="ghost"
                    key={key}
                    type="button"
                    aria-pressed={view === key}
                    onClick={() => {
                      setView(key);
                      setConfirmId(null);
                    }}
                  >
                    {views[key]}
                  </Button>
                ))}
              </div>
              <h2>
                {view === "day" ? dayLabel(day) : views[view]}
                <small>{visible.length} 条临时安排</small>
              </h2>
              {fixedOff && (
                <p className="weekly-day-note">
                  <i className="store-dot" />
                  全店固定休息 · 全天
                </p>
              )}
              {!fixedOff && visible.length === 0 && (
                <div className="rest-empty">
                  <CalendarDays size={24} />
                  <p>{view === "day" ? "当天没有临时休息" : "暂无休息安排"}</p>
                  <small>按员工每周排班接待预约</small>
                </div>
              )}
              {visible.map(({ record }) => (
                <article key={record.id} className="rest-record">
                  <div>
                    <h3>
                      <i
                        className={
                          record.nailArtistId ? "staff-dot" : "store-dot"
                        }
                      />
                      {record.nailArtistId
                        ? (record.nailArtist?.name || "员工") + "休息"
                        : "全店休息"}
                    </h3>
                    <Button variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirmId(record.id)}
                      aria-label={"撤销" + intervalLabel(record) + "的安排"}
                    >
                      撤销
                    </Button>
                  </div>
                  <p>{intervalLabel(record)}</p>
                  {record.reason && <small>{record.reason}</small>}
                  {confirmId === record.id && (
                    <div className="rest-confirm">
                      <p>撤销整段休息安排？</p>
                      <Button variant="ghost"
                        disabled={busy}
                        onClick={() => setConfirmId(null)}
                      >
                        保留
                      </Button>
                      <Button variant="ghost"
                        disabled={busy}
                        onClick={() => void remove(record.id)}
                      >
                        确认撤销
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </section>
          </div>
          </>}
        </>
      )}
    </div>
  );
}

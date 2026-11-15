"use client";
import {useUnsavedChanges} from "@/components/admin/UnsavedChanges";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown } from "lucide-react";
import {type DateRange} from "react-day-picker";
import {Calendar} from "@/components/ui/calendar";
import {AdminSelect, TimePicker} from "@/components/admin/FormControls";
import { zhCN } from "react-day-picker/locale/zh-CN";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminFetch } from "@/lib/admin-fetch";
import { seoulDay, slotInstant } from "@/lib/studio/booking";
import {
  studioZone,
  timeOffBounds,
  type TimeOff,
} from "@/lib/studio/time-off-display";
import type { Staff } from "./StaffManager";

type Conflict = {
  id: string;
  date: string;
  timeSlot: string;
  nailArtist: { name: string } | null;
};

export default function TimeOffEditor({
  initialScope="",
  day,
  staff,
  busy,
  setBusy,
  onSave,
}: {
  initialScope?:string;
  day: string;
  staff: Staff[];
  busy: boolean;
  setBusy: (value: boolean) => void;
  onSave: (record: TimeOff) => void;
}) {
  const initial = slotInstant(day, "12:00");
  const [range, setRange] = useState<DateRange>({ from: initial, to: initial });
  const [choosingDates, setChoosingDates] = useState(false);
  const [scope, setScope] = useState(initialScope);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const start = seoulDay(range.from ?? initial);
  const end = seoulDay(range.to ?? range.from ?? initial);
  const bounds = timeOffBounds(start, end, allDay, startTime, endTime);
  const valid = bounds.endsAt > bounds.startsAt;
  useUnsavedChanges(start!==day||end!==day||scope!==initialScope||!allDay||startTime!=="10:00"||endTime!=="12:00"||!!reason,()=>{});
  function clearFeedback() {
    setConflicts([]);
    setError("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    clearFeedback();
    try {
      const response = await adminFetch("/api/studio/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bounds,
          nailArtistId: scope || null,
          reason,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "保存失败，请重试");
        setConflicts(result.conflicts ?? []);
        return;
      }
      onSave(result);
    } catch {
      setError("无法确认保存结果，请刷新休息日历后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent className="rest-editor" closeLabel="关闭">
      <DialogTitle>添加休息</DialogTitle>
      <DialogDescription>
        休息时段将暂停接受新预约。所有时间均为首尔时间。
      </DialogDescription>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="rest-field">
            <span id="rest-period-label">休息日期</span>
            <Button variant="ghost"
              type="button"
              className="rest-date-trigger"
              aria-expanded={choosingDates}
              aria-labelledby="rest-period-label rest-period-value"
              onClick={() => setChoosingDates(!choosingDates)}
            >
              <CalendarDays size={17} />
              <strong id="rest-period-value">
                {start === end ? start : start + " 至 " + end}
              </strong>
              <ChevronDown size={16} />
            </Button>
            {choosingDates && (
              <div className="rest-range">
                <p>点选开始日，再点结束日。只休一天可直接保存。</p>
                <Calendar
                  className="rest-picker"
                  locale={zhCN}
                  timeZone={studioZone}
                  mode="range"
                  required
                  resetOnSelect
                  selected={range}
                  defaultMonth={range.from}
                  onSelect={(next) => {
                    setRange(next);
                    clearFeedback();
                    if (next.to) setChoosingDates(false);
                  }}
                />
              </div>
            )}
          </div>
          <label className="rest-field">
            休息对象
            <AdminSelect label="休息对象" value={scope} disabled={busy} options={[{value:"",label:"全店休息"},...staff.map(person=>({value:person.id!,label:person.name}))]} onValueChange={value=>{setScope(value);clearFeedback();}}/>
          </label>
          <div className="rest-field">
            <span>休息时段</span>
            <div className="rest-segments" role="group" aria-label="休息时段">
              {[true, false].map((full) => (
                <Button variant="ghost"
                  key={String(full)}
                  type="button"
                  aria-pressed={allDay === full}
                  onClick={() => {
                    setAllDay(full);
                    clearFeedback();
                  }}
                >
                  {full ? "全天" : "指定时间"}
                </Button>
              ))}
            </div>
          </div>
          {!allDay && (
            <div className="rest-times">
              <label className="rest-field">
                开始时间
                <TimePicker label="休息开始时间" value={startTime} disabled={busy} onChange={value=>{setStartTime(value);clearFeedback();}}/>
              </label>
              <label className="rest-field">
                结束时间
                <TimePicker label="休息结束时间" value={endTime} disabled={busy} onChange={value=>{setEndTime(value);clearFeedback();}}/>
              </label>
            </div>
          )}
          {!valid && (
            <p className="rest-error" role="alert">
              结束时间须晚于开始时间
            </p>
          )}
          <label className="rest-field">
            备注（选填）
            <Input
              maxLength={500}
              placeholder="如：员工培训"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {error && (
            <div className="rest-error" role="alert">
              {error}
              {conflicts.map((c) => (
                <Link
                  key={c.id}
                  href={"/reservation/" + encodeURIComponent(c.id)}
                >
                  {c.date.slice(0, 10)} {c.timeSlot} · {c.nailArtist?.name} ↗
                </Link>
              ))}
            </div>
          )}
          <Button
            className="rest-submit"
            type="submit"
            disabled={!valid || busy}
          >
            {busy ? "正在保存…" : "保存休息安排"}
          </Button>
        </fieldset>
      </form>
    </DialogContent>
  );
}

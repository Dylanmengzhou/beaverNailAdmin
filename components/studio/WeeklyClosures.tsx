"use client";
import {useUnsavedChanges} from "@/components/admin/UnsavedChanges";

import { useState } from "react";
import Link from "next/link";
import { CalendarSync } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-fetch";

const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const order = [1, 2, 3, 4, 5, 6, 0];
type Conflict = {
  id: string;
  date: string;
  timeSlot: string;
  nailArtist: { name: string } | null;
};

export default function WeeklyClosures({
  days,
  onChange,
}: {
  days: number[];
  onChange: (days: number[]) => void;
}) {
  const [draft, setDraft] = useState<number[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const dirty=draft!==null&&(draft.length!==days.length||draft.some(day=>!days.includes(day)));
  const confirmNavigation=useUnsavedChanges(dirty,()=>setDraft(null));
  function clearError() {
    setError("");
    setConflicts([]);
  }
  async function save() {
    if (!draft || saving) return;
    clearError();
    setSaving(true);
    try {
      const response = await adminFetch("/api/studio/weekly-closures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closedWeekdays: draft, previous: days }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "保存失败，请重试");
        setConflicts(result.conflicts ?? []);
        if (result.current) {
          onChange(result.current);
          setDraft(result.current);
        }
        return;
      }
      onChange(result.closedWeekdays);
      setDraft(null);
      toast.success("全店固定休息日已更新");
    } catch {
      setError("网络连接失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="admin-panel weekly-closures"
      aria-label="全店固定休息日"
    >
      <div className="weekly-overview">
        <CalendarSync size={20} aria-hidden="true" />
        <div>
          <h2>全店固定休息日</h2>
          <p>
            {days.length
              ? "每周" +
                order
                  .filter((d) => days.includes(d))
                  .map((d) => labels[d].slice(1))
                  .join("、") +
                "休息"
              : "未设固定休息日"}
          </p>
        </div>
        {draft === null && (
          <Button
            variant="outline"
            onClick={() => {
              clearError();
              setDraft(days);
            }}
          >
            修改
          </Button>
        )}
      </div>
      {draft !== null && (
        <div className="weekly-edit">
          <p>勾选全店每周休息的日子。其余日期按员工排班开放预约。</p>
          <div className="weekly-days" role="group" aria-label="每周休息的星期">
            {order.map((day) => (
              <Button variant="outline"
                key={day}
                type="button"
                aria-pressed={draft.includes(day)}
                disabled={saving}
                onClick={() => {
                  clearError();
                  setDraft(
                    draft.includes(day)
                      ? draft.filter((d) => d !== day)
                      : [...draft, day],
                  );
                }}
              >
                {labels[day]}
              </Button>
            ))}
          </div>
          {error && (
            <div role="alert" className="rest-error">
              {error}
              {conflicts.map((c) => (
                <Link
                  key={c.id}
                  href={"/reservation/" + encodeURIComponent(c.id)}
                >
                  {c.date.slice(0, 10)} {c.timeSlot} ·{" "}
                  {c.nailArtist?.name || "未分配老师"} ↗
                </Link>
              ))}
            </div>
          )}
          <div className="weekly-actions">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => confirmNavigation(()=>setDraft(null))}
            >
              取消
            </Button>
            <Button
              disabled={
                saving ||
                (draft.length === days.length &&
                  draft.every((d) => days.includes(d)))
              }
              onClick={save}
            >
              {saving ? "正在保存…" : "保存固定休息日"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

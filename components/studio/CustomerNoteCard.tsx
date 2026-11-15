"use client";
import {useUnsavedChanges} from "@/components/admin/UnsavedChanges";
import {Textarea} from "@/components/ui/textarea";
import {useAdminSession} from "@/components/admin/AdminShell";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-fetch";
import { toast } from "sonner";
import { Pencil, Heart } from "lucide-react";
export default function CustomerNoteCard({ userId }: { userId: string }) {
  const manager=useAdminSession()?.memberType==="manager";
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const confirmNavigation=useUnsavedChanges(editing&&note!==saved,()=>{setNote(saved);setEditing(false);});
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    adminFetch(
      `/api/studio/customer-note?userId=${encodeURIComponent(userId)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setNote(result.customerNote || "");
        setSaved(result.customerNote || "");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message || "顾客备注加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, reload]);
  const save = async () => {
    setBusy(true);
    try {
      const response = await adminFetch("/api/studio/customer-note", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNote(result.customerNote || "");
      setSaved(result.customerNote || "");
      setEditing(false);
      toast.success("顾客长期备注已保存");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="admin-panel customer-note-card">
      <div className="admin-panel-heading">
        <h2 className="flex items-center gap-2">
          <Heart size={16} className="text-pink-300" />
          顾客长期备注
        </h2>
        {manager && !loading && !error && !editing && (
          <Button variant="ghost"
            type="button"
            className="admin-soft-action"
            onClick={() => setEditing(true)}
          >
            <Pencil size={12} />
            {saved ? "编辑" : "添加"}
          </Button>
        )}
      </div>
      <p>
        记录怕冷、敏感或沟通偏好。仅工作人员可见，之后每次预约的 Telegram
        通知都会带上。
      </p>
      {loading ? (
        <div className="admin-subtle" role="status">
          正在读取备注…
        </div>
      ) : error ? (
        <div className="admin-error" role="alert">
          {error}
          <Button variant="ghost"
            className="underline block"
            onClick={() => setReload((n) => n + 1)}
          >
            重新加载
          </Button>
        </div>
      ) : editing ? (
        <>
          <Textarea
            className="admin-textarea"
            aria-label="顾客长期备注"
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：怕冷，到店时准备薄毯。"
            disabled={busy}
          />
          <div className="admin-inline justify-end">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => confirmNavigation(()=>{
                setNote(saved);
                setEditing(false);
              })}
            >
              取消
            </Button>
            <Button
              disabled={busy || note === saved}
              onClick={() => void save()}
            >
              {busy ? "保存中…" : "保存备注"}
            </Button>
          </div>
        </>
      ) : (
        <div className="customer-note-preview">
          {saved || "还没有特别要记住的偏好。"}
        </div>
      )}
    </section>
  );
}

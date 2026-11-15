"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import HomePhotoManager from "@/components/studio/HomePhotoManager";
import StaffManager, { type Staff } from "@/components/studio/StaffManager";
import { toast } from "sonner";
import TimeOffManager from "@/components/studio/TimeOffManager";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { PanelState } from "@/components/admin/PageHeading";
import { adminFetch } from "@/lib/admin-fetch";
import { DEFAULT_HOME, type HomeContent } from "@/lib/studio/home";
import {useAdminSession} from "@/components/admin/AdminShell";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await adminFetch(url, init);
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error || value.message || "操作失败，请重试");
  return value;
}
const json = (value: unknown, method = "PUT") => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(value),
});
export default function StudioSettings() {
  const params = useSearchParams();
  const session=useAdminSession();
  const section = ["home", "staff", "off"].includes(params.get("tab") || "home")
    ? params.get("tab") || "home"
    : "home";
  const [publishedHome, setPublishedHome] = useState(
    JSON.stringify(DEFAULT_HOME),
  );
  const [home, setHome] = useState<HomeContent>(DEFAULT_HOME);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manager, setManager] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [h, s] = await Promise.all([
        api<HomeContent>("/api/studio/home"),
        api<Staff[]>("/api/studio/staff"),
      ]);
      setHome(h);
      setPublishedHome(JSON.stringify(h));
      setStaff(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if(!session)return;
    if(session.memberType!=="manager"){
      setLoading(false);setError("此页面需要店长或管理员权限");return;
    }
    setManager(true);void load();
  }, [session,load]);
  const perform = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };
  const upload = (file: File | undefined, target: string) => {
    if (!file) return;
    if (
      file.size > 4 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      toast.error("请选择 4MB 以内的 JPG、PNG 或 WebP 图片");
      return;
    }
    void perform(async () => {
      const body = new FormData();
      body.set("file", file);
      body.set("purpose", "home");
      const image = await api<{ url: string }>("/api/media", {
        method: "POST",
        body,
      });
      const newId = crypto.randomUUID();
      setHome((value) =>
        target === "new"
          ? {
              ...value,
              slides: [
                ...value.slides,
                {
                  id: newId,
                  image: image.url,
                  enabled: true,
                  title: { zh: "", en: "", kr: "" },
                  alt: { zh: "", en: "", kr: "" },
                },
              ],
            }
          : {
              ...value,
              slides: value.slides.map((s) =>
                s.id === target ? { ...s, image: image.url } : s,
              ),
            },
      );
    });
  };
  const homeDirty = JSON.stringify(home) !== publishedHome;
  const saveHome = () =>
    void perform(async () => {
      await api("/api/studio/home", json(home));
      setPublishedHome(JSON.stringify(home));
      toast.success("首页内容已保存，店铺刷新后生效");
    });
  const saveStaff = async (draft: Staff) => {
    const saved = await api<Staff>("/api/studio/staff", json(draft));
    setStaff((previous) =>
      previous.some((item) => item.id === saved.id)
        ? previous.map((item) => (item.id === saved.id ? saved : item))
        : [...previous, saved],
    );
    return saved;
  };
  const removeStaff = async (id: string) => {
    await api("/api/studio/staff?id=" + encodeURIComponent(id), {
      method: "DELETE",
    });
    setStaff((previous) => previous.filter((item) => item.id !== id));
  };
  return (
    <div className="studio-settings-page">
      {loading ? (
        <div className="admin-panel">
          <PanelState loading title="正在整理工作室…" />
        </div>
      ) : error ? (
        <div className="admin-panel">
          <PanelState title={error}>
            {manager ? (
              <Button variant="outline" onClick={() => void load()}>
                重新加载
              </Button>
            ) : (
              <Link href="/">返回登录</Link>
            )}
          </PanelState>
        </div>
      ) : (
        <>
          {section === "home" && (
            <HomePhotoManager
              value={home}
              onChange={setHome}
              onUpload={upload}
              onSave={saveHome}
              onDiscard={()=>setHome(JSON.parse(publishedHome))}
              dirty={homeDirty}
              busy={busy}
            />
          )}
          {section === "staff" && (
            <StaffManager
              staff={staff}
              onSave={saveStaff}
              onRemove={removeStaff}
            />
          )}
          {section === "off" && <TimeOffManager staff={staff} />}
        </>
      )}
    </div>
  );
}

"use client";

import {useUnsavedChanges} from "@/components/admin/UnsavedChanges";
import ServiceSchedules, {type Settings} from "./ServiceSchedules";
import {DEFAULT_CONTENT,type StudioContent} from "@/lib/studio/content";
import {adminApi} from "@/lib/admin-api";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Check,
  Loader2,
  Paintbrush2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { LEGACY_SCHEDULE, type WorkWindow } from "@/lib/studio/booking";
import { adminFetch } from "@/lib/admin-fetch";
import { PanelState } from "@/components/admin/PageHeading";

export type Staff = {
  id?: string;
  name: string;
  active: boolean;
  services: string[];
  durationMinutes: number;
  serviceSettings?:Settings;
  commissionRateBps?:number|null;
  schedule: WorkWindow[] | null;
  role?: string;
  membertype?:"staff"|"manager";
  account?: string | null;
  password?: string;
};

const blankStaff = (): Staff => ({
  name: "",
  active: true,
  membertype:"staff",
  services: ["nails"],
  durationMinutes: 120,
  schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], start: "10:00", end: "16:00" }],
});
const normalize = (item: Staff): Staff => ({
  id: item.id,
  name: item.name,
  active: item.active,
  services: [...item.services],
  durationMinutes: item.durationMinutes,
  schedule: structuredClone(item.schedule ?? LEGACY_SCHEDULE),
  serviceSettings: structuredClone(item.serviceSettings || {}),
  commissionRateBps:item.commissionRateBps ?? null,
  role: item.role || "L3",
  membertype:item.membertype||"staff",
  account: item.account || "",
  password: item.password || "",
});

export default function StaffManager({
  staff,
  onSave,
  onRemove,
}: {
  staff: Staff[];
  onSave: (value: Staff) => Promise<Staff>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [catalog,setCatalog]=useState(DEFAULT_CONTENT.services);
  useEffect(()=>{void adminApi<StudioContent>("/api/studio/content").then(c=>setCatalog(c.services)).catch(()=>{});},[]);
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("staff");
  const selected = staff.find((item) => item.id === selectedId);
  const inDetails = selectedId === "new" || !!selected;
  const [drafts, setDrafts] = useState<Record<string, Staff>>({});
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [credentialsError, setCredentialsError] = useState("");
  const [credentialsRetry, setCredentialsRetry] = useState(0);
  const [showPassword, setShowPassword] = useState(true);
  useEffect(() => {
    if (
      !selectedId ||
      selectedId === "new" ||
      passwords[selectedId] !== undefined
    )
      return;
    const controller = new AbortController();
    setCredentialsError("");
    void (async () => {
      try {
        const response = await adminFetch(
          "/api/studio/staff?id=" + encodeURIComponent(selectedId),
          { signal: controller.signal },
        );
        const value = await response.json();
        if (!response.ok) throw new Error(value.error || "读取登录资料失败");
        setPasswords((previous) => ({
          ...previous,
          [selectedId]: value.password || "",
        }));
      } catch (error) {
        if (!controller.signal.aborted)
          setCredentialsError(
            error instanceof Error ? error.message : "读取登录资料失败",
          );
      }
    })();
    return () => controller.abort();
  }, [selectedId, passwords, credentialsRetry]);
  const base = (item: Staff) =>
    normalize({ ...item, password: item.id ? passwords[item.id] : "" });
  const credentialsLoading =
    !!selected && passwords[selected.id!] === undefined;
  const editing =
    (selectedId && drafts[selectedId]) || base(selected ?? blankStaff());
  const pending = Object.entries(drafts).filter(([key, draft]) => {
    const original =
      key === "new" ? blankStaff() : staff.find((item) => item.id === key);
    return original && JSON.stringify(draft) !== JSON.stringify(base(original));
  });
  const confirmNavigation=useUnsavedChanges(pending.length>0,()=>setDrafts({}));
  const open = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("staff", id);
    confirmNavigation(()=>router.push("/dashboard/studio?" + next.toString()));
  };
  const back = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("staff");
    confirmNavigation(()=>router.replace("/dashboard/studio?" + next.toString()));
  };
  const setEditing = (update: (value: Staff) => Staff) => {
    if (!selectedId) return;
    setDrafts((previous) => ({
      ...previous,
      [selectedId]: update(
        previous[selectedId] ?? base(selected ?? blankStaff()),
      ),
    }));
  };
  const save = async () => {
    setBusy(true);
    try {
      for (const [, draft] of pending)
        if (!draft.account?.trim() || !draft.password)
          throw new Error("请填写员工的登录账号和密码");
      for (const [key, draft] of pending) {
        const saved = await onSave(draft);
        if (saved.id)
          setPasswords((previous) => ({
            ...previous,
            [saved.id!]: draft.password || "",
          }));
        setDrafts((previous) => {
          const next = { ...previous };
          delete next[key];
          return next;
        });
        if (key === "new" && selectedId === "new" && saved.id) {
          const next = new URLSearchParams(params.toString());
          next.set("staff", saved.id);
          router.replace("/dashboard/studio?" + next.toString());
        }
      }
      toast.success("员工业务与排班已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败，请重试");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!selected?.id) return;
    setBusy(true);
    try {
      await onRemove(selected.id);
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[selected.id!];
        return next;
      });
      setConfirmRemove(false);
      const next=new URLSearchParams(params.toString());next.delete("staff");router.replace("/dashboard/studio?"+next.toString());
      toast.success("员工已移除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移除失败，请重试");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={"staff-manager" + (pending.length ? " has-changes" : "")}>
      {inDetails ? (
        <>
          <div className="home-photo-detail-heading">
            <h1>{selectedId === "new" ? "新增员工" : "员工设置"}</h1>
            <Button variant="outline" onClick={back} disabled={busy}>
              <ChevronLeft size={14} />
              员工墙
            </Button>
          </div>
          {credentialsLoading ? (
            <section className="admin-panel staff-detail-panel">
              <PanelState
                loading={!credentialsError}
                title={credentialsError || "正在读取员工资料…"}
              >
                {credentialsError && (
                  <Button
                    variant="outline"
                    onClick={() => setCredentialsRetry((value) => value + 1)}
                  >
                    重新读取
                  </Button>
                )}
              </PanelState>
            </section>
          ) : (
            <section className="admin-panel editor-main staff-detail-panel">
              <div className="staff-editor-heading">
                <div className="admin-inline">
                  <span className="admin-avatar">
                    {(editing.name || "+").slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2>{editing.name || "新员工"}</h2>
                  </div>
                </div>
                <label className="staff-active">
                  <span>开放预约</span>
                  <Switch
                    checked={editing.active}
                    aria-label="开放顾客预约"
                    disabled={busy}
                    onCheckedChange={(active) =>
                      setEditing((value) => ({ ...value, active }))
                    }
                  />
                </label>
              </div>
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label htmlFor="staff-name">员工姓名</label>
                  <Input
                    id="staff-name"
                    maxLength={80}
                    value={editing.name}
                    disabled={busy}
                    onChange={(event) =>
                      setEditing((value) => ({
                        ...value,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="admin-field"><label htmlFor="staff-permission">管理权限</label><Select value={editing.membertype||"staff"} disabled={busy} onValueChange={membertype=>setEditing(value=>({...value,membertype:membertype as "staff"|"manager"}))}><SelectTrigger id="staff-permission"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="staff">员工</SelectItem><SelectItem value="manager">店长</SelectItem></SelectContent></Select><small>店长可管理全部设置并审核结算；员工只能提交自己的结算申请。</small></div>
              </div>
              <div className="staff-account-section">
                <div className="admin-field-heading">
                  <span>登录账号</span>
                  <span className="admin-subtle">与员工资料一起保存</span>
                </div>
                <p className="admin-subtle">
                  登录账号和密码为必填项，可直接修改，保存后用于员工登录。
                </p>
                <div className="admin-form-grid">
                  <div className="admin-field">
                    <label htmlFor="staff-account">登录账号</label>
                    <Input
                      id="staff-account"
                      required
                      minLength={4}
                      autoComplete="off"
                      maxLength={80}
                      placeholder="至少 4 个字符"
                      value={editing.account || ""}
                      disabled={busy}
                      onChange={(event) =>
                        setEditing((value) => ({
                          ...value,
                          account: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="staff-role">员工等级</label>
                    <Select
                      value={editing.role || "L3"}
                      disabled={busy}
                      onValueChange={(role) =>
                        setEditing((value) => ({ ...value, role }))
                      }
                    >
                      <SelectTrigger id="staff-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries({
                          L1: "院长",
                          L2: "大师",
                          L3: "员工",
                          L4: "实习",
                          L5: "助理",
                          L6: "学徒",
                        }).map(([role, label]) => (
                          <SelectItem key={role} value={role}>
                            {role} · {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="admin-field staff-password-field">
                    <label htmlFor="staff-password">登录密码</label>
                    <div className="staff-password-input">
                      <Input
                        id="staff-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        maxLength={200}
                        placeholder="至少 6 个字符"
                        value={editing.password || ""}
                        disabled={busy}
                        onChange={(event) =>
                          setEditing((value) => ({
                            ...value,
                            password: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="admin-icon-button"
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-form-divider" />
              <div className="admin-field-heading">
                <span>可预约的服务</span>
                <span className="admin-subtle">可选择多个服务项目</span>
              </div>
              <div className="service-choices">
                {catalog.map(({id:service,names}) => (
                  <button
                    type="button"
                    key={service}
                    className={`service-choice ${service}`}
                    aria-pressed={editing.services.includes(service)}
                    disabled={busy}
                    onClick={() =>
                      setEditing((value) => ({
                        ...value,
                        services: value.services.includes(service)
                          ? value.services.filter((item) => item !== service)
                          : [...value.services, service],
                      }))
                    }
                  >
                    {service === "nails" ? (
                      <Paintbrush2 size={17} />
                    ) : (
                      <Sparkles size={17} />
                    )}
                    <span>{names.zh}</span>
                    <span className="choice-check">
                      {editing.services.includes(service) && (
                        <Check size={10} />
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <div className="admin-form-divider" />
              <ServiceSchedules services={editing.services} names={Object.fromEntries(catalog.map(s=>[s.id,s.names.zh]))} value={editing.serviceSettings} legacy={editing.schedule || []} duration={editing.durationMinutes} busy={busy} onChange={settings=>setEditing(v=>({...v,serviceSettings:settings}))}/>


              {selected?.id && (
                <Button
                  variant="ghost"
                  className="staff-remove"
                  disabled={busy}
                  onClick={() => setConfirmRemove(true)}
                >
                  <Trash2 size={14} />
                  移除员工
                </Button>
              )}
            </section>
          )}
        </>
      ) : (
        <div className="staff-wall" aria-label="员工墙">
          {staff.map((item) => {
            const display = drafts[item.id!] ?? item;
            const changed = pending.some(([key]) => key === item.id);
            return (
              <button
                key={item.id}
                type="button"
                className="staff-wall-tile"
                disabled={busy}
                onClick={() => open(item.id!)}
                aria-label={"设置员工 " + item.name}
              >
                <span
                  className={
                    "staff-wall-status" + (display.active ? "" : " is-inactive")
                  }
                >
                  <i />
                  {display.active ? "开放预约" : "暂停预约"}
                </span>
                <span className="staff-wall-avatar">
                  {(display.name || "?").slice(0, 1).toUpperCase()}
                </span>
                <strong>{display.name || "未命名员工"}</strong>
                <small>
                  {display.services
                    .map((service) => (service === "nails" ? "美甲" : "化妆"))
                    .join(" · ") || "未选择业务"}
                </small>
                {changed && (
                  <span
                    className="staff-wall-unsaved"
                    aria-label="有未保存的更改"
                  />
                )}
              </button>
            );
          })}
          <button
            type="button"
            className="staff-wall-tile staff-wall-add"
            disabled={busy}
            onClick={() => open("new")}
            aria-label="添加员工"
          >
            <Plus size={30} strokeWidth={1.5} />
            <small>
              {pending.some(([key]) => key === "new") ? "继续添加" : "添加员工"}
            </small>
          </button>
        </div>
      )}
      <Dialog
        open={confirmRemove}
        onOpenChange={(open) => !busy && setConfirmRemove(open)}
      >
        <DialogContent>
          <DialogTitle>移除 {selected?.name}？</DialogTitle>
          <DialogDescription>
            员工资料和登录账号会一并移除。有关联预约的员工无法移除，可以在员工设置中关闭开放预约。
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmRemove(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "正在移除…" : "确认移除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {pending.length > 0 && (
        <div className="home-photo-savebar">
          <span>
            {pending.length > 1
              ? pending.length + " 位员工有未保存更改"
              : "有未保存的更改"}
          </span>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {busy ? "保存中…" : "保存修改"}
          </Button>
        </div>
      )}
    </div>
  );
}

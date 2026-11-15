"use client";
import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  Flower2,
  Image,
  LogOut,
  Menu,
  MoonStar,
  ContactRound,
  Crown,
  Settings2,
  RefreshCw,
  Sparkles,
  Users,
  UserRoundCog,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {UnsavedChangesProvider,useUnsavedNavigation} from "@/components/admin/UnsavedChanges";
import {adminApi} from "@/lib/admin-api";
export type AdminUser = {
  id: string;
  username: string;
  memberType: "manager" | "staff";
  nailArtistName?: string;
  exp: number;
};
const CalendarRefreshContext = createContext<{
  version: number;
  setRefreshing: (value: boolean) => void;
} | null>(null);
export function useCalendarRefresh() {
  const context = useContext(CalendarRefreshContext);
  if (!context) throw new Error("Calendar refresh requires AdminShell");
  return context;
}
const SessionContext = createContext<AdminUser | null>(null);
export const useAdminSession = () => useContext(SessionContext);
const navGroups = [
  {label:"每天的工作",items:[
    {href:"/calendar",label:"预约日历",icon:CalendarDays},
    {href:"/dashboard/stats",label:"经营统计",icon:ChartNoAxesCombined},
  ]},
  {label:"门店内容",items:[
    {href:"/dashboard/user-reservation",label:"顾客管理",icon:Users},
    {href:"/dashboard/members",label:"会员专栏",icon:Crown},
    {href:"/dashboard/content?view=services",label:"项目与价格",icon:Sparkles,manager:true},
    {href:"/dashboard/studio?tab=staff",label:"员工与排班",icon:UserRoundCog,manager:true},
    {href:"/dashboard/studio?tab=off",label:"休息安排",icon:MoonStar,manager:true},
  ]},
  {label:"打理工作室",items:[
    {href:"/dashboard/studio?tab=home",label:"首页内容",icon:Image,manager:true},
    {href:"/dashboard/content?view=about",label:"关于我们",icon:Flower2,manager:true},
    {href:"/dashboard/content?view=events",label:"近期活动",icon:Sparkles,manager:true},
    {href:"/dashboard/content?view=contact",label:"门店联系方式",icon:ContactRound,manager:true},
  ]},
];
const navItems=navGroups.flatMap(group=>group.items);
export function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`admin-brand ${compact ? "is-compact" : ""}`}>
      <span className="admin-brand-symbol">
        <Flower2 size={24} strokeWidth={1.7} />
      </span>
      <span>
        <span className="admin-brand-name">
          Beaver <b>&amp;</b> <span className="brand-aura">Aura</span>
        </span>
        <small>工作室管理端</small>
      </span>
    </span>
  );
}
export default function AdminShell({children}:{children:ReactNode}){
  return <UnsavedChangesProvider><AdminShellContent>{children}</AdminShellContent></UnsavedChangesProvider>;
}
function AdminShellContent({ children }: { children: ReactNode }) {
  const confirmNavigation=useUnsavedNavigation();
  const pathname = usePathname(),
    params = useSearchParams(),
    router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false);
  const [sessionError,setSessionError]=useState("");
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const calendarRefresh = useMemo(
    () => ({ version: calendarVersion, setRefreshing }),
    [calendarVersion, setRefreshing],
  );
  const isLogin = pathname === "/";
  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    const token = localStorage.getItem("accessToken");
    try {
      if (!token) throw new Error();
      const value = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(
            atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
            (c) => c.charCodeAt(0),
          ),
        ),
      );
      if (
        !value.id ||
        !value.exp ||
        !["manager", "staff"].includes(value.memberType) ||
        value.exp * 1000 <= Date.now()
      )
        throw new Error();
      const control=new AbortController();
      setSessionError("");
      void adminApi<AdminUser>("/api/auth/session",{signal:control.signal}).then(current=>{setUser(current);setReady(true);}).catch(error=>{if(!control.signal.aborted){setUser(null);setSessionError(error.message||"读取账号权限失败");setReady(true);}});
      return ()=>control.abort();
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      router.replace("/");
    }
  }, [isLogin, router,pathname]);
  const active = (href: string) => {
    const [path, search] = href.split("?");
    if (path === "/dashboard/user-reservation")
      return pathname.startsWith(path) || pathname.startsWith("/reservation/");
    if (path === "/dashboard/stats" && pathname === "/dashboard/performance") return true;
    if (path !== pathname) return false;
    return (
      !search ||
      search.split("&").every(value=>{const [key,want]=value.split("=");return (params.get(key)==="prices"&&key==="view"?"services":params.get(key) || (key==="tab"?"home":""))===want;})
    );
  };
  const current = navItems.find((item) => active(item.href));
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("calendarDataCache");
    setUser(null);
    setOpen(false);
    router.replace("/");
  };
  const navigation = (
    <>
      <Link
        className="admin-sidebar-brand"
        href="/calendar"
        onClick={() => setOpen(false)}
        aria-label="Beaver & Aura 预约日历"
      >
        <AdminBrand />
      </Link>
      <nav className="admin-nav" aria-label="管理端导航">
        {navGroups.map(group=>{
          const items=group.items.filter(item=>!("manager" in item && item.manager) || user?.memberType==="manager");
          if(!items.length)return null;
          return <section className="admin-nav-group" aria-label={group.label} key={group.label}>
            <p className="admin-nav-label">{group.label}</p>
            {items.map(item=><Link href={item.href} key={item.href} aria-current={active(item.href)?"page":undefined} onClick={()=>setOpen(false)}>
              <item.icon size={19} strokeWidth={1.7}/><span>{item.label}</span>{active(item.href)&&<span className="admin-nav-dot"/>}
            </Link>)}
          </section>;
        })}
      </nav>
      <div className="admin-sidebar-bottom">
        {user?.username !== "beavernail" && (
          <Link
            className="admin-personal-link"
            href="/dashboard/changeProfile"
            onClick={() => setOpen(false)}
          >
            <Settings2 size={17} />
            个人设置
          </Link>
        )}
        <div className="admin-sidebar-user">
          <span className="admin-avatar">
            {(user?.nailArtistName || user?.username || "A")
              .slice(0, 1)
              .toUpperCase()}
          </span>
          <div>
            <strong>
              {user?.memberType === "manager"
                ? (user.username==="beavernail"?"工作室管理员":"店长 · "+(user.nailArtistName||user.username))
                : user?.nailArtistName || user?.username}
            </strong>
            <span>{user?.username}</span>
          </div>
          <button
            type="button"
            onClick={()=>confirmNavigation(logout)}
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </>
  );
  if (isLogin) return <>{children}</>;
  if (!ready || !user)
    return (
      <div className="admin-loading-screen">
        <p>{sessionError||"正在打开工作室…"}</p>
        {sessionError&&<Button variant="outline" onClick={()=>window.location.reload()}>重新加载</Button>}
      </div>
    );
  return (
    <SessionContext.Provider value={user}>
      <CalendarRefreshContext.Provider value={calendarRefresh}>
        <div
          className={`admin-app ${pathname === "/calendar" ? "admin-calendar-layout" : ""}`}
        >
          <a className="admin-skip" href="#admin-content">
            跳至主要内容
          </a>
          <aside className="admin-sidebar">{navigation}</aside>
          <div className="admin-main">
            <header className="admin-topbar">
              <div className="admin-topbar-left">
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <Button
                      className="admin-menu-toggle"
                      variant="ghost"
                      size="icon"
                      aria-label="打开导航"
                    >
                      <Menu size={21} />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="admin-mobile-nav"
                    closeLabel="关闭导航"
                  >
                    <SheetHeader className="sr-only">
                      <SheetTitle>工作室导航</SheetTitle>
                      <SheetDescription>
                        预约、顾客及工作室设置
                      </SheetDescription>
                    </SheetHeader>
                    {navigation}
                  </SheetContent>
                </Sheet>
                <span className="admin-breadcrumb">
                  <span>我的工作室</span>
                  <ChevronRight size={13} />
                  <strong>
                    {current?.label ||
                      (pathname.includes("registerNailArtist")
                        ? "添加员工账号"
                        : pathname.includes("deleteNailArtist")
                          ? "账号管理"
                          : "个人设置")}
                  </strong>
                </span>
              </div>
              {pathname === "/calendar" && (
                <div className="admin-topbar-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="刷新预约"
                    title="刷新预约"
                    disabled={refreshing}
                    onClick={() => setCalendarVersion((version) => version + 1)}
                  >
                    <RefreshCw
                      size={18}
                      className={refreshing ? "animate-spin" : ""}
                    />
                  </Button>
                </div>
              )}
            </header>
            <main className="admin-content" id="admin-content">
              {children}
            </main>
            <footer className="admin-app-footer">
              <span>BEAVER & AURA STUDIO</span>
              <Flower2 size={13} />
              <span>A LITTLE CARE IN EVERY DETAIL.</span>
            </footer>
          </div>
        </div>
      </CalendarRefreshContext.Provider>
    </SessionContext.Provider>
  );
}

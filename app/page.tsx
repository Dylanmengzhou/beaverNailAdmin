"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Flower2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminBrand } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/admin-fetch";
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.exp * 1000 > Date.now()) router.replace("/calendar");
      else localStorage.removeItem("accessToken");
    } catch {
      localStorage.removeItem("accessToken");
    }
  }, [router]);
  const login = async (form: FormData) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "账号或密码不正确");
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      toast.success("欢迎回来");
      router.push("/calendar");
    } catch (e) {
      setError(e instanceof Error ? e.message : "暂时无法登录，请稍后重试");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="admin-login">
      <div className="admin-login-layout">
        <aside className="admin-login-brand-panel">
          <AdminBrand compact />
          <div className="login-brand-message">
            <h2>
              一点细心，
              <br />
              让日常更漂亮。
            </h2>
            <p>
              美甲、妆容，和每一个闪闪发光的瞬间。
              <br />
              欢迎回到 Beaver & Aura 的小小工作室。
            </p>
          </div>
          <div className="login-brand-foot">
            <Flower2 size={17} />
            NAILS · MAKEUP · HAPPY LITTLE THINGS
          </div>
        </aside>
        <section className="admin-login-form">
          <div className="admin-login-mobile-brand">
            <AdminBrand />
          </div>
          <p className="admin-eyebrow">YOUR LOVELY LITTLE WORKSPACE</p>
          <h1>欢迎回来</h1>
          <p>登录管理端，开始打理今天的漂亮约定。</p>
          <form action={login}>
            <div className="admin-field">
              <label htmlFor="username">账号</label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                required
                placeholder="输入你的账号"
                disabled={loading}
              />
            </div>
            <div className="admin-field">
              <label htmlFor="password">密码</label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="输入登录密码"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="admin-error" role="alert" style={{ margin: 0 }}>
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "正在登录…" : "进入工作室"}
              {!loading && <ArrowUpRight size={16} />}
            </Button>
          </form>
          <div className="admin-login-foot">
            BEAVER & AURA · STUDIO MANAGEMENT
          </div>
        </section>
      </div>
    </main>
  );
}

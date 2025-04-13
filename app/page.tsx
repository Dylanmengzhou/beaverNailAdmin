"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const LoginPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false); // 登录中状态

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.push('/calendar');
    }
  }, [router]);

  const credentialsAction = async (formData: FormData) => {
    if (loading) return; // 防止狂点
    setLoading(true);

    try {
      const username = formData.get("username");
      const password = formData.get("password");

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`登录成功`, {
          position: "top-center",
          duration: 1000,
        });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        router.push("/calendar");
      } else {
        toast.error(data.error || `登录失败`, {
          position: "top-center",
          duration: 1500,
        });
      }
    } catch (error) {
      console.error("登录出错：", error);
      toast.error(`系统错误，请稍后再试`, {
        position: "top-center",
        duration: 1500,
      });
    } finally {
      setLoading(false); // 登录结束，恢复按钮
    }
  };

  return (
    <div className="w-svw h-svh flex items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader className="flex flex-col justify-center items-center">
          <CardTitle className="text-2xl">欢迎回来</CardTitle>
          <CardDescription>Beaver Nail 登录系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={credentialsAction}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">账号</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="请输入账号"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="请输入密码"
                  disabled={loading}
                />
              </div>
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-black text-white"
                  disabled={loading} // 登录中禁用按钮
                >
                  {loading ? "登录中..." : "登录"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center items-center"></CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
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
import Image from "next/image";
import { SiSharp } from "react-icons/si";
import { SiDeliveroo } from "react-icons/si";
const LoginPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false); // 登录提交中
  const [cooldown, setCooldown] = useState(false); // 5秒冷却

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      router.push("/calendar");
    }
  }, [router]);

  const credentialsAction = async (formData: FormData) => {
    if (loading || cooldown) return; // 登录中 或 冷却中 禁止点
    setLoading(true);
    setCooldown(true); // 点完后立刻进入冷却状态

    try {
      const username = formData.get("username");
      const password = formData.get("password");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`登录成功`, {
          position: "top-center",
          duration: 1000,
        });
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        router.push("/calendar");
      } else {
        toast.error(`登录失败`, {
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
      setLoading(false);
      // 5秒钟后解除冷却
      setTimeout(() => {
        setCooldown(false);
      }, 1000);
    }
  };

  return (
    <div className="w-svw h-svh flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-pink-200 via-purple-100 to-pink-100">
      {/* 装饰元素 */}
      <div className="absolute top-10 left-10 w-16 h-16 bg-pink-300 rounded-full opacity-50 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-24 h-24 bg-purple-200 rounded-full opacity-50 animate-bounce"></div>
      <div className="absolute top-1/4 right-1/4 w-8 h-8 bg-yellow-200 rounded-full opacity-70 animate-ping"></div>
      <div className="absolute top-20 right-20 w-12 h-12 text-4xl animate-bounce">
        ✨
      </div>
      <div className="absolute bottom-40 left-20 w-12 h-12 text-4xl animate-pulse">
        💖
      </div>

      <Card className="w-[400px] border-4 border-pink-300 shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400"></div>

        <CardHeader className="flex flex-col justify-center items-center pt-8 pb-6">
          <div className="p-1 bg-pink-200 rounded-full flex items-center justify-center mb-4 shadow-inner border-2 border-pink-300">
            <span className="text-6xl">
                <Image src="/favicon-256.png" alt="logo" width={100} height={100} />
            </span>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-transparent bg-clip-text">
            欢迎回来
          </CardTitle>
          <CardDescription className="text-pink-600 font-medium mt-1">
            Beaver Nail 美甲管理系统
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={credentialsAction}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label
                  htmlFor="username"
                  className="text-pink-700 font-medium flex items-center"
                >
                  <span className="mr-1">
                  <SiSharp /></span>账号
                </Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="请输入账号"
                  disabled={loading || cooldown}
                  className="rounded-xl border-pink-300 focus:border-pink-500 focus:ring-pink-400 bg-pink-50 placeholder:text-pink-300"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-pink-700 font-medium flex items-center"
                >
                  <span className="mr-1">
                  <SiDeliveroo /></span>密码
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="请输入密码"
                  disabled={loading || cooldown}
                  className="rounded-xl border-pink-300 focus:border-pink-500 focus:ring-pink-400 bg-pink-50 placeholder:text-pink-300"
                />
              </div>
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-2 rounded-xl border-2 border-pink-200 shadow-md transform hover:scale-105 transition-all"
                  disabled={loading || cooldown}
                >
                  {loading || cooldown ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin mr-2">💫</span> 登录中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <span className="mr-2">✨</span> 登录
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center items-center pb-6">
          <p className="text-xs text-pink-400">· Y2K Beaver Nail Admin ·</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;

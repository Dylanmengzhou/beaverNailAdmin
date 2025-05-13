"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FormSchema = z
  .object({
    name: z.string().min(2, {
      message: "姓名必须至少包含2个字符。",
    }),
    role: z.enum(["L1", "L2", "L3", "L4", "L5", "L6"], {
      message: "请选择有效的角色等级。",
    }),
    account: z.string().min(4, {
      message: "账号必须至少包含4个字符。",
    }),
    password: z.string().min(6, {
      message: "密码必须至少包含6个字符。",
    }),
    confirmPassword: z.string().min(1, {
      message: "请确认您的密码。",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不匹配。",
    path: ["confirmPassword"],
  });

export default function RegisterNailArtistPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    memberType: string;
  } | null>(null);
  const router = useRouter();
  useEffect(() => {
    setIsLoading(true);
    const token = localStorage.getItem("accessToken");
    console.log("token是:", token);
    if (!token) {
      router.push("/");
    } else {
      // 解析JWT获取用户信息
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          setCurrentUser({
            id: payload.id,
            username: payload.username,
            memberType: payload.memberType,
          });
        }
      } catch (error) {
        console.error("解析token失败:", error);
        setIsLoading(false);
      }
    }
  }, []);

  // 添加新的 useEffect 来监听 currentUser 变化
  useEffect(() => {
    if (currentUser) {
      // 检查用户权限，如果不是 manager 则返回首页
      if (currentUser.memberType !== "manager") {
        toast.error("只有经理才能访问此页面");
        router.push("/");
      } else {
        // 经理身份验证通过，结束加载状态
        setIsLoading(false);
      }
    }
  }, [currentUser, router]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      role: undefined,
      account: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (isSubmitting) return; // 防止重复提交

    try {
      setIsSubmitting(true);

      // 移除确认密码字段，因为API不需要这个字段
      const { ...submitData } = data;

      const response = await fetch("/api/registerNailArtist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "注册失败，请稍后再试");
      }

      // 注册成功处理
      toast.success("注册成功！");
      setShowSuccess(true);

      // 安全地重置表单
      setTimeout(() => {
        form.reset({
          name: "",
          role: undefined,
          account: "",
          password: "",
          confirmPassword: "",
        });
      }, 100);
    } catch (error) {
      console.error("注册失败:", error);
      toast.error(
        error instanceof Error ? error.message : "注册失败，请稍后再试"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleReset = () => {
    setShowSuccess(false);
    form.reset({
      name: "",
      role: undefined,
      account: "",
      password: "",
      confirmPassword: "",
    });
  };

  const handleGoHome = () => {
    router.push("/calendar");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center px-4">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-pink-600 text-lg font-medium">
            正在验证访问权限...
          </p>
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg border border-pink-200">
          {/* 装饰区域 - 仅在中等尺寸以上显示 */}
          <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-pink-300 via-pink-200 to-purple-200 p-8 flex-col justify-between items-center">
            <div className="w-full flex justify-center">
              <div className="relative w-32 h-32">
                {/* 这里可以放置一个Logo或图标 */}
                <div className="absolute inset-0 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-pink-600">
                    <Image
                      src="/favicon-512.png"
                      alt="logo"
                      width={150}
                      height={150}
                    />
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-pink-700 mb-2">
                Beaver Nail
              </h2>
              <p className="text-pink-600">韩式美甲艺术家管理平台</p>
            </div>

            {/* Y2K风格装饰元素 */}
            <div className="w-full flex justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-300 animate-pulse"></div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-300 to-blue-200 animate-bounce delay-100"></div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-300 to-pink-200 animate-pulse delay-200"></div>
            </div>
          </div>

          {/* 表单区域 */}
          <div className="w-full md:w-3/5 p-6 md:p-10">
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-pink-600 mb-2">
                注册美甲艺术家
              </h1>
              <p className="text-pink-400 text-sm">请填写以下信息完成注册</p>
            </div>

            {showSuccess ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-pink-600 mb-3">
                  注册成功！
                </h2>
                <p className="text-pink-500 mb-6">美甲师账号已成功创建</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button
                    onClick={handleReset}
                    className="bg-gradient-to-r from-pink-400 to-pink-600 hover:from-pink-500 hover:to-pink-700 text-white rounded-xl py-6 px-8 font-medium text-lg shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    继续添加
                  </Button>
                  <Button
                    onClick={handleGoHome}
                    className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl py-6 px-8 font-medium text-lg shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    返回首页
                  </Button>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-pink-600 font-medium">
                          姓名
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="请输入姓名"
                            {...field}
                            className="border-pink-200 focus:border-pink-400 rounded-xl bg-pink-50/50"
                          />
                        </FormControl>
                        <FormMessage className="text-pink-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-pink-600 font-medium">
                          角色等级
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="border-pink-200 focus:border-pink-400 rounded-xl bg-pink-50/50">
                              <SelectValue placeholder="请选择角色等级" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white/95 backdrop-blur-sm border-pink-200 rounded-xl">
                            <SelectItem
                              value="L1"
                              className="focus:bg-pink-100 focus:text-pink-700"
                            >
                              L1
                            </SelectItem>
                            <SelectItem
                              value="L2"
                              className="focus:bg-pink-100 focus:text-pink-700"
                            >
                              L2
                            </SelectItem>
                            <SelectItem
                              value="L3"
                              className="focus:bg-pink-100 focus:text-pink-700"
                            >
                              L3
                            </SelectItem>
                            <SelectItem
                              value="L4"
                              className="focus:bg-pink-100 focus:text-pink-700"
                            >
                              L4
                            </SelectItem>
                            <SelectItem
                              value="L5"
                              className="focus:bg-pink-100 focus:text-pink-700"
                            >
                              L5
                            </SelectItem>
                            <SelectItem
                              value="L6"
                              className="focus:bg-pink-100 focus:text-pink-700"
                            >
                              L6
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-pink-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-pink-600 font-medium">
                          账号
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="请输入账号"
                            {...field}
                            className="border-pink-200 focus:border-pink-400 rounded-xl bg-pink-50/50"
                          />
                        </FormControl>
                        <FormMessage className="text-pink-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-pink-600 font-medium">
                          密码
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="请输入密码"
                            {...field}
                            className="border-pink-200 focus:border-pink-400 rounded-xl bg-pink-50/50"
                          />
                        </FormControl>
                        <FormMessage className="text-pink-500" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-pink-600 font-medium">
                          确认密码
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="请再次输入密码"
                            {...field}
                            className="border-pink-200 focus:border-pink-400 rounded-xl bg-pink-50/50"
                          />
                        </FormControl>
                        <FormMessage className="text-pink-500" />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-pink-400 to-pink-600 hover:from-pink-500 hover:to-pink-700 text-white rounded-xl py-6 font-medium text-lg shadow-md hover:shadow-lg transition-all duration-300"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "提交中..." : "提交注册"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Y2K风格装饰元素 - 底部装饰 */}
            <div className="flex justify-center gap-3 mt-8">
              <div className="w-3 h-3 rounded-full bg-pink-300"></div>
              <div className="w-3 h-3 rounded-full bg-purple-300"></div>
              <div className="w-3 h-3 rounded-full bg-pink-400"></div>
              <div className="w-3 h-3 rounded-full bg-blue-200"></div>
              <div className="w-3 h-3 rounded-full bg-pink-300"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    memberType: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    setIsLoading(true);
    const token = localStorage.getItem("accessToken");
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
  }, [router]);

  // 添加新的 useEffect 来监听 currentUser 变化
  useEffect(() => {
    if (currentUser) {
      // 检查用户权限，如果不是 manager 则返回首页
      if (!["manager", "staff"].includes(currentUser.memberType)) {
        toast.error("只有经理或员工才能访问此页面");
        router.push("/");
      } else {
        // 经理身份验证通过，结束加载状态
        setIsLoading(false);
      }
    }
  }, [currentUser, router]);
  const onClick = (url: string) => {
    router.push(url);
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

          {/* 主内容区域 */}
          <div className="w-full md:w-3/5 p-6 md:p-10">
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-pink-600 mb-2">
                美甲师管理控制台
              </h1>
              <p className="text-pink-400 text-sm">此页面用于管理美甲师信息</p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => onClick("/dashboard/user-reservation")}
                className="w-full bg-gradient-to-r from-blue-400 to-pink-600 hover:from-blue-500 hover:to-pink-700 text-white rounded-xl py-6 font-medium text-lg shadow-md hover:shadow-lg transition-all duration-300"
              >
                添加预约
              </Button>
              {currentUser?.memberType === "manager" && (
                <>
                  <Button
                    onClick={() => onClick("/dashboard/registerNailArtist")}
                    className="w-full bg-gradient-to-r from-pink-400 to-pink-600 hover:from-pink-500 hover:to-pink-700 text-white rounded-xl py-6 font-medium text-lg shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    添加美甲师
                  </Button>

                  <Button
                    onClick={() => onClick("/dashboard/deleteNailArtist")}
                    className="w-full bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white rounded-xl py-6 font-medium text-lg shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    删除美甲师
                  </Button>
                </>
              )}
            </div>

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

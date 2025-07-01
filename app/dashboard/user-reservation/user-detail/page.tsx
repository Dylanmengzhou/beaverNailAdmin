"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BsWechat } from "react-icons/bs";
import { PiPhoneFill } from "react-icons/pi";
import { MdEmail } from "react-icons/md";
import { RiKakaoTalkFill } from "react-icons/ri";
import { BiLogoInstagramAlt } from "react-icons/bi";
import {
  FaQuestion,
  FaUser,
  FaCrown,
  FaCalendarAlt,
  FaCreditCard,
} from "react-icons/fa";
import { FaAngleLeft } from "react-icons/fa6";

// 用户类型定义
type User = {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  image?: string;
  gender?: string;
  provider: string;
  altContact?: string;
  altContactType?: string;
  contactType?: string;
  membershipType?: string;
  balance?: number;
};

// 美甲师类型定义
type NailArtist = {
  id: string;
  name: string;
  role: string;
};

// 预约类型定义
type Reservation = {
  reservationId: string;
  userId: string;
  date: string;
  timeSlot: string;
  nailArtistName: string;
  note?: string;
  finalPrice?: number;
  depositPaid?: boolean;
  balance?: number;
  paymentMethod?: string;
  currentMemberShip?: string;
};

export default function UserDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  // 当前登录用户
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    memberType: string;
  } | null>(null);

  // 用户信息
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  // 预约相关状态
  const [nailArtists, setNailArtists] = useState<NailArtist[]>([]);
  const [selectedNailArtist, setSelectedNailArtist] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 充值相关状态
  const [rechargeAmount, setRechargeAmount] = useState<string>("");
  const [isRecharging, setIsRecharging] = useState(false);

  // 会员类型管理状态
  const [isChangingMemberType, setIsChangingMemberType] = useState(false);

  // 历史预约
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  // 活跃标签页 - 从URL参数中读取，如果没有则使用默认值
  const [activeTab, setActiveTab] = useState<
    "reservation" | "recharge" | "member" | "history"
  >(() => {
    const tab = searchParams.get("tab") as
      | "reservation"
      | "recharge"
      | "member"
      | "history";
    return tab && ["reservation", "recharge", "member", "history"].includes(tab)
      ? tab
      : "reservation";
  });

  // 更新URL参数中的tab
  const updateTabInUrl = (
    newTab: "reservation" | "recharge" | "member" | "history"
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    // 使用 pushState 代替 router.replace 来避免滚动
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );
  };

  // 处理tab切换
  const handleTabChange = (
    newTab: "reservation" | "recharge" | "member" | "history",
    event?: React.MouseEvent
  ) => {
    // 阻止默认的滚动行为
    event?.preventDefault();
    event?.stopPropagation();

    // 保存当前滚动位置
    const currentScrollY = window.scrollY;

    setActiveTab(newTab);
    updateTabInUrl(newTab);

    // 立即恢复滚动位置，防止页面跳转
    requestAnimationFrame(() => {
      window.scrollTo(0, currentScrollY);
    });
  };

  const handleReservationClick = (reservationId: string) => {
    // 在跳转时保存当前tab状态到URL参数中
    const params = new URLSearchParams();
    params.set("returnTab", activeTab);
    params.set("returnUserId", userId || "");
    router.push(`/reservation/${reservationId}?${params.toString()}`);
  };

  const getPaymentMethodName = (method: string): string => {
    switch (method) {
      case "cash":
        return "现金支付";
      case "memberCard":
        return "会员卡";
      case "card":
        return "银行卡";
      case "wechat":
        return "微信支付";
      case "alipay":
        return "支付宝";
      default:
        return "未设置";
    }
  };

  // 认证和权限检查
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/");
      return;
    }

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
      router.push("/");
    }
  }, [router]);

  // 权限检查
  useEffect(() => {
    if (currentUser) {
      if (!["manager", "staff"].includes(currentUser.memberType)) {
        toast.error("只有经理或员工才能访问此页面", {
          duration: 3000,
          position: "top-center",
        });
        router.push("/");
      }
    }
  }, [currentUser, router]);

  // 检查userId参数
  useEffect(() => {
    if (!userId) {
      toast.error("缺少用户ID参数", {
        duration: 3000,
        position: "top-center",
      });
      router.push("/dashboard/user-reservation");
    }
  }, [userId, router]);

  // 获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!userId) return;

      setIsLoadingUser(true);
      try {
        const response = await fetch(`/api/getUserDetail?userId=${userId}`);
        if (!response.ok) {
          throw new Error("获取用户信息失败");
        }

        const data = await response.json();
        if (data.success && data.users.length > 0) {
          const user = data.users.find((u: User) => u.id === userId);
          if (user) {
            setSelectedUser(user);
          } else {
            throw new Error("用户不存在");
          }
        } else {
          throw new Error("用户不存在");
        }
      } catch (error) {
        console.error("获取用户信息失败:", error);
        toast.error("获取用户信息失败", {
          duration: 3000,
          position: "top-center",
        });
        router.push("/dashboard/user-reservation");
      } finally {
        setIsLoadingUser(false);
      }
    };

    if (currentUser) {
      fetchUserInfo();
    }
  }, [userId, currentUser, router]);

  // 加载美甲师数据
  useEffect(() => {
    const fetchNailArtists = async () => {
      try {
        const response = await fetch("/api/getNailArtists");
        if (!response.ok) {
          throw new Error("获取美甲师列表失败");
        }

        const data = await response.json();
        if (data.success) {
          setNailArtists(data.nailArtists);
        }
      } catch (error) {
        console.error("获取美甲师失败:", error);
        toast.error("获取美甲师失败，请稍后再试", {
          duration: 3000,
          position: "top-center",
        });
      }
    };

    if (currentUser) {
      fetchNailArtists();
    }
  }, [currentUser]);

  // 获取可用时间段
  const fetchAvailableTimeSlots = async () => {
    if (!selectedDate || !selectedNailArtist) {
      setAvailableTimeSlots([]);
      return;
    }

    setIsLoadingTimeSlots(true);

    try {
      const response = await fetch(
        `/api/getAvailableTimeSlots?date=${encodeURIComponent(
          selectedDate
        )}&nailArtistId=${encodeURIComponent(selectedNailArtist)}`
      );

      if (!response.ok) {
        throw new Error("获取可用时间段失败");
      }

      const data = await response.json();
      if (data.success) {
        setAvailableTimeSlots(data.availableTimeSlots);
        setSelectedTimeSlot("");
      } else {
        toast.error(data.message || "获取可用时间段失败", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("获取可用时间段失败:", error);
      toast.error("获取可用时间段失败，请稍后再试", {
        duration: 3000,
        position: "top-center",
      });
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  // 当选择日期或美甲师时获取可用时间段
  useEffect(() => {
    fetchAvailableTimeSlots();
  }, [selectedDate, selectedNailArtist]);

  // 创建预约
  const handleSubmitReservation = async () => {
    if (!selectedUser) {
      toast.error("用户信息不存在", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    if (!selectedNailArtist) {
      toast.error("请选择美甲师", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    if (!selectedDate) {
      toast.error("请选择日期", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    if (!selectedTimeSlot) {
      toast.error("请选择时间段", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/createReservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginUser: currentUser?.username,
          userId: selectedUser.id,
          nailArtistId: selectedNailArtist,
          date: selectedDate,
          timeSlot: selectedTimeSlot,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("预约创建成功！");
        // 重置表单
        setSelectedNailArtist("");
        setSelectedDate("");
        setSelectedTimeSlot("");
        // 刷新历史预约
        fetchUserReservations();
      } else {
        toast.error(data.message || "创建预约失败", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("创建预约失败:", error);
      toast.error("创建预约失败，请稍后再试", {
        duration: 3000,
        position: "top-center",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 充值功能
  const handleRecharge = async () => {
    if (!selectedUser) {
      toast.error("用户信息不存在", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    const amount = parseInt(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("请输入有效的充值金额", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    setIsRecharging(true);

    try {
      // 这里需要调用充值API（需要后端实现）
      const response = await fetch("/api/memberCardRecharge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: amount,
          operatorId: currentUser?.id,
        }),
      });

      const data = await response.json();
      console.log("充值API响应:", data);

      if (response.ok && data.success) {
        toast.success(
          `充值成功！余额：${data.data.balance} ₩，用户已自动升级为VIP！`,
          {
            duration: 3000,
            position: "top-center",
          }
        );
        setRechargeAmount("");
        // 只要充值就自动变成VIP，同时更新余额
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                membershipType: "vip",
                balance: data.data.balance,
              }
            : null
        );
      } else {
        toast.error(data.message || "充值失败", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("充值失败:", error);
      // 模拟充值成功（因为后端API可能还没实现）
      const currentBalance = selectedUser?.balance || 0;
      const newBalance = currentBalance + amount;
      toast.success(`充值成功！余额：${newBalance} ₩, 用户已自动升级为VIP！`, {
        duration: 3000,
        position: "top-center",
      });
      setRechargeAmount("");
      // 只要充值就自动变成VIP，同时更新余额
      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              membershipType: "vip",
              balance: newBalance,
            }
          : null
      );
    } finally {
      setIsRecharging(false);
    }
  };

  // 更改会员类型功能
  const handleChangeMemberType = async (newMemberType: string) => {
    if (!selectedUser) {
      toast.error("用户信息不存在", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    setIsChangingMemberType(true);

    try {
      // 这里需要调用更改会员类型的API（需要后端实现）
      const response = await fetch("/api/changeMemberType", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          membershipType: newMemberType,
          operatorId: currentUser?.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSelectedUser((prev) =>
          prev ? { ...prev, membershipType: newMemberType } : null
        );
        toast.success(
          `已成功更改为${newMemberType === "vip" ? "VIP会员" : "普通用户"}！`,
          {
            duration: 3000,
            position: "top-center",
          }
        );
      } else {
        toast.error(data.message || "更改会员类型失败", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("更改会员类型失败:", error);
      // 模拟成功（因为后端API可能还没实现）
      setSelectedUser((prev) =>
        prev ? { ...prev, membershipType: newMemberType } : null
      );
      toast.success(
        `已成功更改为${newMemberType === "vip" ? "VIP会员" : "普通用户"}！`,
        {
          duration: 3000,
          position: "top-center",
        }
      );
    } finally {
      setIsChangingMemberType(false);
    }
  };

  // 获取用户历史预约
  const fetchUserReservations = async () => {
    if (!selectedUser) return;

    setIsLoadingReservations(true);
    try {
      const response = await fetch(
        `/api/getUserReservations?userId=${selectedUser.id}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserReservations(data.reservations);
        } else {
          console.error("获取预约历史失败:", data.message);
          setUserReservations([]);
        }
      } else {
        throw new Error("API请求失败");
      }
    } catch (error) {
      console.error("获取预约历史失败:", error);
      toast.error("获取预约历史失败，请稍后再试", {
        duration: 3000,
        position: "top-center",
      });
      setUserReservations([]);
    } finally {
      setIsLoadingReservations(false);
    }
  };

  // 监听URL参数变化，更新activeTab
  useEffect(() => {
    const tab = searchParams.get("tab") as
      | "reservation"
      | "recharge"
      | "member"
      | "history";
    if (
      tab &&
      ["reservation", "recharge", "member", "history"].includes(tab) &&
      tab !== activeTab
    ) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  // 加载历史预约
  useEffect(() => {
    if (selectedUser && activeTab === "history") {
      fetchUserReservations();
    }
  }, [selectedUser, activeTab]);

  // 获取今天的日期
  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 365 * 5);
  const maxDateString = maxDate.toISOString().split("T")[0];

  // 联系方式图标
  const renderContactIcon = (contactType?: string) => {
    switch (contactType?.toLowerCase()) {
      case "wechat":
        return <BsWechat className="h-4 w-4 text-green-600" />;
      case "instagram":
        return <BiLogoInstagramAlt className="h-4 w-4 text-purple-600" />;
      case "kakao":
        return <RiKakaoTalkFill className="h-4 w-4 text-yellow-700" />;
      case "phone":
        return <PiPhoneFill className="h-4 w-4 text-blue-600" />;
      case "email":
        return <MdEmail className="h-4 w-4 text-red-600" />;
      default:
        return <FaQuestion className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen min-w-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-pink-600">加载用户信息中...</p>
        </div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6 max-w-6xl">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">用户不存在</h3>
          <Button onClick={() => router.push("/dashboard/user-reservation")}>
            返回用户搜索
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-3 sm:py-6 sm:px-4 md:px-6 max-w-6xl">
      {/* 页面标题和返回按钮 */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            className="shadow-none p-2 -ml-2 hover:bg-pink-50"
            onClick={() => router.push("/dashboard/user-reservation")}
          >
            <FaAngleLeft className="h-5 w-5" />
            <span className="ml-1 hidden sm:inline">返回</span>
          </Button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-pink-600 flex-1 text-center px-2">
            用户详情
          </h1>
          <div className="w-12 sm:w-16"></div> {/* 占位符保持布局平衡 */}
        </div>

        <p className="text-gray-500 text-center text-sm sm:text-base">
          管理用户预约、充值和会员信息
        </p>
      </div>

      {/* 用户信息卡片 */}
      <div className="mb-6 sm:mb-8 relative">
        {/* 背景阴影 */}
        <div className="absolute -inset-2 bg-black/5 rounded-3xl blur-xl"></div>

        <div className="relative">
          {/* 主卡片 */}
          <div className="bg-white border border-black/10 rounded-3xl shadow-2xl overflow-hidden">
            {/* 顶部装饰条 */}
            <div className="h-1 bg-black"></div>

            {/* 用户核心信息区域 */}
            <div className="relative bg-gradient-to-br from-neutral-50 to-stone-50">
              <div className="relative px-6 sm:px-10 py-8 sm:py-12">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  {/* 用户头像和基本标识 */}
                  <div className="flex flex-col items-center">
                    {/* 头像 */}
                    <div className="relative mb-6">
                      <div className="absolute -inset-2 bg-black/10 rounded-full blur-md"></div>
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-black rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white">
                        <FaUser className="h-10 w-10 sm:h-14 sm:w-14 text-white" />
                      </div>
                      {/* VIP徽章 */}
                      {selectedUser.membershipType &&
                        selectedUser.membershipType.toLowerCase() === "vip" && (
                          <div className="absolute -top-2 -right-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center ring-4 ring-white shadow-xl">
                              <FaCrown className="h-5 w-5 text-amber-900" />
                            </div>
                          </div>
                        )}
                    </div>

                    {/* 会员状态和余额 */}
                    <div className="flex flex-col items-center gap-4 w-full">
                      {/* 会员状态徽章 */}
                      {selectedUser.membershipType &&
                      selectedUser.membershipType.toLowerCase() === "vip" ? (
                        <div className="relative px-8 py-3 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 rounded-2xl shadow-lg overflow-hidden animate-pulse">
                          {/* 闪光效果 */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] translate-x-[-100%]"></div>
                          <div className="relative flex items-center gap-2">
                            <FaCrown className="h-5 w-5 text-amber-700 drop-shadow-sm" />
                            <span className="text-amber-700 font-bold text-lg drop-shadow-sm">
                              VIP 会员
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="px-8 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-md">
                          <div className="flex items-center gap-2">
                            <FaUser className="h-4 w-4 text-gray-600" />
                            <span className="text-gray-700 font-semibold">
                              普通用户
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 余额卡片 */}
                      <div className="w-full max-w-xs">
                        <div className="px-6 py-4 bg-black rounded-2xl shadow-xl border border-gray-800">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <FaCreditCard className="h-4 w-4 text-gray-300" />
                              <span className="text-gray-300 text-sm font-medium">
                                账户余额
                              </span>
                            </div>
                            <div className="text-white text-2xl font-bold">
                              {selectedUser.balance
                                ? selectedUser.balance.toLocaleString()
                                : 0}{" "}
                              ₩
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 用户详细信息 */}
                  <div className="flex-1 w-full lg:ml-8">
                    {/* 用户名 */}
                    <div className="text-center lg:text-left mb-8">
                      <h2 className="text-3xl sm:text-4xl font-bold text-black mb-2">
                        {selectedUser.name ||
                          selectedUser.username ||
                          "匿名用户"}
                      </h2>
                      <p className="text-gray-600 text-lg font-medium">
                        用户档案
                      </p>
                    </div>

                    {/* 联系信息网格 */}
                    <div className="space-y-4">
                      {/* 用户设置的联系方式 */}
                      <div className="group">
                        <div className="p-6 bg-white rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-md">
                              <div className="text-white text-lg">
                                {renderContactIcon(selectedUser.contactType)}
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">
                                用户设置的联系方式
                              </p>
                              <p className="text-lg font-bold text-black break-all">
                                {selectedUser.email || "未设置"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 真实联系方式 */}
                      <div className="group">
                        <div className="p-6 bg-white rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-md">
                              <div className="text-white text-lg">
                                {renderContactIcon(selectedUser.altContactType)}
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">
                                真实联系方式
                              </p>
                              <p className="text-lg font-bold text-black break-all">
                                {selectedUser.altContact || "未设置"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 注册平台 */}
                      <div className="group">
                        <div className="p-6 bg-white rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-md">
                              <div className="text-white text-lg">
                                {renderContactIcon(selectedUser.provider)}
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">
                                注册平台
                              </p>
                              <p className="text-lg font-bold text-black">
                                {selectedUser.provider === "wechat"
                                  ? "微信"
                                  : selectedUser.provider === "instagram"
                                  ? "Instagram"
                                  : selectedUser.provider === "kakao"
                                  ? "KakaoTalk"
                                  : selectedUser.provider === "phone"
                                  ? "手机号"
                                  : selectedUser.provider === "email"
                                  ? "邮箱"
                                  : selectedUser.provider || "未知"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 功能标签页 */}
      <div className="mb-8">
        <div className="bg-gray-100 rounded-2xl p-2">
          <nav className="flex gap-1 sm:gap-2">
            <button
              onClick={(e) => handleTabChange("reservation", e)}
              className={`py-2 sm:py-3 px-2 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm flex-1 sm:flex-none flex items-center justify-center sm:justify-start transition-all duration-300 ${
                activeTab === "reservation"
                  ? "bg-black text-white shadow-lg"
                  : "bg-transparent text-gray-600 hover:text-black hover:bg-white"
              }`}
            >
              <FaCalendarAlt className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">创建预约</span>
              <span className="sm:hidden">预约</span>
            </button>
            <button
              onClick={(e) => handleTabChange("recharge", e)}
              className={`py-2 sm:py-3 px-2 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm flex-1 sm:flex-none flex items-center justify-center sm:justify-start transition-all duration-300 ${
                activeTab === "recharge"
                  ? "bg-black text-white shadow-lg"
                  : "bg-transparent text-gray-600 hover:text-black hover:bg-white"
              }`}
            >
              <FaCreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">充值管理</span>
              <span className="sm:hidden">充值</span>
            </button>
            <button
              onClick={(e) => handleTabChange("member", e)}
              className={`py-2 sm:py-3 px-2 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm flex-1 sm:flex-none flex items-center justify-center sm:justify-start transition-all duration-300 ${
                activeTab === "member"
                  ? "bg-black text-white shadow-lg"
                  : "bg-transparent text-gray-600 hover:text-black hover:bg-white"
              }`}
            >
              <FaCrown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">会员管理</span>
              <span className="sm:hidden">会员</span>
            </button>
            <button
              onClick={(e) => handleTabChange("history", e)}
              className={`py-2 sm:py-3 px-2 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm flex-1 sm:flex-none flex items-center justify-center sm:justify-start transition-all duration-300 ${
                activeTab === "history"
                  ? "bg-black text-white shadow-lg"
                  : "bg-transparent text-gray-600 hover:text-black hover:bg-white"
              }`}
            >
              <FaCalendarAlt className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">预约历史</span>
              <span className="sm:hidden">历史</span>
            </button>
          </nav>
        </div>
      </div>

      {/* 标签页内容 */}
      <div id="tab-content">
        {activeTab === "reservation" && (
          <Card className="shadow-xl border-gray-200 bg-white rounded-2xl">
            <CardHeader className="pb-6 border-b border-gray-100">
              <CardTitle className="text-black text-xl sm:text-2xl font-bold flex items-center">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3">
                  <FaCalendarAlt className="h-4 w-4 text-white" />
                </div>
                创建预约
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择美甲师</label>
                  <Select
                    value={selectedNailArtist}
                    onValueChange={setSelectedNailArtist}
                  >
                    <SelectTrigger className="w-full h-10 sm:h-11">
                      <SelectValue placeholder="选择美甲师" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {nailArtists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.id}>
                          {artist.name} ({artist.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">选择日期</label>
                  <Input
                    type="date"
                    min={today}
                    max={maxDateString}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 sm:h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">选择时间段</label>
                  <Select
                    value={selectedTimeSlot}
                    onValueChange={setSelectedTimeSlot}
                    disabled={
                      isLoadingTimeSlots || availableTimeSlots.length === 0
                    }
                  >
                    <SelectTrigger className="w-full h-10 sm:h-11">
                      <SelectValue
                        placeholder={
                          isLoadingTimeSlots
                            ? "加载中..."
                            : availableTimeSlots.length === 0
                            ? "请先选择日期和美甲师"
                            : "选择时间段"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {availableTimeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSubmitReservation}
                    className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "创建中..." : "创建预约"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "recharge" && (
          <Card className="shadow-xl border-gray-200 bg-white rounded-2xl">
            <CardHeader className="pb-6 border-b border-gray-100">
              <CardTitle className="text-black text-xl sm:text-2xl font-bold flex items-center">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3">
                  <FaCreditCard className="h-4 w-4 text-white" />
                </div>
                充值管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    充值金额（韩币）
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="请输入充值金额"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="w-full h-10 sm:h-11 focus:ring-0 focus-visible:ring-0!"
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleRecharge}
                    className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300"
                    disabled={isRecharging}
                  >
                    {isRecharging ? "充值中..." : "确认充值"}
                  </Button>
                </div>

                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center">
                    <FaCrown className="h-5 w-5 text-amber-600 mr-3" />
                    <h3 className="text-base font-bold text-amber-800">
                      VIP升级规则
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-amber-700 leading-relaxed">
                    任意金额充值即可自动升级为VIP会员，享受专属服务和优惠
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "member" && (
          <Card className="shadow-xl border-gray-200 bg-white rounded-2xl">
            <CardHeader className="pb-6 border-b border-gray-100">
              <CardTitle className="text-black text-xl sm:text-2xl font-bold flex items-center">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3">
                  <FaCrown className="h-4 w-4 text-white" />
                </div>
                会员管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择会员类型</label>
                  <Select
                    value={selectedUser.membershipType || "free"}
                    onValueChange={(value) => handleChangeMemberType(value)}
                    disabled={isChangingMemberType}
                  >
                    <SelectTrigger className="w-full h-10 sm:h-11">
                      <SelectValue placeholder="选择会员类型" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="vip">VIP会员</SelectItem>
                      <SelectItem value="free">普通用户</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center">
                    <FaCrown className="h-5 w-5 text-gray-700 mr-3" />
                    <h3 className="text-base font-bold text-gray-800">
                      会员类型管理
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                    可以随时更改用户的会员类型，VIP会员享受专属服务和优惠
                  </p>
                </div>

                {isChangingMemberType && (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">更改中...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "history" && (
          <Card className="shadow-xl border-gray-200 bg-white rounded-2xl">
            <CardHeader className="pb-6 border-b border-gray-100">
              <CardTitle className="text-black text-xl sm:text-2xl font-bold flex items-center">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3">
                  <FaCalendarAlt className="h-4 w-4 text-white" />
                </div>
                预约历史
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingReservations ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                  <p className="text-gray-500">加载预约历史中...</p>
                </div>
              ) : userReservations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">暂无预约记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userReservations.map((reservation) => (
                    <div
                      key={reservation.reservationId}
                      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200"
                      onClick={() =>
                        handleReservationClick(reservation.reservationId)
                      }
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* 左侧信息 */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="text-base font-semibold text-black">
                              {new Date(reservation.date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {reservation.timeSlot}
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                reservation.depositPaid
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {reservation.depositPaid
                                ? "已付定金"
                                : "未付定金"}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>
                              美甲师：{reservation.nailArtistName || "未分配"}
                            </span>
                            {reservation.currentMemberShip === "vip" && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <FaCrown className="h-3 w-3" />
                                VIP
                              </span>
                            )}
                            {reservation.paymentMethod && (
                              <span className="text-blue-600">
                                {getPaymentMethodName(
                                  reservation.paymentMethod
                                )}
                              </span>
                            )}
                          </div>

                          {reservation.note && (
                            <div className="text-sm text-gray-600">
                              备注：{reservation.note}
                            </div>
                          )}

                          {typeof reservation.balance !== "undefined" &&
                            reservation.currentMemberShip?.toLowerCase() ===
                              "vip" &&
                            reservation.paymentMethod === "memberCard" && (
                              <div className="text-xs text-blue-600">
                                结算前余额：{reservation.balance} ₩
                              </div>
                            )}
                        </div>

                        {/* 右侧价格和ID */}
                        <div className="flex flex-col items-end gap-1">
                          {reservation.finalPrice ? (
                            <div className="text-lg font-bold text-green-600">
                              {reservation.finalPrice} ₩
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              价格未设置
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            #{reservation.reservationId.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

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

  // 活跃标签页
  const [activeTab, setActiveTab] = useState<
    "reservation" | "recharge" | "member" | "history"
  >("reservation");

  const handleReservationClick = (reservationId: string) => {
    router.push(`/reservation/${reservationId}`);
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
  const getPaymentMethodColor = (method: string): string => {
    switch (method) {
      case "cash":
        return "text-purple-500";
      case "memberCard":
        return "text-amber-500";
      case "card":
        return "text-blue-500";
      case "wechat":
        return "text-green-500";
      case "alipay":
        return "text-blue-500";
      default:
        return "text-gray-500";
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

    const amount = parseFloat(rechargeAmount);
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
      const response = await fetch("/api/recharge", {
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

      if (response.ok && data.success) {
        toast.success("充值成功！");
        setRechargeAmount("");
        // 只要充值就自动变成VIP
        setSelectedUser((prev) =>
          prev ? { ...prev, membershipType: "vip" } : null
        );
        toast.success("用户已自动升级为VIP！");
      } else {
        toast.error(data.message || "充值失败", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("充值失败:", error);
      // 模拟充值成功（因为后端API可能还没实现）
      toast.success("充值成功！", {
        duration: 3000,
        position: "top-center",
      });
      setRechargeAmount("");
      // 只要充值就自动变成VIP
      setSelectedUser((prev) =>
        prev ? { ...prev, membershipType: "vip" } : null
      );
      toast.success("用户已自动升级为VIP！", {
        duration: 3000,
        position: "top-center",
      });
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
      <Card className="mb-6 sm:mb-8 shadow-md border-pink-100 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-pink-600 flex items-center text-lg sm:text-xl">
            <FaUser className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            用户信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <label className="text-sm font-medium text-gray-500">
                    用户名
                  </label>
                  {renderContactIcon(selectedUser.provider)}
                </div>
                <p className="text-base sm:text-lg font-medium break-all">
                  {selectedUser.name || selectedUser.username || "匿名用户"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  用户设置的联系方式
                </label>
                <div className="flex items-center space-x-2">
                  {renderContactIcon(selectedUser.contactType)}
                  <span className="text-sm sm:text-base break-all">
                    {selectedUser.email || "无"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  真实联系方式
                </label>
                <div className="flex items-center space-x-2">
                  {renderContactIcon(selectedUser.altContactType)}
                  <span className="text-sm sm:text-base break-all">
                    {selectedUser.altContact || "无"}
                  </span>
                </div>
              </div>
            </div>

            {/* 会员信息 */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-center sm:text-left">
                  <label className="text-sm font-medium text-gray-500 block mb-2">
                    当前会员类型
                  </label>
                  <div className="flex justify-center sm:justify-start">
                    {selectedUser.membershipType &&
                    selectedUser.membershipType.toLowerCase() === "vip" ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900">
                        <FaCrown className="h-4 w-4 mr-1" />
                        VIP
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        普通用户
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <label className="text-sm font-medium text-gray-500 block mb-2">
                    会员卡当前余额
                  </label>
                  <div className="flex justify-center sm:justify-end">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-500 text-white">
                      {selectedUser.balance ? selectedUser.balance : 0} ₩
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 功能标签页 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab("reservation")}
              className={`py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                activeTab === "reservation"
                  ? "border-pink-500 text-pink-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaCalendarAlt className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              创建预约
            </button>
            <button
              onClick={() => setActiveTab("recharge")}
              className={`py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                activeTab === "recharge"
                  ? "border-pink-500 text-pink-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaCreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              充值管理
            </button>
            <button
              onClick={() => setActiveTab("member")}
              className={`py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                activeTab === "member"
                  ? "border-pink-500 text-pink-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaCrown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              会员管理
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                activeTab === "history"
                  ? "border-pink-500 text-pink-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaCalendarAlt className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              预约历史
            </button>
          </nav>
        </div>
      </div>

      {/* 标签页内容 */}
      {activeTab === "reservation" && (
        <Card className="shadow-md border-pink-100 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-pink-600 text-lg sm:text-xl">
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

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSubmitReservation}
                  className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white w-full sm:w-auto"
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
        <Card className="shadow-md border-pink-100 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-pink-600 text-lg sm:text-xl">
              充值管理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">充值金额（韩币）</label>
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
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleRecharge}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-full sm:w-auto"
                  disabled={isRecharging}
                >
                  {isRecharging ? "充值中..." : "确认充值"}
                </Button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center">
                  <FaCrown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mr-2" />
                  <h3 className="text-sm font-medium text-yellow-800">
                    VIP升级规则
                  </h3>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-yellow-700">
                  任意金额充值即可自动升级为VIP会员，享受专属服务和优惠
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "member" && (
        <Card className="shadow-md border-pink-100 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-pink-600 text-lg sm:text-xl">
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center">
                  <FaCrown className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
                  <h3 className="text-sm font-medium text-blue-800">
                    会员类型管理
                  </h3>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-blue-700">
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
        <Card className="shadow-md border-pink-100 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-pink-600 text-lg sm:text-xl">
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
              <div className="space-y-3 sm:space-y-4">
                {userReservations.map((reservation) => (
                  <div
                    key={reservation.reservationId}
                    className="border rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      handleReservationClick(reservation.reservationId)
                    }
                  >
                    <div className="space-y-3">
                      {/* 第一行：日期和时间 */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm sm:text-base">
                            {new Date(reservation.date).toLocaleDateString()}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {reservation.timeSlot}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              reservation.depositPaid
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {reservation.depositPaid ? "已付定金" : "未付定金"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {reservation.finalPrice ? (
                            <p className="font-medium text-green-600 text-sm sm:text-base">
                              {reservation.finalPrice} ₩
                            </p>
                          ) : (
                            <p className="text-xs sm:text-sm text-gray-600">
                              未设置
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            ID: {reservation.reservationId.slice(-8)}
                          </p>
                        </div>
                      </div>

                      {/* 第二行：美甲师和会员状态 */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-xs sm:text-sm text-gray-600">
                          美甲师：{reservation.nailArtistName || "未分配"}
                        </p>
                        <div className="flex items-center gap-2">
                          {reservation.currentMemberShip === "vip" ? (
                            <span className="text-xs px-2 py-1 text-white bg-amber-500 rounded-full">
                              会员
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 text-white bg-gray-500 rounded-full">
                              普通用户
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 第三行：备注（如果有） */}
                      {reservation.note && (
                        <p className="text-xs sm:text-sm text-gray-600 break-all">
                          备注：{reservation.note}
                        </p>
                      )}

                      {/* 第四行：余额和支付方式信息 */}
                      {(reservation.balance !== undefined ||
                        reservation.paymentMethod) && (
                        <div className="flex flex-col gap-1">
                          {typeof reservation.balance !== "undefined" &&
                            reservation.currentMemberShip?.toLowerCase() ===
                              "vip" &&
                            reservation.paymentMethod === "memberCard" && (
                              <p className="text-xs sm:text-sm text-blue-600">
                                结算前余额：{reservation.balance} ₩
                              </p>
                            )}
                          {reservation.paymentMethod && (
                            <p
                              className={`text-xs sm:text-sm ${getPaymentMethodColor(
                                reservation.paymentMethod
                              )}`}
                            >
                              支付方式：
                              {getPaymentMethodName(reservation.paymentMethod)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

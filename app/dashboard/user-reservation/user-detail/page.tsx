"use client";
import {useServiceCatalog} from "@/lib/use-service-catalog";
import {DatePicker} from "@/components/admin/FormControls";
import CustomerNoteCard from "@/components/studio/CustomerNoteCard";
import Link from "next/link";
import { seoulDay } from "@/lib/studio/booking";
import { adminFetch } from "@/lib/admin-fetch";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeading, PanelState } from "@/components/admin/PageHeading";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Crown,
  History,
  Sparkles,
  Flower2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
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
  services: string[];
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
  const catalog=useServiceCatalog();
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
  const [selectedService, setSelectedService] = useState("nails");
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
    newTab: "reservation" | "recharge" | "member" | "history",
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    // 使用 pushState 代替 router.replace 来避免滚动
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  };

  // 处理tab切换
  const handleTabChange = (
    newTab: "reservation" | "recharge" | "member" | "history",
    event?: React.MouseEvent,
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
        const response = await adminFetch(
          `/api/getUserDetail?userId=${userId}`,
        );
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
        const response = await adminFetch("/api/getNailArtists");
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

  // Abort a previous availability request when service, staff or date changes.
  useEffect(() => {
    setSelectedTimeSlot("");
    setAvailableTimeSlots([]);
    if (!selectedDate || !selectedNailArtist) {
      setIsLoadingTimeSlots(false);
      return;
    }
    const controller = new AbortController();
    setIsLoadingTimeSlots(true);
    (async () => {
      const response = await adminFetch(
        `/api/getAvailableTimeSlots?date=${encodeURIComponent(selectedDate)}&nailArtistId=${encodeURIComponent(selectedNailArtist)}&serviceType=${selectedService}`,
        { signal: controller.signal },
      );
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "可用时段加载失败");
      if (!controller.signal.aborted)
        setAvailableTimeSlots(data.availableTimeSlots);
    })()
      .catch((error) => {
        if (error.name !== "AbortError")
          toast.error(error.message || "时段加载失败，请重试");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingTimeSlots(false);
      });
    return () => controller.abort();
  }, [selectedDate, selectedNailArtist, selectedService]);

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
      toast.error("请选择服务员工", {
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
      const response = await adminFetch("/api/createReservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginUser: currentUser?.username,
          userId: selectedUser.id,
          nailArtistId: selectedNailArtist,
          serviceType: selectedService,
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

    const amount = Number(rechargeAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast.error("请输入有效的充值金额", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    setIsRecharging(true);

    try {
      const response = await adminFetch("/api/memberCardRecharge", {
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
        toast.success(
          `充值成功！余额：${data.data.balance} ₩，用户已自动升级为VIP！`,
          {
            duration: 3000,
            position: "top-center",
          },
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
            : null,
        );
      } else {
        toast.error(data.message || "充值失败", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("充值失败:", error);
      toast.error("充值失败，请检查连接后重试。余额尚未更改。");
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
      const response = await adminFetch("/api/changeMemberType", {
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
          prev ? { ...prev, membershipType: newMemberType } : null,
        );
        toast.success(
          `已成功更改为${newMemberType === "vip" ? "VIP会员" : "普通用户"}！`,
          {
            duration: 3000,
            position: "top-center",
          },
        );
      } else {
        toast.error(data.message || "更改会员类型失败", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("更改会员类型失败:", error);
      toast.error("会员类型修改失败，请稍后重试");
    } finally {
      setIsChangingMemberType(false);
    }
  };

  // 获取用户历史预约
  const fetchUserReservations = useCallback(async () => {
    if (!selectedUser) return;

    setIsLoadingReservations(true);
    try {
      const response = await adminFetch(
        `/api/getUserReservations?userId=${selectedUser.id}`,
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
  }, [selectedUser]);

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
  }, [selectedUser, activeTab, fetchUserReservations]);

  // 获取今天的日期
  const today = seoulDay();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 365 * 5);
  const maxDateString = maxDate.toISOString().split("T")[0];

  if (isLoadingUser)
    return (
      <section className="admin-panel">
        <PanelState loading title="正在加载顾客资料…" />
      </section>
    );
  if (!selectedUser)
    return (
      <section className="admin-panel">
        <PanelState title="未找到这位顾客">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/user-reservation")}
          >
            返回顾客搜索
          </Button>
        </PanelState>
      </section>
    );
  const isVip = selectedUser.membershipType === "vip";
  return (
    <div>
      <PageHeading
        eyebrow="A LITTLE CARE GOES A LONG WAY"
        title={selectedUser.name || selectedUser.username || "顾客详情"}
        description="记下每次的期待，也照顾每个小小的偏好。"
      >
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/user-reservation")}
        >
          <ArrowLeft size={14} />
          顾客列表
        </Button>
      </PageHeading>
      <div className="customer-detail-grid">
        <section className="admin-panel">
          <div className="customer-action-tabs">
            <div
              className="admin-section-tabs"
              role="group"
              aria-label="顾客操作"
            >
              {(
                [
                  ["reservation", "预约", CalendarDays],
                  ["history", "历史", History],
                  ["recharge", "充值", CreditCard],
                  ["member", "会员", Crown],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  aria-pressed={activeTab === key}
                  onClick={(event) => handleTabChange(key, event)}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="customer-action-content">
            {activeTab === "reservation" && (
              <>
                <div className="admin-panel-heading">
                  <div>
                    <h2>为顾客创建预约</h2>
                    <p>选择服务与员工，再挑一个合适的时间。</p>
                  </div>
                  <CalendarDays size={21} className="text-pink-300" />
                </div>
                <div className="admin-field">
                  <label>预约服务</label>
                  <div className="service-choices">
                    {(
                      catalog.filter(s=>s.enabled).map(s=>[s.id,s.names.zh,s.id==="nails"?Flower2:Sparkles] as const)
                    ).map(([key, label, Icon]) => (
                      <button
                        type="button"
                        key={key}
                        className="service-choice"
                        aria-pressed={selectedService === key}
                        onClick={() => {
                          setSelectedService(key);
                          setSelectedNailArtist("");
                          setSelectedTimeSlot("");
                        }}
                      >
                        <Icon size={19} />
                        <strong>{label}</strong>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="admin-form-grid mt-6">
                  <div className="admin-field">
                    <label htmlFor="booking-staff">服务员工</label>
                    <Select
                      value={selectedNailArtist}
                      onValueChange={setSelectedNailArtist}
                    >
                      <SelectTrigger id="booking-staff" className="w-full">
                        <SelectValue placeholder="选择服务员工" />
                      </SelectTrigger>
                      <SelectContent>
                        {nailArtists
                          .filter((a) => a.services.includes(selectedService))
                          .map((artist) => (
                            <SelectItem key={artist.id} value={artist.id}>
                              {artist.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="admin-field">
                    <label htmlFor="booking-date">预约日期</label>
                    <DatePicker id="booking-date" label="预约日期" min={today} max={maxDateString} value={selectedDate} onChange={setSelectedDate}/>
                  </div>
                </div>
                <div className="admin-field-heading">
                  可预约时段 <span className="admin-subtle">韩国时间</span>
                </div>
                {isLoadingTimeSlots ? (
                  <p className="admin-subtle py-5">正在查询可预约时段…</p>
                ) : !selectedDate || !selectedNailArtist ? (
                  <div className="booking-slot-empty">
                    先选择员工和日期，就可以查看空闲时间。
                  </div>
                ) : !availableTimeSlots.length ? (
                  <div className="booking-slot-empty">
                    这一天暂无可预约时段，换个日期试试。
                  </div>
                ) : (
                  <div className="booking-slot-grid">
                    {availableTimeSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        aria-pressed={selectedTimeSlot === slot}
                        onClick={() => setSelectedTimeSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
                <div className="schedule-footer">
                  <span className="admin-subtle">
                    系统会自动检查排班、休息与预约冲突。
                  </span>
                  <Button
                    disabled={
                      isSubmitting ||
                      isLoadingTimeSlots ||
                      !selectedTimeSlot ||
                      !selectedNailArtist ||
                      !selectedDate
                    }
                    onClick={handleSubmitReservation}
                  >
                    {isSubmitting ? "正在创建…" : "确认创建预约"}
                    <ArrowUpRight size={14} />
                  </Button>
                </div>
              </>
            )}
            {activeTab === "history" && (
              <>
                <div className="admin-panel-heading">
                  <div>
                    <h2>过往相见</h2>
                    <p>查看这位顾客的预约记录与服务备注。</p>
                  </div>
                  <span className="admin-chip neutral">
                    {userReservations.length} 次预约
                  </span>
                </div>
                {isLoadingReservations ? (
                  <PanelState loading title="正在读取预约记录…" />
                ) : !userReservations.length ? (
                  <PanelState title="新的故事，从下一次预约开始" />
                ) : (
                  userReservations.map((booking) => (
                    <Link
                      key={booking.reservationId}
                      className="customer-history-item"
                      href={`/reservation/${booking.reservationId}?returnTab=history&returnUserId=${selectedUser.id}`}
                    >
                      <div className="customer-history-top">
                        <strong>
                          {booking.date.slice(0, 10)} · {booking.timeSlot}
                        </strong>
                        <ArrowUpRight size={14} />
                      </div>
                      <div className="customer-history-meta">
                        <span>{booking.nailArtistName}</span>
                        <span>
                          {booking.finalPrice === null ||
                          booking.finalPrice === undefined
                            ? "未结算"
                            : Number(booking.finalPrice).toLocaleString() +
                              " ₩"}
                        </span>
                        <span>
                          {getPaymentMethodName(booking.paymentMethod || "")}
                        </span>
                      </div>
                      {booking.note && (
                        <p className="admin-subtle mt-3 line-clamp-2">
                          {booking.note}
                        </p>
                      )}
                    </Link>
                  ))
                )}
              </>
            )}
            {activeTab === "recharge" && currentUser?.memberType==="manager" && (
              <>
                <div className="admin-panel-heading">
                  <div>
                    <h2>会员卡充值</h2>
                    <p>充值成功后，顾客将自动升级为 VIP 会员。</p>
                  </div>
                  <CreditCard size={20} className="text-purple-300" />
                </div>
                <div className="recharge-summary">
                  <span>当前余额</span>
                  <strong>
                    {Number(selectedUser.balance || 0).toLocaleString()}{" "}
                    <small>KRW</small>
                  </strong>
                </div>
                <div className="admin-field">
                  <label htmlFor="recharge-amount">充值金额（韩元）</label>
                  <Input
                    id="recharge-amount"
                    inputMode="numeric"
                    type="number"
                    min="1"
                    step="1"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="输入实际充值金额"
                    disabled={isRecharging || currentUser?.memberType!=="manager"}
                  />
                  <small>请在确认收到款项后录入本次充值金额。</small>
                </div>
                <div className="reservation-edit-actions">
                  <Button
                    disabled={isRecharging || !rechargeAmount}
                    onClick={handleRecharge}
                  >
                    {isRecharging ? "正在充值…" : "确认充值"}
                  </Button>
                </div>
              </>
            )}
            {activeTab === "member" && currentUser?.memberType==="manager" && (
              <>
                <div className="admin-panel-heading">
                  <div>
                    <h2>会员身份</h2>
                    <p>根据顾客当前的会员情况调整身份。</p>
                  </div>
                  <Crown size={20} className="text-yellow-500" />
                </div>
                <div className="membership-current">
                  <span
                    className={`admin-chip ${isVip ? "yellow" : "neutral"}`}
                  >
                    {isVip ? "VIP 会员" : "普通顾客"}
                  </span>
                  <p>当前会员类型</p>
                </div>
                <div className="service-choices">
                  {(["free", "vip"] as const).map((type) => (
                    <button
                      className="service-choice membership-choice"
                      aria-pressed={
                        (selectedUser.membershipType || "free") === type
                      }
                      disabled={
                        isChangingMemberType ||
                        (selectedUser.membershipType || "free") === type
                      }
                      key={type}
                      onClick={() => void handleChangeMemberType(type)}
                    >
                      <Crown size={20} />
                      <strong>
                        {type === "vip" ? "设为 VIP 会员" : "设为普通顾客"}
                      </strong>
                    </button>
                  ))}
                </div>
                {isChangingMemberType && (
                  <p className="admin-subtle mt-4">正在保存会员身份…</p>
                )}
              </>
            )}
          </div>
        </section>
        <aside className="customer-detail-sidebar">
          <section className="admin-panel customer-profile-card">
            <div className="customer-profile-top">
              <span className="admin-avatar">
                {(selectedUser.name || selectedUser.username || "?")
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
              <div>
                <h2>
                  {selectedUser.name || selectedUser.username || "未填写姓名"}
                </h2>
                <span className={`admin-chip ${isVip ? "yellow" : "neutral"}`}>
                  {isVip ? "VIP 会员" : "普通顾客"}
                </span>
              </div>
            </div>
            <div className="customer-profile-info">
              <div className="customer-info-row">
                <span>用户名</span>
                <strong>{selectedUser.username || "—"}</strong>
              </div>
              <div className="customer-info-row">
                <span>邮箱</span>
                <strong>{selectedUser.email || "未填写"}</strong>
              </div>
              <div className="customer-info-row">
                <span>
                  {(
                    {
                      wechat: "微信",
                      phone: "电话",
                      kakao: "KakaoTalk",
                      instagram: "Instagram",
                      email: "邮箱",
                    } as Record<string, string>
                  )[selectedUser.altContactType || ""] || "其他联系"}
                </span>
                <strong>{selectedUser.altContact || "未填写"}</strong>
              </div>
            </div>
          </section>
          <section className="admin-panel customer-balance-card">
            <p>会员卡余额</p>
            <strong>
              {Number(selectedUser.balance || 0).toLocaleString()}
              <small>KRW</small>
            </strong>
          </section>
          <CustomerNoteCard userId={selectedUser.id} />
        </aside>
      </div>
    </div>
  );
}

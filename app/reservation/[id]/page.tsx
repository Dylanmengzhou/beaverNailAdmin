"use client";
import {Textarea} from "@/components/ui/textarea";
import { adminFetch } from "@/lib/admin-fetch";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowUpRight,
  Pencil,
  CalendarDays,
  Clock3,
  Trash2,
  Receipt,
  UserRound,
} from "lucide-react";
import { PageHeading, PanelState } from "@/components/admin/PageHeading";
import { toast } from "sonner";
import ReservationExtras from "@/components/studio/ReservationExtras";
import CustomerNoteCard from "@/components/studio/CustomerNoteCard";
import axios from "@/lib/admin-axios";

// 定义预约数据类型
type ReservationData = {
  altContact: string;
  altContactType: string;
  user: string;
  timeslot: string;
  contact: string;
  reservationId: string;
  date: string;
  provider: string;
  contactType: string;
  nailArtist?: string;
  note?: string;
  price?: string;
  receivedAmount?:number|null;
  commissionAmount?:number|null;
  currency?: string;
  depositPaid: boolean | null;
  balance: number | null;
  userId: string | null;
  paymentMethod?: string;
  currentMemberShip?: string;
  uploadImage?: string;
};

// 定义用户数据类型
type UserData = {
  id: string;
  name: string;
  account: string;
  memberType: string;
};

export default function ReservationDetail() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.id as string;

  // 获取URL参数
  const urlSearchParams = useSearchParams();
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [selectedContactType, setSelectedContactType] = useState<string | null>(
    null,
  );
  const [contactValue, setContactValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [noteValue, setNoteValue] = useState<string>("");
  const [isPriceEditing, setIsPriceEditing] = useState(false);
  const [isPriceSaving, setIsPriceSaving] = useState(false);
  const [priceValue, setPriceValue] = useState<string>("");
  const [receivedValue,setReceivedValue]=useState("");
  const [currencyValue, setCurrencyValue] = useState<string>("KRW");
  const [isDepositEditing, setIsDepositEditing] = useState(false);
  const [isDepositSaving, setIsDepositSaving] = useState(false);
  const [depositValue, setDepositValue] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // 智能返回函数
  const handleSmartBack = () => {
    if (urlSearchParams) {
      const returnTab = urlSearchParams.get("returnTab");
      const returnUserId = urlSearchParams.get("returnUserId");

      if (returnTab && returnUserId) {
        // 返回到用户详情页面的指定tab
        router.push(
          `/dashboard/user-reservation/user-detail?userId=${returnUserId}&tab=${returnTab}`,
        );
        return;
      }
    }
    // 默认返回行为
    router.back();
  };

  // 获取当前登录用户信息
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      // 从JWT中解析用户信息
      const tokenParts = token.split(".");
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        setCurrentUser({
          id: payload.id || "",
          name: payload.name || payload.username || "",
          account: payload.username || "",
          memberType: payload.memberType || "",
        });
      }
    } catch (error) {
      console.error("解析token失败:", error);
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const fetchReservation = async () => {
      setLoading(true);

      try {
        const res = await adminFetch(
          `/api/getSingleReservation?reservationid=${reservationId}`,
        );
        if (!res.ok) {
          throw new Error("Failed to fetch reservation");
        }

        const data = await res.json();
        console.log("预约数据:", data);

        const formattedData: ReservationData = {
          altContact: data.altContact ?? "",
          altContactType: data.altContactType ?? "",
          user: data.name,
          timeslot: data.timeSlot,
          contact: data.email ?? "",
          reservationId: data.reservationId,
          date: data.date.split("T")[0],
          provider: data.provider ?? "credentials",
          contactType: data.contactType ?? "email",
          nailArtist: data.nailArtistName || "",
          note: data.note || "",
          price:
            data.finalPrice !== null && data.finalPrice !== undefined
              ? String(data.finalPrice)
              : "",
          currency: data.currency || "KRW",
          receivedAmount:data.receivedAmount,
          commissionAmount:data.commissionAmount,
          depositPaid: data.depositPaid,
          balance: data.balance,
          currentMemberShip: data.currentMemberShip,
          userId: data.userId,
          uploadImage: data.uploadImage,
          paymentMethod:
            data.paymentMethod ||
            (data.currentMemberShip === "vip" ? "memberCard" : "cash"),
        };

        setReservation(formattedData);
        if (data.currency) {
          setCurrencyValue(data.currency);
        }
        // 只有当depositPaid不是null或undefined时设置状态
        setDepositValue(data.depositPaid === true);

        // 设置支付方法，优先使用数据库中的值，否则根据会员类型设置默认值
        if (data.paymentMethod) {
          setPaymentMethod(data.paymentMethod);
        } else if (data.currentMemberShip === "vip") {
          setPaymentMethod("memberCard");
        } else {
          setPaymentMethod("cash");
        }
      } catch (error) {
        console.error(error);
        setReservation(null);
      } finally {
        setLoading(false);
      }
    };

    if (reservationId) {
      fetchReservation();
    }
  }, [reservationId]);

  // 格式化价格，每隔1000添加逗号
  const formatPrice = (price: string | number | undefined): string => {
    if (!price) return "";
    // 确保价格是字符串类型
    const priceStr = String(price);
    return priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // 获取provider的中文说明
  const getProviderName = (provider: string): string => {
    switch (provider) {
      case "wechat":
        return "微信";
      case "google":
        return "谷歌";
      case "kakao":
        return "Kakao";
      case "credentials":
      default:
        return "账号密码";
    }
  };

  // 获取支付方法的中文名称
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

  const handleModifyContact = async () => {
    try {
      if (!currentUser) {
        toast.error("您需要登录才能修改预约", {
          position: "top-center",
          duration: 3000,
        });
        router.push("/");
        return;
      }

      setIsSaving(true);

      const result = await adminFetch(`/api/modifyUserContact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationid: reservationId,
          altContact: contactValue,
          altContactType: selectedContactType,
        }),
      });

      if (result.ok) {
        toast.success("修改成功", {
          position: "top-center",
          duration: 3000,
        });
        // refresh the page
        window.location.reload();
      } else {
        toast.error("修改失败，请稍后重试", {
          position: "top-center",
          duration: 3000,
        });
        setIsSaving(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("修改失败，请稍后重试", {
        position: "top-center",
        duration: 3000,
      });
      setIsSaving(false);
    }
  };

  const handleNoteModify = async () => {
    try {
      if (!currentUser) {
        toast.error("您需要登录才能修改备忘录", {
          position: "top-center",
          duration: 3000,
        });
        router.push("/");
        return;
      }

      setIsNoteSaving(true);

      const result = await axios.post(`/api/modifyReservationNote`, {
        reservationid: reservationId,
        note: noteValue,
      });

      if (result.status === 200) {
        toast.success("修改成功", {
          position: "top-center",
          duration: 3000,
        });
        window.location.reload();
      } else {
        toast.error("修改失败，请稍后重试", {
          position: "top-center",
          duration: 3000,
        });
        setIsNoteSaving(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("修改失败，请稍后重试", {
        position: "top-center",
        duration: 3000,
      });
      setIsNoteSaving(false);
    }
  };

  const handlePriceModify = async () => {
    try {
      if (!currentUser) {
        toast.error("您需要登录才能修改交易价格", {
          position: "top-center",
          duration: 3000,
        });
        router.push("/");
        return;
      }

      // 验证价格是否为整数
      if (!/^\d+$/.test(priceValue)) {
        toast.error("请输入有效的整数金额", {
          position: "top-center",
          duration: 3000,
        });
        return;
      }
      try {
        setIsPriceSaving(true);
        const result = await axios.post(`/api/modifyReservationPrice`, {
          reservationid: reservationId,
          price: priceValue,
          receivedAmount:receivedValue===""?undefined:Number(receivedValue),
          currency: currencyValue,
          paymentMethod: paymentMethod,
        });

        if (result.status === 200) {
          setIsPriceSaving(true);
          toast.success("价格修改成功", {
            position: "top-center",
            duration: 3000,
          });
          window.location.reload();
        } else {
          toast.error("修改失败，请稍后重试", {
            position: "top-center",
            duration: 3000,
          });
          setIsPriceSaving(false);
        }
      } catch (error) {
        console.error(error);
        toast.error("修改失败，请稍后重试", {
          position: "top-center",
          duration: 3000,
        });
        setIsPriceSaving(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("修改失败，请稍后重试", {
        position: "top-center",
        duration: 3000,
      });
      setIsPriceSaving(false);
    }
  };

  const handleDepositModify = async () => {
    try {
      if (!currentUser) {
        toast.error("您需要登录才能修改定金状态", {
          position: "top-center",
          duration: 3000,
        });
        router.push("/");
        return;
      }

      setIsDepositSaving(true);

      try {
        // 打印检查参数信息
        console.log("修改定金状态，预约ID:", reservationId);

        const result = await axios.post(`/api/modifyDepositStatus`, {
          reservationId: reservationId, // 改为驼峰命名，与其他API保持一致
          depositPaid: depositValue,
        });

        if (result.status === 200) {
          toast.success("定金状态修改成功", {
            position: "top-center",
            duration: 3000,
          });
          window.location.reload();
        } else {
          toast.error("修改失败，请稍后重试", {
            position: "top-center",
            duration: 3000,
          });
          setIsDepositSaving(false);
        }
      } catch (error) {
        console.error(error);
        toast.error("修改失败，请稍后重试", {
          position: "top-center",
          duration: 3000,
        });
        setIsDepositSaving(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("修改失败，请稍后重试", {
        position: "top-center",
        duration: 3000,
      });
      setIsDepositSaving(false);
    }
  };

  const handleDelete = async () => {
    setCancelling(true);
    try {
      if (!currentUser) {
        toast.error("您需要登录才能取消预约", {
          position: "top-center",
          duration: 3000,
        });
        router.push("/");
        return;
      }

      const res = await adminFetch(
        `/api/getSingleReservation?reservationid=${reservationId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operatorName: currentUser.name,
            operatorAccount: currentUser.account,
            operatorType: currentUser.memberType,
          }),
        },
      );

      if (!res.ok) {
        throw new Error("删除失败");
      }

      const data = await res.json();

      if (data.success) {
        // 成功后跳回日历页，并传递删除的预约ID
        toast.success(`成功取消预约`, {
          position: "top-center",
          duration: 3000,
        });
        router.push(`/calendar?deleted=${reservationId}`);
      } else {
        toast.error(`删除失败: ${data.message || "未知错误"}`, {
          position: "top-center",
          duration: 3000,
        });
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (error) {
      console.error(error);
      toast.error(`删除失败，请待会重试`, {
        position: "top-center",
        duration: 3000,
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !currentUser)
    return (
      <section className="admin-panel">
        <PanelState loading title="正在加载这次预约…" />
      </section>
    );
  if (!reservation)
    return (
      <section className="admin-panel">
        <PanelState title="预约暂时无法读取">
          <p>请检查预约是否存在，或重新加载。</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            重新加载
          </Button>
          <Button variant="ghost" onClick={handleSmartBack}>
            返回上一页
          </Button>
        </PanelState>
      </section>
    );
  const contactLabels: Record<string, string> = {
    wechat: "微信",
    phone: "电话",
    email: "邮箱",
    instagram: "Instagram",
    kakao: "KakaoTalk",
  };
  const startPriceEdit = () => {
    setPriceValue(reservation.price || "");
    setReceivedValue(reservation.receivedAmount==null?"":String(reservation.receivedAmount));
    setCurrencyValue(reservation.currency || "KRW");
    setPaymentMethod(
      reservation.paymentMethod ||
        (reservation.currentMemberShip === "vip" ? "memberCard" : "cash"),
    );
    setIsPriceEditing(true);
  };
  const depositLabel =
    reservation.depositPaid === true
      ? "定金已支付"
      : reservation.depositPaid === false
        ? "定金未支付"
        : "定金待确认";
  return (
    <div>
      <PageHeading
        eyebrow="MADE JUST FOR THIS MOMENT"
        title="预约详情"
        description={`预约编号 · ${reservation.reservationId}`}
      >
        <Button variant="outline" onClick={handleSmartBack}>
          <ArrowLeft size={14} />
          返回
        </Button>
      </PageHeading>
      <div className="reservation-detail-grid">
        <div className="reservation-detail-column">
          <section className="admin-panel reservation-summary">
            <div className="reservation-date-block">
              <span>{Number(reservation.date.slice(5, 7))} 月</span>
              <strong>{Number(reservation.date.slice(8, 10))}</strong>
              <span>
                {new Date(reservation.date + "T00:00:00Z").toLocaleDateString(
                  "zh-CN",
                  { weekday: "long", timeZone: "UTC" },
                )}
              </span>
            </div>
            <div>
              <span
                className={`admin-chip ${reservation.depositPaid ? "green" : "yellow"}`}
              >
                {depositLabel}
              </span>
              <h2>{reservation.user || "未填写姓名"} 的美丽时刻</h2>
              <p className="flex items-center gap-2">
                <CalendarDays size={12} />
                {reservation.date}
                <Clock3 size={12} />
                {reservation.timeslot} · 韩国时间
              </p>
              <p className="mt-2">
                服务员工 · {reservation.nailArtist || "未分配"}
              </p>
            </div>
          </section>
          <ReservationExtras
            reservationId={reservationId}
            showCustomerNote={false}
          />
          <section className="admin-panel reservation-edit-card">
            <div className="admin-panel-heading">
              <div>
                <h2>本次预约备注</h2>
                <p>记录这次的款式、沟通结果与特别安排。</p>
              </div>
              {!isNoteEditing && (
                <button
                  className="admin-soft-action"
                  onClick={() => {
                    setNoteValue(reservation.note || "");
                    setIsNoteEditing(true);
                  }}
                >
                  <Pencil size={12} />
                  编辑
                </button>
              )}
            </div>
            {isNoteEditing ? (
              <>
                <Textarea
                  className="admin-textarea"
                  maxLength={2000}
                  aria-label="本次预约备注"
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  disabled={isNoteSaving}
                />
                <div className="reservation-edit-actions">
                  <Button
                    variant="ghost"
                    disabled={isNoteSaving}
                    onClick={() => setIsNoteEditing(false)}
                  >
                    取消
                  </Button>
                  <Button
                    disabled={
                      isNoteSaving || noteValue === (reservation.note || "")
                    }
                    onClick={handleNoteModify}
                  >
                    {isNoteSaving ? "保存中…" : "保存备注"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="reservation-note-content">
                {reservation.note || "这次还没有额外的服务备注。"}
              </div>
            )}
          </section>
          <section className="admin-panel reservation-edit-card">
            <div className="admin-panel-heading">
              <div>
                <h2>本次结算</h2>
                <p>记录最终金额、币种与实际支付方式。</p>
              </div>
              {!isPriceEditing && (
                <button className="admin-soft-action" onClick={startPriceEdit}>
                  <Pencil size={12} />
                  {reservation.price ? "修改" : "录入"}
                </button>
              )}
            </div>
            {isPriceEditing ? (
              <>
                <div className="admin-form-grid">
                  <div className="admin-field">
                    <label htmlFor="settlement-price">最终金额</label>
                    <Input
                      id="settlement-price"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      placeholder="输入整数金额"
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      disabled={isPriceSaving}
                    />
                  </div>
                  <div className="admin-field"><label htmlFor="settlement-received">实收金额 · 含定金</label><Input id="settlement-received" type="number" min="0" step="1" value={receivedValue} placeholder="填写实际收到的金额" disabled={isPriceSaving} onChange={e=>setReceivedValue(e.target.value)}/><small>提成按实收金额及员工比例计算。留空表示尚未确认实收。</small></div>
                  <div className="admin-field">
                    <label htmlFor="settlement-currency">结算币种</label>
                    <Select
                      value={currencyValue}
                      onValueChange={setCurrencyValue}
                      disabled={isPriceSaving}
                    >
                      <SelectTrigger
                        id="settlement-currency"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["KRW", "CNY", "USD", "JPY", "EUR"].map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="admin-field mt-5">
                  <label htmlFor="settlement-payment">支付方式</label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    disabled={isPriceSaving}
                  >
                    <SelectTrigger id="settlement-payment" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["cash", "memberCard", "card", "wechat", "alipay"].map(
                        (method) => (
                          <SelectItem key={method} value={method}>
                            {getPaymentMethodName(method)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="reservation-edit-actions">
                  <Button
                    variant="ghost"
                    disabled={isPriceSaving}
                    onClick={() => setIsPriceEditing(false)}
                  >
                    取消
                  </Button>
                  <Button
                    disabled={
                      isPriceSaving ||
                      !/^\d+$/.test(priceValue) ||
                      (priceValue === (reservation.price || "") &&
                        currencyValue === (reservation.currency || "KRW") &&
                        paymentMethod === reservation.paymentMethod)
                    }
                    onClick={handlePriceModify}
                  >
                    {isPriceSaving ? "保存中…" : "保存结算"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="reservation-price">
                  {reservation.price
                    ? formatPrice(reservation.price)
                    : "尚未结算"}{" "}
                  {reservation.price && (
                    <small>{reservation.currency || "KRW"}</small>
                  )}
                </div>
                <div className="customer-info-row mt-3">
                  <span>支付方式</span>
                  <strong>
                    {reservation.price
                      ? getPaymentMethodName(reservation.paymentMethod || "")
                      : "待结算后记录"}
                  </strong>
                </div>
                {reservation.currentMemberShip === "vip" && (
                  <div className="customer-info-row">
                    <span>
                      {reservation.price &&
                      reservation.paymentMethod === "memberCard"
                        ? "本次结算后余额"
                        : "本次结算前余额"}
                    </span>
                    <strong>
                      {formatPrice(
                        Math.max(
                          0,
                          Number(reservation.balance || 0) -
                            (reservation.price &&
                            reservation.paymentMethod === "memberCard"
                              ? Number(reservation.price)
                              : 0),
                        ),
                      )}{" "}
                      KRW
                    </strong>
                  </div>
                )}
              </>
            )}
            <div className="admin-form-divider" />
            <div className="admin-panel-heading">
              <h2>定金状态</h2>
              {!isDepositEditing && (
                <button
                  className="admin-soft-action"
                  onClick={() => {
                    setDepositValue(reservation.depositPaid === true);
                    setIsDepositEditing(true);
                  }}
                >
                  <Pencil size={12} />
                  修改
                </button>
              )}
            </div>
            {isDepositEditing ? (
              <>
                <Select
                  value={depositValue ? "paid" : "unpaid"}
                  onValueChange={(value) => setDepositValue(value === "paid")}
                  disabled={isDepositSaving}
                >
                  <SelectTrigger className="w-full" aria-label="定金状态">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">已支付定金</SelectItem>
                    <SelectItem value="unpaid">未支付定金</SelectItem>
                  </SelectContent>
                </Select>
                <div className="reservation-edit-actions">
                  <Button
                    variant="ghost"
                    disabled={isDepositSaving}
                    onClick={() => setIsDepositEditing(false)}
                  >
                    取消
                  </Button>
                  <Button
                    disabled={
                      isDepositSaving ||
                      depositValue === reservation.depositPaid
                    }
                    onClick={handleDepositModify}
                  >
                    {isDepositSaving ? "保存中…" : "保存状态"}
                  </Button>
                </div>
              </>
            ) : (
              <span
                className={`admin-chip ${reservation.depositPaid ? "green" : "yellow"}`}
              >
                {depositLabel}
              </span>
            )}
          </section>
        </div>
        <aside className="reservation-detail-column">
          <section
            className="admin-panel customer-profile-card"
            style={{ margin: 0 }}
          >
            <div className="customer-profile-top">
              <span className="admin-avatar">
                <UserRound size={22} />
              </span>
              <div>
                <h2>{reservation.user || "未填写姓名"}</h2>
                <span
                  className={`admin-chip ${reservation.currentMemberShip === "vip" ? "yellow" : "neutral"}`}
                >
                  {reservation.currentMemberShip === "vip"
                    ? "预约时为 VIP 会员"
                    : "预约时为普通顾客"}
                </span>
              </div>
            </div>
            <div className="customer-profile-info">
              <div className="customer-info-row">
                <span>登录方式</span>
                <strong>{getProviderName(reservation.provider)}</strong>
              </div>
              <div className="customer-info-row">
                <span>邮箱</span>
                <strong>{reservation.contact || "未填写"}</strong>
              </div>
              <div className="customer-info-row">
                <span>
                  {contactLabels[reservation.altContactType] || "其他联系"}
                </span>
                <strong>{reservation.altContact || "未填写"}</strong>
              </div>
            </div>
            {!isEditing ? (
              <div className="admin-inline mt-4 justify-between">
                <button
                  className="admin-soft-action"
                  onClick={() => {
                    setContactValue(reservation.altContact);
                    setSelectedContactType(
                      reservation.altContactType || "wechat",
                    );
                    setIsEditing(true);
                  }}
                >
                  <Pencil size={12} />
                  联系方式
                </button>
                {reservation.userId && (
                  <Link
                    className="admin-soft-action"
                    href={`/dashboard/user-reservation/user-detail?userId=${reservation.userId}`}
                  >
                    顾客资料
                    <ArrowUpRight size={12} />
                  </Link>
                )}
              </div>
            ) : (
              <div className="admin-field mt-4">
                <label htmlFor="contact-type">联系方式</label>
                <Select
                  value={selectedContactType || "wechat"}
                  onValueChange={setSelectedContactType}
                >
                  <SelectTrigger id="contact-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contactLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  aria-label="联系账号或号码"
                  placeholder="联系账号或号码"
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  disabled={isSaving}
                />
                <div className="reservation-edit-actions">
                  <Button
                    variant="ghost"
                    disabled={isSaving}
                    onClick={() => setIsEditing(false)}
                  >
                    取消
                  </Button>
                  <Button
                    disabled={
                      isSaving ||
                      !contactValue.trim() ||
                      (contactValue === reservation.altContact &&
                        selectedContactType === reservation.altContactType)
                    }
                    onClick={handleModifyContact}
                  >
                    {isSaving ? "保存中…" : "保存"}
                  </Button>
                </div>
              </div>
            )}
          </section>
          {reservation.userId && (
            <CustomerNoteCard userId={reservation.userId} />
          )}
          <section className="admin-panel reservation-receipt">
            <div className="admin-panel-heading">
              <h2 className="flex items-center gap-2">
                <Receipt size={16} className="text-purple-300" />
                付款凭证
              </h2>
            </div>
            {reservation.uploadImage ? (
              <button
                onClick={() => setIsImageModalOpen(true)}
                aria-label="查看完整付款凭证"
              >
                <Image
                  src={reservation.uploadImage}
                  alt="顾客付款凭证"
                  width={500}
                  height={400}
                  unoptimized
                />
                <span className="admin-subtle block mt-3">
                  点击查看完整图片 ↗
                </span>
              </button>
            ) : (
              <p className="admin-subtle">这次预约没有上传付款凭证。</p>
            )}
          </section>
          <button
            className="reservation-cancel"
            onClick={() => setOpenDialog(true)}
          >
            <Trash2 size={13} />
            取消这次预约
          </button>
        </aside>
      </div>
      <Dialog
        open={openDialog}
        onOpenChange={(value) => {
          if (!cancelling) setOpenDialog(value);
        }}
      >
        <DialogContent>
          <DialogTitle>确认取消这次预约？</DialogTitle>
          <DialogDescription className="leading-7">
            {reservation.user} · {reservation.date} {reservation.timeslot} ·{" "}
            {reservation.nailArtist}。取消后，该时段将重新开放预约。
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={cancelling}
              onClick={() => setOpenDialog(false)}
            >
              保留预约
            </Button>
            <Button
              variant="destructive"
              disabled={cancelling}
              onClick={handleDelete}
            >
              {cancelling ? "取消中…" : "确认取消预约"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>付款凭证</DialogTitle>
          <DialogDescription>顾客为这次预约提交的付款截图。</DialogDescription>
          {reservation.uploadImage && (
            <Image
              src={reservation.uploadImage}
              alt="完整付款凭证"
              width={1200}
              height={1400}
              className="max-h-[70svh] w-full object-contain"
              unoptimized
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

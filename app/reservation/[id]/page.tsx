"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BsWechat } from "react-icons/bs";
import { PiPhoneFill } from "react-icons/pi";
import { RiHandCoinFill } from "react-icons/ri";
import { FaFaceGrinSquintTears } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import { PiNoteBlankFill } from "react-icons/pi";
import { SiSharp } from "react-icons/si";
import { BsCalendar2HeartFill } from "react-icons/bs";
import { RiKakaoTalkFill } from "react-icons/ri";
import { FaPiggyBank } from "react-icons/fa6";
import { BiLogoInstagramAlt } from "react-icons/bi";
import { LuPenOff } from "react-icons/lu";
import { IoFingerPrintSharp } from "react-icons/io5";
import { FaUserNurse } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";

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
  currency?: string;
  depositPaid: boolean | null;
  balance: number | null;
  userId: string | null;
  paymentMethod?: string;
  currentMemberShip?: string;
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
  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [selectedContactType, setSelectedContactType] = useState<string | null>(
    null
  );
  const [contactValue, setContactValue] = useState<string>("");
  const [isModified, setIsModified] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [noteValue, setNoteValue] = useState<string>("");
  const [isNoteModified, setIsNoteModified] = useState(false);
  const [isPriceEditing, setIsPriceEditing] = useState(false);
  const [isPriceSaving, setIsPriceSaving] = useState(false);
  const [priceValue, setPriceValue] = useState<string>("");
  const [currencyValue, setCurrencyValue] = useState<string>("KRW");
  const [isPriceModified, setIsPriceModified] = useState(false);
  const [isDepositEditing, setIsDepositEditing] = useState(false);
  const [isDepositSaving, setIsDepositSaving] = useState(false);
  const [depositValue, setDepositValue] = useState<boolean>(false);
  const [isDepositModified, setIsDepositModified] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

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
  }, []);

  useEffect(() => {
    const fetchReservation = async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/getSingleReservation?reservationid=${reservationId}`
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
          price: data.finalPrice ? String(data.finalPrice) : "",
          currency: data.currency || "KRW",
          depositPaid: data.depositPaid,
          balance: data.balance,
          currentMemberShip: data.currentMemberShip,
          userId: data.userId,
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

        // 简化通知逻辑，直接显示通知
        if (data.depositPaid === false && data.currentMemberShip === "free") {
          toast.error("该预约尚未支付定金", {
            position: "top-center",
            duration: 5000,
          });
        } else if (
          data.depositPaid === null &&
          data.currentMemberShip === "free"
        ) {
          toast.warning("该预约定金状态未设置", {
            position: "top-center",
            duration: 5000,
          });
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

  // 获取provider对应的标签样式
  const getProviderBadgeStyle = (provider: string): string => {
    switch (provider) {
      case "wechat":
        return "bg-green-500 text-white";
      case "google":
        return "bg-blue-500 text-white";
      case "kakao":
        return "bg-yellow-500 text-white";
      case "credentials":
      default:
        return "bg-pink-500 text-white";
    }
  };

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

  const getContactType = (contactType: string): React.ReactNode => {
    switch (contactType) {
      case "wechat":
        return (
          <BsWechat
            className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-white p-2"
            size={30}
          />
        );
      case "phone":
        return (
          <PiPhoneFill
            className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white p-2"
            size={30}
          />
        );
      case "email":
        return (
          <MdEmail
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white p-2"
            size={30}
          />
        );
      case "Instagram":
        return (
          <BiLogoInstagramAlt
            className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white p-2"
            size={30}
          />
        );
      case "kakao":
        return (
          <RiKakaoTalkFill
            className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white p-2"
            size={30}
          />
        );
      default:
        return (
          <LuPenOff
            className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white p-2"
            size={30}
          />
        );
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

      const result = await fetch(`/api/modifyUserContact`, {
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

      // 这里只进行前端处理，后端API由用户自己实现
      // 这里模拟API请求的过程
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
        // 这里是最终价格的接口
        const result = await axios.post(`/api/modifyReservationPrice`, {
          reservationid: reservationId,
          price: priceValue,
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
    try {
      if (!currentUser) {
        toast.error("您需要登录才能取消预约", {
          position: "top-center",
          duration: 3000,
        });
        router.push("/");
        return;
      }

      const res = await fetch(
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
        }
      );

      if (!res.ok) {
        throw new Error("删除失败");
      }

      const data = await res.json();

      if (data.success) {
        // 成功后跳回首页或日历页
        toast.success(`成功取消预约`, {
          position: "top-center",
          duration: 3000,
        });
        router.push("/calendar");
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
      // reload the page
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  };

  // 如果没有用户信息，显示加载中
  if (!currentUser) {
    return (
      <div className="container mx-auto p-4 max-w-2xl md:min-w-screen bg-gradient-to-b from-pink-50 to-purple-50 min-h-screen flex justify-center items-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-pink-400 rounded-full"></div>
          <div className="h-3 w-3 bg-pink-500 rounded-full"></div>
          <div className="h-3 w-3 bg-pink-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-10 max-w-2xl md:min-w-screen min-h-svh bg-gradient-to-b from-pink-50 to-purple-50 flex flex-col items-center justify-center">
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse flex space-x-2">
            <div className="h-3 w-3 bg-pink-400 rounded-full"></div>
            <div className="h-3 w-3 bg-pink-500 rounded-full"></div>
            <div className="h-3 w-3 bg-pink-600 rounded-full"></div>
          </div>
        </div>
      ) : reservation ? (
        <div className="pt-10 md:w-8/12">
          <h1 className=" text-3xl pb-10 font-bold  text-center text-pink-600 tracking-wide">
            预约详情
          </h1>
          <div className="bg-white shadow-lg rounded-2xl p-6 border-4 border-pink-200 backdrop-blur-sm">
            <div className="grid grid-cols-1 gap-6">
              <div className="border-b-2 border-dotted border-pink-200 pb-4">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center mr-3">
                    <span className="text-white text-sm">
                      <SiSharp />
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-700">预约ID</h2>
                </div>
                <p className="text-gray-600 pl-11 font-mono text-sm">
                  {reservation.reservationId}
                </p>
              </div>

              <div className="border-b-2 border-dotted border-pink-200 pb-4">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center mr-3">
                    <span className="text-white text-sm">
                      <FaFaceGrinSquintTears />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-700">
                      客户姓名
                    </h2>
                    {reservation.currentMemberShip?.toLowerCase() === "vip" ? (
                      <p className="font-medium bg-amber-400 text-white px-2 rounded-full flex items-center justify-center">
                        vip
                      </p>
                    ) : (
                      <p className="font-medium bg-gray-500 text-white px-2 rounded-full flex items-center justify-center">
                        非会员
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 pl-11 font-medium">
                  {reservation.user ? reservation.user : "未设置"}
                </p>
              </div>

              <div className="border-b-2 border-dotted border-pink-200 pb-4">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center mr-3">
                    <span className="text-white text-sm">
                      <BsCalendar2HeartFill />
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-700">预约时间</h2>
                </div>
                <div className="pl-11">
                  <span className="bg-gradient-to-r from-pink-200 to-pink-100 px-3 py-1.5 rounded-full mr-3 inline-block font-medium shadow-sm">
                    {reservation.date}
                  </span>
                  <span className="bg-gradient-to-r from-blue-200 to-blue-100 px-3 py-1.5 rounded-full inline-block font-medium shadow-sm">
                    {reservation.timeslot}
                  </span>
                </div>
              </div>

              <div className="border-b-2 border-dotted border-pink-200 pb-4">
                <div className="flex items-center mb-2 gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center ">
                    <div className="">
                      {getContactType(reservation.contactType)}
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-gray-700">联系方式</h2>
                </div>
                <p className="text-gray-600 pl-11 font-medium">
                  {reservation.contact ? reservation.contact : "未设置"}
                </p>
              </div>
              {reservation?.currentMemberShip === "vip" &&
                reservation?.balance && (
                  <div className="border-b-2 border-dotted border-pink-200 pb-4">
                    <div className="flex items-center mb-2 gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center ">
                        <div className="text-white">
                          <FaPiggyBank />
                        </div>
                      </div>
                      <h2 className="text-lg font-bold text-gray-700">余额</h2>
                    </div>
                    <p className="text-gray-600 pl-11 font-medium">
                      {`${formatPrice(reservation.balance)} ${
                        reservation.currency || "KRW"
                      }`}
                    </p>
                  </div>
                )}
              {reservation?.price && reservation?.currentMemberShip === "vip" && (
                <div className="border-b-2 border-dotted border-pink-200 pb-4">
                  <div className="flex items-center mb-2 gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center ">
                      <div className="text-white">
                        <FaPiggyBank />
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-gray-700">
                      本次结余后余额
                    </h2>
                  </div>
                  <p className="text-gray-600 pl-11 font-medium">
                    {reservation.balance &&
                    reservation.paymentMethod === "memberCard"
                      ? `${formatPrice(
                          reservation.balance - Number(reservation.price)
                        )} ${reservation.currency || "KRW"}`
                      : `${formatPrice(reservation?.balance || 0)} ${
                          reservation.currency || "KRW"
                        }`}
                  </p>
                </div>
              )}
              {!reservation?.price && !isPriceEditing && (
                <div className="border-b-2 border-dotted border-pink-200 pb-4">
                  <div className="flex items-center mb-2 gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#C4A94D] flex items-center justify-center ">
                      <div className="text-white">
                        <RiHandCoinFill />
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-gray-700">
                      最终交易价格
                    </h2>
                  </div>
                  <div className="text-gray-600 font-medium flex items-center justify-between pl-11">
                    <span className="text-gray-400">暂未设置价格</span>
                    <Button
                      variant="outline"
                      className="ml-2 text-sm px-3 py-1 h-8 rounded-full bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200"
                      onClick={() => {
                        setIsPriceEditing(true);
                        setPriceValue("");
                        setCurrencyValue("KRW");
                        // 根据会员类型设置默认支付方法
                        if (reservation?.currentMemberShip === "vip") {
                          setPaymentMethod("memberCard");
                        } else {
                          setPaymentMethod("cash");
                        }
                      }}
                    >
                      添加价格
                    </Button>
                  </div>
                </div>
              )}
              {(reservation?.price || isPriceEditing) && (
                <div className="border-b-2 border-dotted border-pink-200 pb-4">
                  <div className="flex items-center mb-2 gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#C4A94D] flex items-center justify-center ">
                      <div className="text-white">
                        <RiHandCoinFill />
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-gray-700">
                      最终交易价格
                    </h2>
                  </div>
                  {!isPriceEditing ? (
                    <div className="text-gray-600 font-medium flex items-center justify-between pl-11">
                      <div className="flex flex-col">
                        <span>
                          {reservation?.price
                            ? `${formatPrice(reservation.price)} ${
                                reservation.currency || "KRW"
                              }`
                            : "未设置"}
                        </span>
                        {reservation?.price && (
                          <span className="text-sm text-gray-500 mt-1">
                            支付方式:{" "}
                            {getPaymentMethodName(
                              reservation?.paymentMethod ||
                                (reservation?.currentMemberShip === "vip"
                                  ? "memberCard"
                                  : "cash")
                            )}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="ml-2 text-sm px-3 py-1 h-8 rounded-full bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200"
                        onClick={() => {
                          setIsPriceEditing(true);
                          setPriceValue(reservation?.price || "");
                          setCurrencyValue(reservation?.currency || "KRW");
                          // 重置支付方法
                          if (reservation?.paymentMethod) {
                            setPaymentMethod(reservation.paymentMethod);
                          } else if (reservation?.currentMemberShip === "vip") {
                            setPaymentMethod("memberCard");
                          } else {
                            setPaymentMethod("cash");
                          }
                        }}
                      >
                        修改
                      </Button>
                    </div>
                  ) : (
                    <div className="text-gray-600 font-medium">
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          placeholder="请输入整数金额"
                          value={priceValue}
                          type="number"
                          min="0"
                          step="1"
                          onChange={(e) => {
                            // 确保只能输入整数
                            const value = e.target.value.replace(/\D/g, "");
                            setPriceValue(value);
                            setIsPriceModified(
                              value !== (reservation?.price || "") ||
                                currencyValue !==
                                  (reservation?.currency || "KRW") ||
                                paymentMethod !==
                                  (reservation?.paymentMethod ||
                                    (reservation?.currentMemberShip === "vip"
                                      ? "memberCard"
                                      : "cash"))
                            );
                          }}
                          className="flex-1"
                        />
                        <Select
                          value={currencyValue}
                          onValueChange={(value) => {
                            setCurrencyValue(value);
                            setIsPriceModified(
                              priceValue !== (reservation?.price || "") ||
                                value !== (reservation?.currency || "KRW") ||
                                paymentMethod !==
                                  (reservation?.paymentMethod ||
                                      (reservation?.currentMemberShip === "vip"
                                      ? "memberCard"
                                      : "cash"))
                            );
                          }}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="KRW" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-none">
                            <SelectItem value="KRW">KRW</SelectItem>
                            <SelectItem value="CNY">CNY</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="JPY">JPY</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-600 w-20">
                          支付方式:
                        </span>
                        <Select
                          value={paymentMethod}
                          onValueChange={(value) => {
                            setPaymentMethod(value);
                            setIsPriceModified(
                              priceValue !== (reservation?.price || "") ||
                                currencyValue !==
                                  (reservation?.currency || "KRW") ||
                                value !==
                                  (reservation?.paymentMethod ||
                                    (reservation?.currentMemberShip === "vip"
                                      ? "memberCard"
                                      : "cash"))
                            );
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="选择支付方式" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-none">
                            <SelectItem value="cash">现金支付</SelectItem>
                            <SelectItem value="memberCard">会员卡</SelectItem>
                            <SelectItem value="card">银行卡</SelectItem>
                            <SelectItem value="wechat">微信支付</SelectItem>
                            <SelectItem value="alipay">支付宝</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          className="bg-gradient-to-r from-green-500 to-teal-600 active:from-green-600 active:to-teal-700 text-white px-4 py-1 rounded-full shadow-md transition-all duration-300 transform active:scale-105 text-sm h-8"
                          onClick={() => {
                            if (isPriceModified) {
                              handlePriceModify();
                            } else {
                              setIsPriceEditing(false);
                            }
                          }}
                          disabled={!isPriceModified || isPriceSaving}
                        >
                          {isPriceSaving ? (
                            <div className="flex items-center">
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                              <span>处理中...</span>
                            </div>
                          ) : (
                            "确认"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="px-4 py-1 h-8 rounded-full text-gray-500 border-gray-300 hover:bg-gray-100 text-sm"
                          onClick={() => {
                            setIsPriceEditing(false);
                            setPriceValue(reservation?.price || "");
                            setCurrencyValue(reservation?.currency || "KRW");
                            setIsPriceModified(false);
                            // 重置支付方法
                            if (reservation?.paymentMethod) {
                              setPaymentMethod(reservation.paymentMethod);
                              } else if (reservation?.currentMemberShip === "vip") {
                              setPaymentMethod("memberCard");
                            } else {
                              setPaymentMethod("cash");
                            }
                          }}
                          disabled={isPriceSaving}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="border-b-2 border-dotted border-pink-200 pb-4">
                <div className="flex items-center mb-2 gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center ">
                    <div className="text-white">
                      <FaPiggyBank />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-gray-700">
                    是否已付定金
                  </h2>
                </div>
                {!isDepositEditing ? (
                  <div className="text-gray-600 font-medium flex items-center justify-between pl-11">
                    <span>
                      {reservation?.depositPaid === null ? (
                        "未设置"
                      ) : reservation.depositPaid ? (
                        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          已付定金
                        </span>
                      ) : (
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          未付定金
                        </span>
                      )}
                    </span>
                    <Button
                      variant="outline"
                      className="ml-2 text-sm px-3 py-1 h-8 rounded-full bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200"
                      onClick={() => {
                        setIsDepositEditing(true);
                        // 如果之前是未设置状态，不要设置默认值
                        if (reservation?.depositPaid !== null) {
                          setDepositValue(reservation?.depositPaid === true);
                        }
                      }}
                    >
                      修改
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-600 font-medium">
                    <div className="flex items-center gap-2 mb-2">
                      <Select
                        value={
                          reservation?.depositPaid === null
                            ? undefined
                            : depositValue
                            ? "true"
                            : "false"
                        }
                        onValueChange={(value) => {
                          const newValue = value === "true";
                          setDepositValue(newValue);
                          // 如果原始状态是null或者新值与原值不同，就应该允许确认
                          setIsDepositModified(
                            reservation?.depositPaid === null ||
                              newValue !== (reservation?.depositPaid === true)
                          );
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              reservation?.depositPaid === null
                                ? "请选择定金状态"
                                : "选择定金状态"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-none">
                          <SelectItem value="true">已付定金</SelectItem>
                          <SelectItem value="false">未付定金</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        className="bg-gradient-to-r from-green-500 to-teal-600 active:from-green-600 active:to-teal-700 text-white px-4 py-1 rounded-full shadow-md transition-all duration-300 transform active:scale-105 text-sm h-8"
                        onClick={() => {
                          if (isDepositModified) {
                            handleDepositModify();
                          } else {
                            setIsDepositEditing(false);
                          }
                        }}
                        disabled={!isDepositModified || isDepositSaving}
                      >
                        {isDepositSaving ? (
                          <div className="flex items-center">
                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                            <span>处理中...</span>
                          </div>
                        ) : (
                          "确认"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="px-4 py-1 h-8 rounded-full text-gray-500 border-gray-300 hover:bg-gray-100 text-sm"
                        onClick={() => {
                          setIsDepositEditing(false);
                          // 如果原先存在值，则恢复原值，否则保持空值
                          if (reservation?.depositPaid !== null) {
                            setDepositValue(reservation?.depositPaid === true);
                          }
                          setIsDepositModified(false);
                        }}
                        disabled={isDepositSaving}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-b-2 border-dotted border-pink-200 pb-4">
                <div className="flex items-center mb-2 gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center ">
                    <div className="text-white">
                      <PiNoteBlankFill />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-gray-700">备忘录</h2>
                </div>
                {!isNoteEditing ? (
                  <div className="text-gray-600 font-medium flex items-center justify-between pl-11">
                    <span>{reservation.note || "未设置"}</span>
                    <Button
                      variant="outline"
                      className="ml-2 text-sm px-3 py-1 h-8 rounded-full bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200"
                      onClick={() => {
                        setIsNoteEditing(true);
                        setNoteValue(reservation.note || "");
                      }}
                    >
                      修改
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-600 font-medium">
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        placeholder={
                          reservation.note ? reservation.note : "请输入备忘录"
                        }
                        value={noteValue}
                        onChange={(e) => {
                          setNoteValue(e.target.value);
                          setIsNoteModified(
                            e.target.value !== (reservation.note || "")
                          );
                        }}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        className="bg-gradient-to-r from-green-500 to-teal-600 active:from-green-600 active:to-teal-700 text-white px-4 py-1 rounded-full shadow-md transition-all duration-300 transform active:scale-105 text-sm h-8"
                        onClick={() => {
                          if (isNoteModified) {
                            handleNoteModify();
                          } else {
                            setIsNoteEditing(false);
                          }
                        }}
                        disabled={!isNoteModified || isNoteSaving}
                      >
                        {isNoteSaving ? (
                          <div className="flex items-center">
                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                            <span>处理中...</span>
                          </div>
                        ) : (
                          "确认"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="px-4 py-1 h-8 rounded-full text-gray-500 border-gray-300 hover:bg-gray-100 text-sm"
                        onClick={() => {
                          setIsNoteEditing(false);
                          setNoteValue(reservation.note || "");
                          setIsNoteModified(false);
                        }}
                        disabled={isNoteSaving}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-b-2 border-dotted border-pink-200 pb-4">
                <div className="flex items-center mb-2 gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center ">
                    <div className="">
                      {getContactType(reservation.altContactType)}
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-gray-700">
                    实际联系方式
                  </h2>
                </div>
                {!isEditing ? (
                  <div className="text-gray-600 font-medium flex items-center justify-between pl-11">
                    {reservation.altContact &&
                    (reservation.altContact.startsWith("http://") ||
                      reservation.altContact.startsWith("https://") ||
                      reservation.altContact.includes("www.")) ? (
                      <a
                        href={
                          reservation.altContact.startsWith("http")
                            ? reservation.altContact
                            : `https://${reservation.altContact}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 font-medium underline"
                      >
                        主页链接
                      </a>
                    ) : (
                      <span>{reservation.altContact || "未设置"}</span>
                    )}
                    <Button
                      variant="outline"
                      className="ml-2 text-sm px-3 py-1 h-8 rounded-full bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200"
                      onClick={() => {
                        setIsEditing(true);
                        setSelectedContactType(
                          reservation.altContactType || null
                        );
                      }}
                    >
                      修改
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-600 font-medium">
                    <div className="flex items-center gap-2 mb-2">
                      <Select
                        defaultValue={reservation.altContactType}
                        onValueChange={(value) => {
                          setSelectedContactType(value);
                          setIsModified(
                            value !== reservation.altContactType ||
                              contactValue !== reservation.altContact
                          );
                        }}
                      >
                        <SelectTrigger className="rounded-full border-none shadow-none outline-none ring-0 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:border-none hover:border-none active:border-none">
                          <SelectValue placeholder="选择" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-none">
                          <SelectItem value="wechat">
                            <BsWechat size={30} className="text-green-500" />
                          </SelectItem>
                          <SelectItem value="phone">
                            <PiPhoneFill
                              size={30}
                              className="text-purple-500"
                            />
                          </SelectItem>
                          <SelectItem value="Instagram">
                            <BiLogoInstagramAlt
                              size={30}
                              className="text-pink-500"
                            />
                          </SelectItem>
                          <SelectItem value="kakao">
                            <RiKakaoTalkFill
                              size={30}
                              className="text-yellow-500"
                            />
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={
                          reservation.altContact
                            ? reservation.altContact
                            : "未设置"
                        }
                        value={contactValue}
                        onChange={(e) => {
                          setContactValue(e.target.value);
                          setIsModified(
                            (selectedContactType !== null &&
                              selectedContactType !==
                                reservation.altContactType) ||
                              (e.target.value !== "" &&
                                e.target.value !== reservation.altContact)
                          );
                        }}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        className="bg-gradient-to-r from-green-500 to-teal-600 active:from-green-600 active:to-teal-700 text-white px-4 py-1 rounded-full shadow-md transition-all duration-300 transform active:scale-105 text-sm h-8"
                        onClick={() => {
                          if (isModified) {
                            handleModifyContact();
                          } else {
                            setIsEditing(false);
                          }
                        }}
                        disabled={!isModified || isSaving}
                      >
                        {isSaving ? (
                          <div className="flex items-center">
                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                            <span>处理中...</span>
                          </div>
                        ) : (
                          "确认"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="px-4 py-1 h-8 rounded-full text-gray-500 border-gray-300 hover:bg-gray-100 text-sm"
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedContactType(
                            reservation.altContactType || null
                          );
                          setContactValue(reservation.altContact || "");
                          setIsModified(false);
                        }}
                        disabled={isSaving}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {reservation.nailArtist && (
                <div className="border-b-2 border-dotted border-pink-200 pb-4">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center mr-3">
                      <FaUserNurse className="text-white" size={16} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-700">美甲师</h2>
                  </div>
                  <p className="text-gray-600 pl-11 font-medium">
                    {reservation.nailArtist || "未分配"}
                  </p>
                </div>
              )}
              <div className="pb-2">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center mr-3">
                    <span className="text-white text-sm">
                      <IoFingerPrintSharp />
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-700">登录方式</h2>
                </div>
                <div className="mt-1 pl-11">
                  <span
                    className={`px-4 py-1.5 rounded-full text-sm ${getProviderBadgeStyle(
                      reservation.provider
                    )} shadow-sm font-medium`}
                  >
                    {getProviderName(reservation.provider)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
              <Button
                className="bg-gradient-to-r from-purple-500 to-pink-600 active:from-purple-600 active:to-pink-700 text-white px-6 py-2 rounded-full shadow-md transition-all duration-300 transform active:scale-105"
                onClick={() => router.back()}
              >
                <div className="text-white">返回</div>
              </Button>

              <Button
                className="bg-gradient-to-r from-red-500 to-red-600 active:from-red-600 active:to-red-700 text-white px-6 py-2 rounded-full shadow-md transition-all duration-300 transform active:scale-105"
                onClick={() => setOpenDialog(true)}
              >
                取消预约
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg shadow-md">
          <p className="text-yellow-700 font-medium">未找到预约信息</p>
        </div>
      )}

      {/* 取消预约确认弹窗 */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="bg-white rounded-2xl border-4 border-pink-200 p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-400 to-purple-400 py-4 px-6">
            <DialogTitle className="text-white font-bold text-xl">
              确认取消预约？
            </DialogTitle>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              取消后将无法恢复，确定要取消这条预约吗？
            </p>
            <DialogFooter className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setOpenDialog(false)}
                className="border-pink-300 text-pink-500 hover:bg-pink-50"
              >
                返回
              </Button>
              <Button
                variant="destructive"
                className="bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 border-none"
                onClick={handleDelete}
              >
                确认取消
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

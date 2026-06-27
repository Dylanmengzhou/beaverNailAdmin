"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SiAdafruit } from "react-icons/si";
import { SiFreenas } from "react-icons/si";
import { FaArrowAltCircleLeft } from "react-icons/fa";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<{
    nailArtistId: string;
    username: string;
    memberType: string;
    nailArtistName: string;
  } | null>(null);
  const calendarRef = useRef<FullCalendar>(null); // 引用FullCalendar实例
  const [showDatePicker, setShowDatePicker] = useState(false); // 控制日期选择器显示
  const [currentYearMonth, setCurrentYearMonth] = useState(""); // 存储当前年月
  // 添加日历视图状态
  const [calendarView, setCalendarView] = useState("dayGridMonth");

  // 添加月份缓存和加载状态
  const [monthlyDataCache, setMonthlyDataCache] = useState<{
    [key: string]: ApiReservation[];
  }>({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [currentMonthKey, setCurrentMonthKey] = useState("");

  // 初始化时从localStorage恢复缓存并检查当前月份数据
  useEffect(() => {
    try {
      // 直接从URL中获取删除参数，不依赖searchParams hook
      const urlParams = new URLSearchParams(window.location.search);
      const deletedReservationId = urlParams.get("deleted");
      console.log("🔍 检查删除参数 (直接从URL):", deletedReservationId);
      console.log("🔍 完整URL:", window.location.href);

      const savedCache = localStorage.getItem("calendarDataCache");
      if (savedCache) {
        let parsedCache = JSON.parse(savedCache);

        // 如果有删除的预约，先从缓存中移除
        if (deletedReservationId) {
          console.log(`🗑️ 恢复缓存前先处理删除: ${deletedReservationId}`);
          console.log("📦 删除前的缓存内容:", Object.keys(parsedCache));

          const updatedCache: { [key: string]: ApiReservation[] } = {};
          let totalRemoved = 0;

          for (const monthKey in parsedCache) {
            const monthData = parsedCache[monthKey];
            const originalLength = monthData.length;

            // 打印删除前的预约ID列表
            console.log(
              `月份 ${monthKey} 删除前的预约:`,
              monthData.map((r: ApiReservation) => r.id)
            );

            const filteredData = monthData.filter(
              (reservation: ApiReservation) =>
                reservation.id !== deletedReservationId
            );
            updatedCache[monthKey] = filteredData;

            const removedCount = originalLength - filteredData.length;
            if (removedCount > 0) {
              totalRemoved += removedCount;
              console.log(
                `从月份 ${monthKey} 中移除 ${removedCount} 个预约 ${deletedReservationId}`
              );
              console.log(
                `月份 ${monthKey} 删除后的预约:`,
                filteredData.map((r: ApiReservation) => r.id)
              );
            }
          }

          console.log(`🗑️ 总共移除了 ${totalRemoved} 个预约`);
          parsedCache = updatedCache;

          // 更新localStorage
          try {
            localStorage.setItem(
              "calendarDataCache",
              JSON.stringify(parsedCache)
            );
            console.log("📝 已更新localStorage，移除删除的预约");
          } catch (error) {
            console.error("更新localStorage失败:", error);
          }

          // 清除URL参数
          const url = new URL(window.location.href);
          url.searchParams.delete("deleted");
          window.history.replaceState({}, "", url.toString());
          console.log("🧹 已清除URL参数");

          toast.success("预约已删除，缓存已更新", {
            position: "top-center",
            duration: 2000,
          });
        }

        // 清理过期缓存
        const cleanedCache = cleanOldCache(parsedCache);
        console.log("从localStorage恢复缓存:", Object.keys(cleanedCache));
        setMonthlyDataCache(cleanedCache);

        // 检查当前月份是否有缓存数据
        const now = new Date();
        const monthRange = getMonthRange(now);
        if (cleanedCache[monthRange.key] && currentUser) {
          console.log("发现当前月份缓存，直接使用:", monthRange.key);
          setApiReservations(cleanedCache[monthRange.key]);
          setCurrentMonthKey(monthRange.key);
        }
      }
    } catch (error) {
      console.error("恢复缓存失败:", error);
    }
  }, [currentUser]);

  // 每次缓存更新时保存到localStorage
  useEffect(() => {
    if (Object.keys(monthlyDataCache).length > 0) {
      try {
        localStorage.setItem(
          "calendarDataCache",
          JSON.stringify(monthlyDataCache)
        );
        console.log("缓存已保存到localStorage:", Object.keys(monthlyDataCache));
      } catch (error) {
        console.error("保存缓存失败:", error);
      }
    }
  }, [monthlyDataCache]);

  // 移除了基于状态的新预约检测，改用数据库 isClick 字段

  // 调试: 监控URL参数变化
  useEffect(() => {
    const currentUrl = window.location.href;
    const deletedParam = searchParams.get("deleted");
    console.log("🔍 URL变化监控:");
    console.log("  - 当前URL:", currentUrl);
    console.log("  - deleted参数:", deletedParam);
  }, [searchParams]);

  // 格式化日期函数
  const formatDate = (dateString: string) => {
    console.log("formatDate 输入:", dateString);
    const date = new Date(dateString);
    console.log("解析的日期对象:", date);

    // 简化日期处理，避免时区问题
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const result = `${year}-${month}-${day}`;

    console.log("格式化结果:", result);
    return result;
  };

  // 生成月份范围的辅助函数
  const getMonthRange = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    // 使用本地时间格式化，避免时区问题
    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatLocalDate(startDate);
    const endDateStr = formatLocalDate(endDate);

    console.log(`月份范围计算: ${year}年${month + 1}月`);
    console.log(`开始日期: ${startDateStr}, 结束日期: ${endDateStr}`);

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
    };
  };

  // API 返回的数据类型
  type ApiReservation = {
    name: string | null;
    email: string | null;
    provider: string | null;
    id: string;
    date: string;
    timeSlot: string;
    nailArtist?: string; // 添加美甲师字段
    nailArtistId?: string;
    isClick?: boolean; // 添加点击状态字段
  };

  // Event 显示的数据类型
  type EventData = {
    user: string;
    timeslot: string;
    contact: string;
    date: string;
    reservationId: string;
    provider: string;
    nailArtist?: string; // 添加美甲师字段
    isClick?: boolean; // 添加点击状态字段
  };

  // 状态管理
  const [apiReservations, setApiReservations] = useState<ApiReservation[]>([]);

  // 获取特定月份的预约数据
  const handleGetMonthlyReservation = async (
    startDate: string,
    endDate: string,
    monthKey: string,
    forceRefresh: boolean = false
  ) => {
    try {
      // 如果没有用户信息，不执行请求
      if (!currentUser) {
        console.log("⚠️ handleGetMonthlyReservation: 没有用户信息，跳过请求");
        return;
      }

      // 检查缓存（除非强制刷新）
      if (!forceRefresh && monthlyDataCache[monthKey]) {
        console.log(
          `使用缓存数据: ${monthKey}，共 ${monthlyDataCache[monthKey].length} 条`
        );
        setApiReservations(monthlyDataCache[monthKey]);

        // 缓存数据设置完成
        console.log("缓存数据设置完成，应该触发日历重新渲染");

        return;
      }

      if (forceRefresh) {
        console.log(`🔄 强制刷新模式: 跳过缓存检查，直接获取新数据`);
      }

      console.log(
        `🔍 开始获取月份 ${monthKey} 的数据，日期范围: ${startDate} 到 ${endDate}`
      );
      console.log(
        `📅 具体包含的日期范围: ${startDate} (第一天) 到 ${endDate} (最后一天)`
      );
      setIsLoadingData(true);
      const response = await fetch("/api/getNewReservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginUser: currentUser,
          startDate,
          endDate,
        }),
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.message)) {
        // 根据用户类型过滤预约
        let filteredReservations = data.message;

        console.log("API 返回的原始数据:", data.message.length, "条");
        console.log("原始数据详情:", data.message);

        // 如果是staff，只显示分配给自己的预约
        if (currentUser.memberType === "staff") {
          filteredReservations = data.message.filter(
            (reservation: ApiReservation) =>
              reservation.nailArtistId === currentUser.nailArtistId
          );
          console.log("过滤后的员工数据:", filteredReservations.length, "条");
        }

        // 缓存数据
        setMonthlyDataCache((prev) => ({
          ...prev,
          [monthKey]: filteredReservations,
        }));

        setApiReservations(filteredReservations);
        console.log(
          `成功获取并设置月份 ${monthKey} 的预约数据:`,
          filteredReservations.length,
          "条"
        );
        console.log("设置的预约数据详情:", filteredReservations);

        // 新数据设置完成
        console.log("新数据设置完成，应该触发日历重新渲染");

        toast.success(
          `成功获取 ${monthKey} 的预约数据: ${filteredReservations.length} 条`,
          {
            position: "top-center",
            duration: 1000,
          }
        );
      } else {
        console.error("获取预约数据失败:", data.message);
        setApiReservations([]); // 清空数据
        toast.error("获取预约数据失败");
      }
    } catch (error) {
      console.error("获取预约数据出错:", error);
      setApiReservations([]); // 清空数据
      toast.error("获取预约数据出错");
    } finally {
      setIsLoadingData(false);
    }
  };

  // 缓存清理函数：清理超过7天的旧缓存
  const cleanOldCache = (cache: { [key: string]: ApiReservation[] }) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const cutoffKey = `${sevenDaysAgo.getFullYear()}-${String(
      sevenDaysAgo.getMonth() + 1
    ).padStart(2, "0")}`;

    const cleanedCache: { [key: string]: ApiReservation[] } = {};
    for (const key in cache) {
      if (key >= cutoffKey) {
        cleanedCache[key] = cache[key];
      } else {
        console.log("清理过期缓存:", key);
      }
    }
    return cleanedCache;
  };

  // 兼容性函数：获取当前月份的预约数据（智能缓存）
  const handleGetReservation = async () => {
    const now = new Date();
    const monthRange = getMonthRange(now);

    // 检查是否已有当前月份的缓存数据
    if (monthlyDataCache[monthRange.key]) {
      console.log("handleGetReservation: 使用持久化缓存数据，避免重复请求");
      setApiReservations(monthlyDataCache[monthRange.key]);
      setCurrentMonthKey(monthRange.key);
      return; // 直接返回，不发起新请求
    }

    // 没有缓存时才获取新数据
    console.log("handleGetReservation: 没有缓存，获取新数据");
    setCurrentMonthKey(monthRange.key);
    await handleGetMonthlyReservation(
      monthRange.startDate,
      monthRange.endDate,
      monthRange.key
    );
  };

  // 页面加载时检测设备 + 智能拉取预约（只在没有缓存时获取）
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    if (!checkingAuth && currentUser) {
      // 检查当前月份是否已有数据（来自缓存恢复）
      const now = new Date();
      const monthRange = getMonthRange(now);

      // 用setTimeout避免在渲染期间直接调用状态更新
      setTimeout(() => {
        if (!apiReservations.length && !monthlyDataCache[monthRange.key]) {
          console.log("没有缓存数据，需要获取新数据");
          handleGetReservation();
        } else {
          console.log("已有数据或缓存，跳过自动获取");
        }
      }, 0);
    }

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, [checkingAuth, currentUser]);

  // 从localStorage加载保存的视图设置
  useEffect(() => {
    if (calendarRef.current && !checkingAuth) {
      // 从localStorage获取保存的视图
      const savedView = localStorage.getItem("calendarView");
      if (savedView) {
        // 应用保存的视图
        const calendarApi = calendarRef.current.getApi();
        calendarApi.changeView(savedView);
        setCalendarView(savedView);
      } else {
        // 如果没有保存的视图，设置默认视图
        setCalendarView("dayGridMonth");
      }
    }
  }, [calendarRef.current, checkingAuth]);

  // 给FullCalendar的标题添加点击事件
  useEffect(() => {
    if (calendarRef.current) {
      // 等日历渲染完毕后再添加事件监听
      setTimeout(() => {
        const titleElement = document.querySelector(".fc-toolbar-title");
        if (titleElement) {
          // 添加样式让标题看起来可点击
          titleElement.classList.add(
            "cursor-pointer",
            "hover:text-pink-500",
            "transition-colors"
          );
          // 添加点击事件
          titleElement.addEventListener("click", handleDateSelect);
        }
      }, 500);
    }
  }, [calendarRef.current, checkingAuth]);

  // 把当月预约数追加到日历标题后面
  useEffect(() => {
    const updateTitleCount = () => {
      const titleElement = document.querySelector(".fc-toolbar-title");
      if (!titleElement) return;

      let countEl = titleElement.querySelector<HTMLSpanElement>(
        ".reservation-count-badge"
      );
      if (!countEl) {
        countEl = document.createElement("span");
        countEl.className = "reservation-count-badge";
        titleElement.appendChild(countEl);
      }
      countEl.innerHTML = `<span class="reservation-count-dot">· </span>${apiReservations.length}个预约`;
    };

    const timer = setTimeout(updateTitleCount, 100);
    return () => clearTimeout(timer);
  }, [apiReservations.length, currentMonthKey, checkingAuth, calendarView]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/");
    } else {
      // 解析JWT获取用户信息
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          // 使用更安全的方法解码JWT payload
          const base64Url = tokenParts[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          const payload = JSON.parse(jsonPayload);

          setCurrentUser({
            nailArtistId: payload.id,
            username: payload.username,
            memberType: payload.memberType,
            nailArtistName: payload.nailArtistName,
          });
        }
      } catch (error) {
        console.error("解析token失败:", error);
      }
      setCheckingAuth(false); // 有token，认证通过
    }
  }, []);

  // 把 API 数据转成 Calendar 需要的格式
  const apiEventsData: EventData[] = apiReservations.map((reservation) => {
    const hour = parseInt(reservation.timeSlot);
    // 只显示几点开始，不显示结束时间
    const formattedTimeSlot = `${hour}:00`;
    const formattedDate = formatDate(reservation.date);

    console.log(
      `转换预约数据: ${reservation.name}, 原始日期: ${reservation.date}, 格式化日期: ${formattedDate}`
    );

    return {
      user: reservation.name ?? "未知用户",
      timeslot: formattedTimeSlot,
      contact: reservation.email ?? "无联系方式",
      date: formattedDate,
      reservationId: reservation.id,
      provider: reservation.provider ?? "credentials",
      nailArtist: reservation.nailArtist,
      isClick: reservation.isClick ?? false, // 添加点击状态
    };
  });

  // 调试日历事件数据
  console.log("转换后的事件数据:", apiEventsData.length, "个事件");
  if (apiEventsData.length > 0) {
    console.log("事件数据示例:", apiEventsData[0]);
  }

  // 获取provider对应的背景颜色
  const getProviderBgColor = (provider: string): string => {
    switch (provider) {
      case "wechat":
        return "bg-green-500";
      case "google":
        return "bg-blue-500";
      case "kakao":
        return "bg-yellow-500";
      case "credentials":
      default:
        return "bg-pink-500";
    }
  };

  // 渲染事件内容
  const renderEventContent = (eventInfo: {
    event: {
      extendedProps: {
        user: string;
        timeslot: string;
        contact: string;
        reservationId: string;
        provider: string;
        nailArtist?: string;
        isClick?: boolean;
      };
    };
  }) => {
    const { user, timeslot, contact, reservationId, provider, nailArtist } =
      eventInfo.event.extendedProps;

    const providerBgColor = getProviderBgColor(provider);

    // 基于数据库的 isClick 字段检查是否显示金边
    const shouldShowGoldBorder = !eventInfo.event.extendedProps.isClick;

    // 调试未点击预约识别
    if (shouldShowGoldBorder) {
      console.log(`🌟 渲染未点击预约: ${reservationId} (${user})`);
    }

    // 未点击预约的特殊样式
    const goldBorderStyles = shouldShowGoldBorder
      ? {
          border: "3px solid #fbbf24 !important", // 金色边框
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite", // 脉冲动画
          boxShadow: "0 0 15px rgba(251, 191, 36, 0.8)", // 增强金色阴影
          transform: "scale(1.02)", // 稍微放大
          zIndex: "10", // 确保在最上层
        }
      : {};

    // 点击预约时更新数据库 isClick 状态
    const handleReservationClick = async () => {
      if (!shouldShowGoldBorder) {
        // 如果已经点击过了，直接跳转
        router.push(`/reservation/${reservationId}`);
        return;
      }

      try {
        // 立即更新本地状态，提供即时反馈
        setApiReservations((prev) =>
          prev.map((reservation) =>
            reservation.id === reservationId
              ? { ...reservation, isClick: true }
              : reservation
          )
        );

        // 同时更新缓存中的数据
        setMonthlyDataCache((prev) => {
          const now = new Date();
          const monthRange = getMonthRange(now);
          const currentMonthKey = monthRange.key;

          if (prev[currentMonthKey]) {
            const updatedCache = {
              ...prev,
              [currentMonthKey]: prev[currentMonthKey].map((reservation) =>
                reservation.id === reservationId
                  ? { ...reservation, isClick: true }
                  : reservation
              ),
            };

            // 更新 localStorage
            try {
              localStorage.setItem(
                "calendarDataCache",
                JSON.stringify(updatedCache)
              );
              console.log(`📦 已更新缓存中的预约 ${reservationId} 点击状态`);
            } catch (error) {
              console.error("更新缓存失败:", error);
            }

            return updatedCache;
          }
          return prev;
        });

        // 更新数据库中的 isClick 状态
        const response = await fetch("/api/updateReservationClick", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservationId: reservationId,
            isClick: true,
          }),
        });

        if (response.ok) {
          console.log(`✅ 已标记预约 ${reservationId} 为已点击`);
        } else {
          console.error("数据库更新失败，但本地状态已更新");
        }
      } catch (error) {
        console.error("更新点击状态失败:", error);
      }

      // 跳转到预约详情页
      router.push(`/reservation/${reservationId}`);
    };

    return (
      <div
        className={`flex flex-col text-xs p-1 rounded-md ${providerBgColor} text-white relative`}
        onClick={handleReservationClick}
        style={{ cursor: "pointer", ...goldBorderStyles }}
      >
        {/* 未点击预约标识 */}
        {shouldShowGoldBorder && (
          <>
            <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded-full z-20 animate-bounce">
              NEW
            </div>
            <div className="absolute inset-0 border-4 border-yellow-400 rounded-md animate-pulse"></div>
          </>
        )}

        {isMobile ? (
          <div className="flex flex-col space-y-1 p-0 justify-center items-center">
            <div className="font-bold text-[10px] truncate w-full text-center">
              {user}
            </div>
            <div className="font-medium text-[8px]">{timeslot}</div>
            {currentUser?.memberType === "manager" && nailArtist && (
              <div className="font-medium text-[8px] bg-white/30 px-1 rounded">
                {nailArtist}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <div className="font-semibold truncate mr-1">{user}</div>
              <div>{timeslot}</div>
            </div>
            <div className="flex justify-between">
              <div className="truncate mr-1">{contact}</div>
              <div className="text-[10px]">{reservationId.substring(0, 6)}</div>
            </div>
            {currentUser?.memberType === "manager" && nailArtist && (
              <div className="text-[10px] bg-white/30 px-1 rounded mt-1 text-center">
                美甲师: {nailArtist}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // 生成 FullCalendar 的 events
  const sampleEvents = apiEventsData.map((event) => ({
    title: "",
    date: event.date,
    extendedProps: {
      user: event.user,
      timeslot: event.timeslot,
      contact: event.contact,
      reservationId: event.reservationId,
      provider: event.provider,
      nailArtist: event.nailArtist,
      isClick: event.isClick, // 添加点击状态
    },
  }));

  // 调试最终的日历事件数据
  console.log("传递给 FullCalendar 的事件数据:", sampleEvents.length, "个事件");
  if (sampleEvents.length > 0) {
    console.log("FullCalendar 事件示例:", sampleEvents[0]);
  }

  // 监听预约数据变化，确保日历正确更新
  useEffect(() => {
    console.log("apiReservations 数据更新:", apiReservations.length, "条预约");
    console.log("当前预约数据:", apiReservations);
    if (apiReservations.length > 0) {
      console.log("预约数据示例:", apiReservations[0]);
    }
  }, [apiReservations]);

  // 处理菜单按钮点击
  const handleMenuButtonClick = () => {
    // 简单切换菜单显示状态
    setShowDropdown(!showDropdown);
  };

  // 处理日历视图切换
  const handleViewChange = (viewName: string) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(viewName);
      // 注意：视图变化会触发datesSet事件，由事件处理函数更新状态和localStorage
      setShowDropdown(false);
    }
  };

  // 日期选择器相关函数
  const handleDateSelect = () => {
    // 获取当前日历显示的年月
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const currentDate = calendarApi.getDate();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      setCurrentYearMonth(`${year}-${month}`);
    }
    setShowDatePicker(true);
  };

  // 关闭日期选择器
  const handleCloseDatePicker = () => {
    setShowDatePicker(false);
  };

  // 处理年月选择改变
  const handleYearMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value && calendarRef.current) {
      setCurrentYearMonth(e.target.value);
      // 获取日历API并导航到选定年月
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(e.target.value + "-01"); // 添加日期，跳转到月份的第一天
      setShowDatePicker(false);
    }
  };

  // 处理日历视图变化，实现按需加载数据
  const handleDatesSet = (dateInfo: {
    start: Date;
    end: Date;
    view: { type: string };
  }) => {
    console.log("handleDatesSet 被调用, dateInfo:", dateInfo);
    console.log("dateInfo.start:", dateInfo.start);
    console.log("dateInfo.end:", dateInfo.end);
    console.log("dateInfo.view.type:", dateInfo.view.type);

    // 只在视图类型发生变化时保存设置
    if (dateInfo.view.type !== calendarView) {
      console.log("视图发生变化:", dateInfo.view.type);
      localStorage.setItem("calendarView", dateInfo.view.type);
      setCalendarView(dateInfo.view.type);
    }

    // 对于月视图，我们需要精确获取当前显示的月份
    if (dateInfo.view.type === "dayGridMonth") {
      // 获取当前日历标题显示的月份
      let currentDisplayMonth: Date;

      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        currentDisplayMonth = calendarApi.getDate();
        console.log("从 calendarApi 获取的当前日期:", currentDisplayMonth);
      } else {
        // 后备方案：使用视图范围的中间日期
        const start = new Date(dateInfo.start);
        const end = new Date(dateInfo.end);
        currentDisplayMonth = new Date(
          start.getTime() + (end.getTime() - start.getTime()) / 2
        );
        console.log("后备方案计算的当前日期:", currentDisplayMonth);
      }

      const monthRange = getMonthRange(currentDisplayMonth);
      console.log("计算出的月份范围:", monthRange);

      // 只有当月份真正改变时才获取数据
      if (monthRange.key !== currentMonthKey && currentUser) {
        console.log(`月份变化: ${currentMonthKey} -> ${monthRange.key}`);
        setCurrentMonthKey(monthRange.key);

        // 检查缓存，如果有缓存则使用缓存，没有则获取新数据
        if (monthlyDataCache[monthRange.key]) {
          console.log(
            `handleDatesSet: 使用缓存数据，避免重复请求 ${monthRange.key}`
          );
          setApiReservations(monthlyDataCache[monthRange.key]);
        } else {
          console.log(`handleDatesSet: 没有缓存，获取新数据 ${monthRange.key}`);
          console.log(
            `获取月份数据: ${monthRange.startDate} 到 ${monthRange.endDate}`
          );
          handleGetMonthlyReservation(
            monthRange.startDate,
            monthRange.endDate,
            monthRange.key
          );
        }
      } else if (monthRange.key === currentMonthKey) {
        console.log(`月份未变化，保持当前月份: ${currentMonthKey}`);
      }
    }
    // 对于周视图或日视图，可以扩展范围以包含前后的数据
    else if (
      dateInfo.view.type === "dayGridWeek" ||
      dateInfo.view.type === "dayGridDay"
    ) {
      // 获取包含当前视图的月份范围
      const currentDisplayMonth = new Date(dateInfo.start);
      const monthRange = getMonthRange(currentDisplayMonth);

      if (monthRange.key !== currentMonthKey && currentUser) {
        console.log(`视图变化，加载月份数据: ${monthRange.key}`);
        setCurrentMonthKey(monthRange.key);

        // 检查缓存，如果有缓存则使用缓存，没有则获取新数据
        if (monthlyDataCache[monthRange.key]) {
          console.log(`handleDatesSet: 视图变化使用缓存数据 ${monthRange.key}`);
          setApiReservations(monthlyDataCache[monthRange.key]);
        } else {
          console.log(`handleDatesSet: 视图变化获取新数据 ${monthRange.key}`);
          console.log(
            `获取月份数据: ${monthRange.startDate} 到 ${monthRange.endDate}`
          );
          handleGetMonthlyReservation(
            monthRange.startDate,
            monthRange.endDate,
            monthRange.key
          );
        }
      }
    }
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (checkingAuth) {
    return (
      <div className="w-full h-svh flex justify-center items-center">
        加载中...
      </div>
    ); // 认证状态还没检查完
  }

  return (
    <div className="flex flex-col justify-center items-center calendar-container">
      <div className="w-full relative">
        {/* 数据加载指示器 */}
        {isLoadingData && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-pink-500 text-white px-4 py-2 rounded-md shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>加载中...</span>
            </div>
          </div>
        )}

        {/* 毛玻璃背景效果 */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
            onClick={() => setShowDropdown(false)}
          ></div>
        )}

        {/* 下拉菜单 - 页面中间 */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden border-none"
            style={{
              width: "280px",
              background: "linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)",
              boxShadow: "0 0 20px rgba(255, 105, 180, 0.5)",
            }}
          >
            <div className="px-4 py-3 font-bold text-center text-pink-600 border-b-2 border-white bg-gradient-to-r from-pink-200 to-purple-200">
              ✨ 日历操作菜单 ✨
            </div>

            <div className="">
              {/* 显示当前用户信息 */}
              <div className="px-4 py-2 flex items-center justify-center gap-2 bg-pink-400 ">
                <span className="text-lg font-medium text-white">
                  {currentUser?.nailArtistName} (
                  {currentUser?.memberType === "manager" ? "管理员" : "员工"})
                </span>
              </div>

              {/* 日历操作按钮 - 移动端专用部分 */}
              {isMobile && (
                <>
                  <div className="border-t-2 border-white rounded-full"></div>
                  <div className="px-4 py-2">
                    <div className="font-medium text-pink-800 mb-2 text-center">
                      日历视图
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <button
                        className={`px-2 py-1 text-xs rounded-md ${
                          calendarView === "dayGridMonth"
                            ? "bg-pink-500 text-white"
                            : "bg-pink-100 text-pink-800"
                        }`}
                        onClick={() => handleViewChange("dayGridMonth")}
                      >
                        这月
                      </button>
                      <button
                        className={`px-2 py-1 text-xs rounded-md ${
                          calendarView === "dayGridWeek"
                            ? "bg-pink-500 text-white"
                            : "bg-pink-100 text-pink-800"
                        }`}
                        onClick={() => handleViewChange("dayGridWeek")}
                      >
                        这周
                      </button>
                      <button
                        className={`px-2 py-1 text-xs rounded-md ${
                          calendarView === "dayGridDay"
                            ? "bg-pink-500 text-white"
                            : "bg-pink-100 text-pink-800"
                        }`}
                        onClick={() => handleViewChange("dayGridDay")}
                      >
                        今天
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 管理员专属菜单项 */}
              {["manager", "staff"].includes(currentUser?.memberType ?? "") && (
                <div className="">
                  {currentUser?.memberType === "staff" && (
                    <>
                      <div className="border-t-2 border-white rounded-full"></div>
                      <div
                        className="px-4 py-3 my-1 flex items-center gap-2 hover:bg-pink-100 cursor-pointer rounded-lg transition-colors"
                        onClick={() => {
                          router.push("/dashboard/changeProfile");
                          setShowDropdown(false);
                        }}
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500 text-white">
                          <SiAdafruit />
                        </div>
                        <span className="font-medium text-pink-800">
                          个人信息更改
                        </span>
                      </div>
                    </>
                  )}
                  <div className="border-t-2 border-white rounded-full"></div>
                  <div
                    className="px-4 py-3 my-1 flex items-center gap-2 hover:bg-pink-100 cursor-pointer rounded-lg transition-colors"
                    onClick={() => {
                      router.push("/dashboard");
                      setShowDropdown(false);
                    }}
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-pink-500 text-white">
                      <SiFreenas />
                    </div>
                    <span className="font-medium text-pink-800">
                      美甲师管理
                    </span>
                  </div>
                  {currentUser?.memberType === "manager" && (
                    <>
                      <div className="border-t-2 border-white rounded-full"></div>
                      <div
                        className="px-4 py-3 my-1 flex items-center gap-2 hover:bg-pink-100 cursor-pointer rounded-lg transition-colors"
                        onClick={() => {
                          router.push("/dashboard/stats");
                          setShowDropdown(false);
                        }}
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500 text-white">
                          <SiAdafruit />
                        </div>
                        <span className="font-medium text-pink-800">
                          数据看板
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="border-t-2 border-white rounded-full"></div>

              <div
                className="px-4 py-3 my-1 flex items-center gap-2 hover:bg-pink-100 cursor-pointer rounded-lg transition-colors"
                onClick={() => {
                  localStorage.clear(); // 清空所有localStorage数据
                  router.push("/");
                  setShowDropdown(false);
                }}
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white">
                  <FaArrowAltCircleLeft />
                </div>
                <span className="font-medium text-pink-800">退出登录</span>
              </div>
            </div>
          </div>
        )}

        {/* 日期选择器弹出层 */}
        {showDatePicker && (
          <div className=" fixed inset-0 flex items-center justify-center z-[10000] bg-black/50">
            <div className="bg-white rounded-lg p-5 max-w-sm w-9/12">
              <h3 className="text-lg font-medium mb-4 text-center text-pink-600">
                选择年月
              </h3>

              <div className="mb-4">
                <input
                  type="month"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                  onChange={handleYearMonthChange}
                  value={currentYearMonth}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCloseDatePicker}
                  className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView={localStorage.getItem("calendarView") || "dayGridMonth"}
          weekends={true}
          locale={"zh-cn"}
          dayCellContent={({ date }) => {
            // 只显示数字，不显示"日"字
            return (
              <div className="fc-daygrid-day-number">{date.getDate()}</div>
            );
          }}
          datesSet={handleDatesSet}
          headerToolbar={
            isMobile
              ? {
                  left: "prev,next",
                  center: "title",
                  right: "today,myRefreshButton,menuButton",
                }
              : {
                  left: "prev,next,today,myRefreshButton",
                  center: "title",
                  right: "dayGridMonth,dayGridWeek,dayGridDay,menuButton",
                }
          }
          customButtons={{
            myRefreshButton: {
              text: "刷新",
              click: () => {
                console.log("🔄 刷新按钮被点击 - 开始调试");
                console.log("📊 当前状态:");
                console.log("  - calendarRef.current:", !!calendarRef.current);
                console.log("  - currentMonthKey:", currentMonthKey);
                console.log("  - currentUser:", !!currentUser);
                console.log("  - isLoadingData:", isLoadingData);
                console.log("  - 当前预约数量:", apiReservations.length);

                // 无论如何都尝试获取当前显示的月份
                if (calendarRef.current) {
                  const calendarApi = calendarRef.current.getApi();
                  const currentDisplayDate = calendarApi.getDate();
                  const monthRange = getMonthRange(currentDisplayDate);

                  console.log("🗓️ 当前日历显示的日期:", currentDisplayDate);
                  console.log("📅 计算出的月份范围:", monthRange);

                  // 强制更新 currentMonthKey
                  console.log(
                    `📝 强制更新 currentMonthKey: ${currentMonthKey} -> ${monthRange.key}`
                  );
                  setCurrentMonthKey(monthRange.key);

                  // 重新获取数据（强制刷新模式）
                  console.log("🔄 开始强制刷新数据...");
                  handleGetMonthlyReservation(
                    monthRange.startDate,
                    monthRange.endDate,
                    monthRange.key,
                    true // forceRefresh = true
                  );

                  // 清除localStorage中的缓存
                  setTimeout(() => {
                    setMonthlyDataCache((prev) => {
                      const newCache = { ...prev };
                      delete newCache[monthRange.key];
                      console.log(
                        "🗑️ 清除内存和localStorage缓存:",
                        monthRange.key
                      );

                      // 同时更新localStorage
                      try {
                        localStorage.setItem(
                          "calendarDataCache",
                          JSON.stringify(newCache)
                        );
                      } catch (error) {
                        console.error("清除localStorage缓存失败:", error);
                      }

                      return newCache;
                    });
                  }, 100);
                } else {
                  console.error("❌ 无法刷新: calendarRef 不可用");
                  console.log("calendarRef:", calendarRef);

                  // 后备方案：使用 currentUser 和当前系统时间
                  if (currentUser) {
                    console.log("🔄 使用后备方案刷新...");
                    const now = new Date();
                    const monthRange = getMonthRange(now);
                    setCurrentMonthKey(monthRange.key);

                    setMonthlyDataCache((prev) => {
                      const newCache = { ...prev };
                      delete newCache[monthRange.key];

                      // 同时更新localStorage
                      try {
                        localStorage.setItem(
                          "calendarDataCache",
                          JSON.stringify(newCache)
                        );
                      } catch (error) {
                        console.error(
                          "后备方案清除localStorage缓存失败:",
                          error
                        );
                      }

                      return newCache;
                    });

                    handleGetMonthlyReservation(
                      monthRange.startDate,
                      monthRange.endDate,
                      monthRange.key,
                      true // forceRefresh = true
                    );
                  } else {
                    console.error("❌ 完全无法刷新: 用户信息不可用");
                  }
                }
              },
            },
            menuButton: {
              text: "≡",
              click: handleMenuButtonClick,
            },
          }}
          titleFormat={{
            year: "numeric",
            month: "long",
          }}
          events={sampleEvents}
          eventContent={renderEventContent}
          height="auto"
          contentHeight="auto"
          dayMaxEventRows={isMobile ? 5 : true}
          moreLinkClick="popover"
          fixedWeekCount={false}
          stickyHeaderDates={true}
          // 自定义视图配置
          views={{
            timeGridWeek: {
              // 自定义列头显示格式，只显示星期几
              dayHeaderFormat: { weekday: "short" }, // 'short'显示简短的星期几，如"周一"
            },
            timeGridDay: {
              // 调整日视图标题格式
              titleFormat: { month: "long", day: "numeric", weekday: "long" }, // 如"4月15日 星期一"
            },
            dayGridMonth: {
              // 自定义月视图列头显示
              dayHeaderFormat: { weekday: "short" }, // 只显示周几，如"周一"
            },
          }}
          // 全局日期格式化选项
          dayHeaderFormat={{ weekday: "short" }}
        />
      </div>
    </div>
  );
}

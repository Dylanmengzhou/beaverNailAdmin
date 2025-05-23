"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SiAdafruit } from "react-icons/si";
import { SiFreenas } from "react-icons/si";
import { FaArrowAltCircleLeft } from "react-icons/fa";

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
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

  // 格式化日期函数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const year = koreaDate.getUTCFullYear();
    const month = String(koreaDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(koreaDate.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
  };

  // 状态管理
  const [apiReservations, setApiReservations] = useState<ApiReservation[]>([]);

  // 获取预约数据
  const handleGetReservation = async () => {
    try {
      // 如果没有用户信息，不执行请求
      if (!currentUser) return;

      const response = await fetch("/api/getNewReservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ loginUser: currentUser }),
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.message)) {
        // 根据用户类型过滤预约
        let filteredReservations = data.message;

        console.log("currentUser", currentUser);
        console.log("reservations", data.message);
        // 如果是staff，只显示分配给自己的预约
        if (currentUser.memberType === "staff") {
          filteredReservations = data.message.filter(
            (reservation: ApiReservation) =>
              reservation.nailArtistId === currentUser.nailArtistId
          );
        }

        setApiReservations(filteredReservations);
        console.log("成功获取预约数据:", filteredReservations.length);
        toast.success(`成功获取预约数据: ${filteredReservations.length}`, {
          position: "top-center",
          duration: 1000,
        });
      } else {
        console.error("获取预约数据失败:", data.message);
        alert("获取预约数据失败");
      }
    } catch (error) {
      console.error("获取预约数据出错:", error);
      alert("获取预约数据出错");
    }
  };

  // 页面加载时检测设备 + 拉取预约
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    if (!checkingAuth) {
      // 登录检查完了，再拉预约数据
      handleGetReservation();
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

    return {
      user: reservation.name ?? "未知用户",
      timeslot: formattedTimeSlot,
      contact: reservation.email ?? "无联系方式",
      date: formatDate(reservation.date),
      reservationId: reservation.id,
      provider: reservation.provider ?? "credentials",
      nailArtist: reservation.nailArtist,
    };
  });

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
      };
    };
  }) => {
    const { user, timeslot, contact, reservationId, provider, nailArtist } =
      eventInfo.event.extendedProps;

    const handleClick = () => {
      router.push(`/reservation/${reservationId}`);
    };

    const providerBgColor = getProviderBgColor(provider);

    return (
      <div
        className={`flex flex-col text-xs p-1 rounded-md ${providerBgColor} text-white`}
        onClick={handleClick}
        style={{ cursor: "pointer" }}
      >
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
    },
  }));

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

  // 刷新数据并关闭菜单
  // const handleRefreshData = () => {
  //   handleGetReservation();
  //   setShowDropdown(false);
  // };

  // 今天按钮处理
  // const handleTodayClick = () => {
  //   if (calendarRef.current) {
  //     const calendarApi = calendarRef.current.getApi();
  //     calendarApi.today();
  //     setShowDropdown(false);
  //   }
  // };

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
          datesSet={(arg) => {
            // 只在视图类型发生变化时保存设置
            if (arg.view.type !== calendarView) {
              console.log("视图发生变化:", arg.view.type);
              localStorage.setItem("calendarView", arg.view.type);
              setCalendarView(arg.view.type);
            }
          }}
          headerToolbar={
            isMobile
              ? {
                  left: "prev,next",
                  center: "title",
                  right: "today,myRefreshButton,menuButton",
                }
              : {
                  left: "prev,next,today",
                  center: "title",
                  right: "dayGridMonth,dayGridWeek,dayGridDay,menuButton",
                }
          }
          customButtons={{
            myRefreshButton: {
              text: "刷新",
              click: handleGetReservation,
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

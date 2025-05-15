"use client";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "./label";
import { Input } from "./input";
import { useState, useEffect, useRef } from "react";

// 事件接口定义
interface Event {
  id: string;
  name: string;
  date: Date;
  time: string;
  nailArtist: string;
  color: string;
}

function Scheduler() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarDays, setCalendarDays] = useState<
    Array<{ date: Date; isCurrentMonth: boolean }>
  >([]);
  // 添加视图模式状态
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  // 年月选择状态
  const [yearMonthDialogOpen, setYearMonthDialogOpen] = useState(false);
  const [yearInput, setYearInput] = useState(
    currentDate.getFullYear().toString()
  );
  const [monthInput, setMonthInput] = useState(
    (currentDate.getMonth() + 1).toString()
  );

  // 生成年份和月份数据
  const years = Array.from({ length: 101 }, (_, i) => 2000 + i - 50); // 从1950到2050
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 轮盘滚动参考
  const yearWheelRef = useRef<HTMLDivElement>(null);
  const monthWheelRef = useRef<HTMLDivElement>(null);

  // 示例事件数据
  const [events] = useState<Event[]>([
    {
      id: "1",
      name: "张三",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
      time: "10:00",
      nailArtist: "娜娜",
      color: "#FF5733",
    },
    {
      id: "2",
      name: "李四",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
      time: "12:00",
      nailArtist: "娜娜",
      color: "#33FF57",
    },
    {
      id: "3",
      name: "王五",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
      time: "14:00",
      nailArtist: "娜娜",
      color: "#3357FF",
    },
    {
      id: "4",
      name: "毕梦舟",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
      time: "16:00",
      nailArtist: "娜娜",
      color: "#F033FF",
    },
    {
      id: "5",
      name: "孙七",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
      time: "18:00",
      nailArtist: "娜娜",
      color: "#FF33F0",
    },
  ]);

  // 生成当前月份的日历数据
  useEffect(() => {
    const generateCalendarDays = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // 当月第一天
      const firstDayOfMonth = new Date(year, month, 1);
      // 当月最后一天
      const lastDayOfMonth = new Date(year, month + 1, 0);

      // 计算日历第一格应该显示的日期（可能是上个月的日期）
      const firstDayOfCalendar = new Date(firstDayOfMonth);
      const dayOfWeek = firstDayOfMonth.getDay();
      firstDayOfCalendar.setDate(
        firstDayOfMonth.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
      );

      const days = [];
      // 生成42天的日历（6周）
      for (let i = 0; i < 42; i++) {
        const date = new Date(firstDayOfCalendar);
        date.setDate(firstDayOfCalendar.getDate() + i);
        days.push({
          date,
          isCurrentMonth: date.getMonth() === month,
        });
      }

      setCalendarDays(days);
    };

    generateCalendarDays();

    // 更新年月输入
    setYearInput(currentDate.getFullYear().toString());
    setMonthInput((currentDate.getMonth() + 1).toString());
  }, [currentDate]);

  // 在对话框打开时调整滚轮位置
  useEffect(() => {
    if (yearMonthDialogOpen && yearWheelRef.current && monthWheelRef.current) {
      const yearIndex = years.findIndex((y) => y === parseInt(yearInput));
      const monthIndex = parseInt(monthInput) - 1;

      if (yearIndex !== -1) {
        const yearWheel = yearWheelRef.current;
        const yearItemHeight = 40; // 每个选项的高度
        yearWheel.scrollTop =
          yearItemHeight * yearIndex -
          yearWheel.clientHeight / 2 +
          yearItemHeight / 2;
      }

      if (monthIndex >= 0) {
        const monthWheel = monthWheelRef.current;
        const monthItemHeight = 40; // 每个选项的高度
        monthWheel.scrollTop =
          monthItemHeight * monthIndex -
          monthWheel.clientHeight / 2 +
          monthItemHeight / 2;
      }
    }
  }, [yearMonthDialogOpen, yearInput, monthInput, years]);

  // 前往上个月
  const goToPreviousMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // 前往下个月
  const goToNextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // 回到今天
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // 格式化年月显示
  const formatYearMonth = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  // 检查日期是否为今天
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // 检查日期是否为选中日期
  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // 获取特定日期的事件
  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) =>
        event.date.getDate() === date.getDate() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getFullYear() === date.getFullYear()
    );
  };

  // 切换视图模式
  const toggleViewMode = () => {
    setViewMode(viewMode === "month" ? "week" : "month");
  };

  // 获取一周的日期数组
  const getWeekDays = (
    date: Date,
    calendarDays: Array<{ date: Date; isCurrentMonth: boolean }>
  ) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(
      date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)
    );

    return calendarDays.filter((day) => {
      const dayOfWeek = day.date.getDay();
      const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // 将周日的0改为7
      const weekNumber = Math.ceil(
        (day.date.getDate() - adjustedDayOfWeek + 1) / 7
      );
      const dateWeekNumber = Math.ceil(
        (date.getDate() - (date.getDay() === 0 ? 7 : date.getDay()) + 1) / 7
      );

      return (
        day.date.getMonth() === date.getMonth() && weekNumber === dateWeekNumber
      );
    });
  };

  // 给定日期是否在特定周内
  const isInSameWeek = (date1: Date, date2: Date) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const day1 = d1.getDay() || 7; // 将周日的0改为7
    const day2 = d2.getDay() || 7;

    d1.setDate(d1.getDate() - day1 + 1);
    d2.setDate(d2.getDate() - day2 + 1);

    return d1.getTime() === d2.getTime();
  };

  // 将calendarDays按周分组
  const weeklyCalendarDays = () => {
    const weeks: Array<Array<{ date: Date; isCurrentMonth: boolean }>> = [];
    let currentWeek: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    calendarDays.forEach((day, index) => {
      if (index % 7 === 0 && index !== 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
      if (index === calendarDays.length - 1) {
        weeks.push(currentWeek);
      }
    });

    return weeks;
  };

  // 跳转到指定年月
  const jumpToYearMonth = () => {
    const year = parseInt(yearInput);
    const month = parseInt(monthInput) - 1; // JavaScript中月份从0开始

    if (!isNaN(year) && !isNaN(month) && month >= 0 && month < 12) {
      const newDate = new Date(currentDate);
      newDate.setFullYear(year);
      newDate.setMonth(month);
      setCurrentDate(newDate);
      setYearMonthDialogOpen(false);
    }
  };

  // 处理年份滚轮滚动
  const handleYearWheelScroll = () => {
    if (yearWheelRef.current) {
      const scrollTop = yearWheelRef.current.scrollTop;
      const itemHeight = 40; // 每个选项高度
      const index = Math.round((scrollTop + itemHeight / 2) / itemHeight);
      const centerIndex = Math.min(Math.max(0, index), years.length - 1);
      setYearInput(years[centerIndex].toString());
    }
  };

  // 处理月份滚轮滚动
  const handleMonthWheelScroll = () => {
    if (monthWheelRef.current) {
      const scrollTop = monthWheelRef.current.scrollTop;
      const itemHeight = 40; // 每个选项高度
      const index = Math.round((scrollTop + itemHeight / 2) / itemHeight);
      const centerIndex = Math.min(Math.max(0, index), months.length - 1);
      setMonthInput((centerIndex + 1).toString());
    }
  };

  return (
    <div className="w-svw h-svh flex flex-col">
      {/* 日历部分 */}
      <div className="flex-1 md:p-4 overflow-hidden flex flex-col">
        <div className="calendar-container flex-1 overflow-hidden flex flex-col">
          {/* 星期标题 - 使用sticky定位 */}
          <div className="sticky top-0 z-10 bg-white grid grid-cols-7 border-b border-gray-200">
            {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(
              (day, index) => (
                <div
                  key={index}
                  className="text-center font-medium py-2 text-xs md:text-base"
                >
                  {day}
                </div>
              )
            )}
          </div>

          {/* 日历内容区域 - 可滚动 */}
          <div className="flex-1 overflow-auto">
            <div>
              {weeklyCalendarDays().map((week, weekIndex) => {
                // 计算这一周中最大事件数量
                const maxEventsInWeek = Math.max(
                  ...week.map((day) => getEventsForDate(day.date).length)
                );
                // 设置这一周的统一高度
                const weekHeight = Math.max(50, maxEventsInWeek * 60);

                return (
                  <div key={weekIndex} className="grid grid-cols-7">
                    {week.map((day, dayIndex) => {
                      const dateEvents = getEventsForDate(day.date);

                      return (
                        <div
                          key={dayIndex}
                          className={`
                            relative flex flex-col p-1 cursor-pointer 
                            ${
                              isToday(day.date)
                                ? "border-2 border-blue-500"
                                : "border border-gray-200"
                            }
                            ${
                              day.isCurrentMonth
                                ? "bg-white hover:bg-gray-100"
                                : "bg-gray-50 text-gray-400"
                            }
                            ${isSelected(day.date) ? "bg-blue-100" : ""}
                          `}
                          style={{ height: `${weekHeight}px` }}
                          onClick={() => setSelectedDate(day.date)}
                        >
                          <div className="text-center font-medium text-xs md:text-base">
                            {day.date.getDate()}
                          </div>

                          {/* 日期上的事件 - 增加移动端样式 */}
                          <div className="mt-1 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
                            {dateEvents.map((event) => (
                              <div
                                key={event.id}
                                className="text-white text-[10px] rounded-md px-1 py-1 cursor-pointer flex-col gap-1 justify-center items-center flex"
                                style={{ backgroundColor: event.color }}
                              >
                                <div className="w-full text-center">
                                  {event.name.length > 4
                                    ? `${event.name.substring(0, 4)}...`
                                    : event.name}
                                </div>
                                <div className="text-center w-full">
                                  {event.time}
                                </div>
                                <div className="text-center bg-white/30 rounded-md w-full">
                                  {event.nailArtist}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 底部导航栏 */}
      <div className="flex justify-between items-center px-2 py-3 w-full bg-pink-300 mt-auto">
        <div className="flex gap-2">
          <Button
            className="bg-blue-500 h-10 w-12 p-0"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button className="bg-blue-500 h-10 w-12 p-0" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* 年月选择对话框 */}
        <Dialog
          open={yearMonthDialogOpen}
          onOpenChange={setYearMonthDialogOpen}
        >
          <DialogTrigger asChild>
            <div
              className="text-xl md:text-lg font-medium px-3 py-1  rounded-md cursor-pointer "
              onClick={() => setYearMonthDialogOpen(true)}
            >
              <div className="flex items-center gap-1">
                {/* <Calendar className="h-4 w-4" /> */}
                {formatYearMonth(currentDate)}
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-green-300">
            <DialogHeader>
              <DialogTitle>选择年月</DialogTitle>
              <DialogDescription>请选择要跳转的年份和月份</DialogDescription>
            </DialogHeader>

            <div className="py-6 flex flex-col items-center gap-4">
              {/* 使用原生月份选择器 */}
              <input
                type="month"
                className="w-full p-1 text-lg rounded-full"
                value={`${yearInput}-${monthInput.padStart(2, "0")}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month] = e.target.value.split("-");
                    setYearInput(year);
                    setMonthInput(parseInt(month).toString());
                  }
                }}
              />

              {/* <div className="text-center text-lg font-bold">
                {yearInput}年{monthInput}月
              </div> */}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button type="button" onClick={jumpToYearMonth}>
                确定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex justify-between items-center gap-1">
          <Button className="px-1 bg-green-300 text-xs h-10" onClick={goToToday}>
            今天
          </Button>
          <Button className="px-1 bg-green-300 text-xs h-10" onClick={goToToday}>
            刷新
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="px-1 bg-green-300 text-xs h-10">菜单</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-green-300">
              <DialogHeader>
                <DialogTitle>日程设置</DialogTitle>
                <DialogDescription>
                  在这里更改您的日程设置。完成后点击保存。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    名称
                  </Label>
                  <Input
                    id="name"
                    defaultValue="我的日程"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="view" className="text-right">
                    默认视图
                  </Label>
                  <Input
                    id="view"
                    defaultValue="月视图"
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">保存更改</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

export default Scheduler;

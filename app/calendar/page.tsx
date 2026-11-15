"use client";
import {useServiceCatalog} from "@/lib/use-service-catalog";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import zhLocale from "@fullcalendar/core/locales/zh-cn";
import type { DatesSetArg, EventContentArg } from "@fullcalendar/core";
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flower2,
  LocateFixed,
  CalendarDays,
  Columns3,
  Rows3,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { adminApi } from "@/lib/admin-api";
import {
  useAdminSession,
  useCalendarRefresh,
} from "@/components/admin/AdminShell";
import { seoulDay } from "@/lib/studio/booking";
import "./calendar.css";

type Booking = {
  id: string;
  name: string | null;
  email?: string | null;
  provider?: string | null;
  date: string;
  timeSlot: string;
  nailArtist?: string | null;
  serviceType?: string;
  isClick?: boolean;
};
type View = "dayGridMonth" | "dayGridWeek" | "dayGridDay";
type Range = { start: string; end: string };
const views = [
  { value: "dayGridMonth", label: "月", icon: CalendarDays },
  { value: "dayGridWeek", label: "周", icon: Columns3 },
  { value: "dayGridDay", label: "日", icon: Rows3 },
] as const;

export default function CalendarPage() {
  const catalog=useServiceCatalog();
  const currentUser = useAdminSession();
  const { version: refreshVersion, setRefreshing } = useCalendarRefresh();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const requestSerial = useRef(0);
  const [compact, setCompact] = useState(false);
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<View>("dayGridMonth");
  const [closedWeekdays, setClosedWeekdays] = useState<number[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>();
  const [displayDate, setDisplayDate] = useState(seoulDay());
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const media = window.matchMedia("(max-width:767px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("calendarView");
    const mapping: Record<string, View> = {
      dayGridMonth: "dayGridMonth",
      dayGridWeek: "dayGridWeek",
      dayGridDay: "dayGridDay",
      timeGridWeek: "dayGridWeek",
      timeGridDay: "dayGridDay",
    };
    if (saved && mapping[saved])
      calendarRef.current?.getApi().changeView(mapping[saved]);
  }, []);

  const datesSet = useCallback((info: DatesSetArg) => {
    setCalendarView(info.view.type as View);
    localStorage.setItem("calendarView", info.view.type);
    const anchor = calendarRef.current?.getApi().getDate();
    if (anchor) setDisplayDate(anchor.toISOString().slice(0, 10));
    const start = info.startStr.slice(0, 10);
    const end = new Date(
      Date.parse(info.endStr.slice(0, 10) + "T00:00:00Z") - 86400000,
    )
      .toISOString()
      .slice(0, 10);
    setRange((previous) =>
      previous?.start === start && previous.end === end
        ? previous
        : { start, end },
    );
  }, []);

  useEffect(() => {
    if (!currentUser || !range) return;
    const controller = new AbortController();
    const serial = ++requestSerial.current;
    setLoading(true);
    setRefreshing(true);
    setError("");
    adminApi<{ message: Booking[]; closedWeekdays:number[] }>("/api/getNewReservation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: range.start, endDate: range.end }),
      signal: controller.signal,
    })
      .then((result) => {
        if (serial === requestSerial.current && !controller.signal.aborted) {
          setBookings(result.message || []);
          setClosedWeekdays(result.closedWeekdays);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(e.message || "预约加载失败，请刷新重试");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      controller.abort();
      setRefreshing(false);
    };
  }, [currentUser, range, reload, refreshVersion, setRefreshing]);

  const changeView = (value: string) => {
    if (views.some((view) => view.value === value))
      calendarRef.current?.getApi().changeView(value);
    setViewPickerOpen(false);
  };
  const openBooking = (id: string) => {
    setBookings((items) =>
      items.map((item) => (item.id === id ? { ...item, isClick: true } : item)),
    );
    void adminApi("/api/updateReservationClick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: id, isClick: true }),
    }).catch(() => toast.error("已读状态暂时未同步"));
    router.push(`/reservation/${id}`);
  };
  const events = bookings.map((booking) => ({
    id: booking.id,
    title: booking.name || "未知用户",
    date: booking.date.slice(0, 10),
    extendedProps: booking,
  }));
  const renderEvent = (info: EventContentArg) => {
    const booking = info.event.extendedProps as Booking;
    const provider = ["wechat", "google", "kakao"].includes(
      booking.provider || "",
    )
      ? booking.provider
      : "credentials";
    const service=catalog.find(s=>s.id===booking.serviceType);
    return (
      <button
        type="button"
        data-service={booking.serviceType} data-theme={service?.theme}
        className={`cal-booking provider-${provider} ${!booking.isClick ? "is-unread" : ""}`}
        onClick={() => openBooking(booking.id)}
        aria-label={`${booking.timeSlot} ${booking.name || "未知用户"}，${booking.nailArtist || "未分配"}，${service?.names.zh || booking.serviceType}${!booking.isClick ? "，新预约" : ""}`}
      >
        {!booking.isClick && (
          <span className="cal-new-badge" aria-hidden="true">
            NEW
          </span>
        )}
        <div className="cal-booking-top">
          <strong>{booking.name || "未知用户"}</strong>
          <time>{booking.timeSlot}</time>
        </div>
        <div className="cal-booking-contact">
          <span>{booking.email || "无联系方式"}</span>
          <small>{booking.id.slice(0, 6)}</small>
        </div>
        <div className="cal-booking-service">
          <span className="cal-assignee">
            {currentUser?.memberType === "manager" && booking.nailArtist
              ? `${booking.nailArtist} · `
              : ""}
          </span>
          <span className="cal-service-short">{(service?.names.zh || booking.serviceType || "服务").slice(0,1)}</span>
          <span className="cal-service-full">{service?.names.zh || booking.serviceType}</span>
        </div>
      </button>
    );
  };
  const month = displayDate.slice(0, 7);
  const shown =
    calendarView === "dayGridMonth"
      ? bookings.filter((booking) => booking.date.startsWith(month))
      : bookings;
  const unread = shown.filter((booking) => !booking.isClick).length;
  const rows =
    calendarView === "dayGridMonth" && range
      ? Math.max(
          1,
          Math.round(
            (Date.parse(range.end) - Date.parse(range.start) + 86400000) /
              604800000,
          ),
        )
      : 1;
  const directionLabel =
    calendarView === "dayGridMonth"
      ? ["上个月", "下个月"]
      : calendarView === "dayGridWeek"
        ? ["上一周", "下一周"]
        : ["前一天", "后一天"];
  const periodLabel =
    calendarView === "dayGridDay"
      ? `${Number(displayDate.slice(5, 7))}月${Number(displayDate.slice(8, 10))}日`
      : `${displayDate.slice(0, 4)}年${Number(displayDate.slice(5, 7))}月`;

  return (
    <div
      className="calendar-workspace"
      style={{ "--calendar-weeks": rows } as CSSProperties}
    >
      <h1 className="sr-only">
        {currentUser?.memberType === "manager"
          ? "全店预约日历"
          : `${currentUser?.nailArtistName || currentUser?.username}的预约日历`}
      </h1>
      {error && (
        <div className="admin-error" role="alert">
          {error}
          <button
            className="underline ml-2"
            onClick={() => setReload((value) => value + 1)}
          >
            重新加载
          </button>
        </div>
      )}
      <section className="admin-panel cal-panel" aria-label="预约日历">
        <div className="cal-toolbar">
          <div className="cal-arrows">
            <Button
              variant="outline"
              size="icon"
              aria-label={directionLabel[0]}
              title={directionLabel[0]}
              onClick={() => calendarRef.current?.getApi().prev()}
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={directionLabel[1]}
              title={directionLabel[1]}
              onClick={() => calendarRef.current?.getApi().next()}
            >
              <ChevronRight size={17} />
            </Button>
          </div>
          <MonthPicker
            value={month}
            onChange={(value) =>
              calendarRef.current?.getApi().gotoDate(value + "-01")
            }
            ariaLabel="选择年月"
            className="cal-period-button"
            triggerContent={
              <>
                <span className="cal-period-title">
                  {periodLabel}
                  <ChevronDown size={12} />
                </span>
                <span className="cal-period-count" role="status">
                  {loading ? "同步中…" : `${shown.length} 个预约`}
                </span>
              </>
            }
          />
          <div className="cal-actions">
            <Button
              variant="outline"
              className="cal-today"
              aria-label="回到今天"
              title="回到今天"
              onClick={() => calendarRef.current?.getApi().gotoDate(seoulDay())}
            >
              <LocateFixed className="cal-today-icon" size={18} />
              <span>今天</span>
            </Button>
            <div
              className="cal-view-segments admin-section-tabs"
              role="group"
              aria-label="日历视图"
            >
              {views.map((view) => (
                <button
                  key={view.value}
                  type="button"
                  aria-pressed={calendarView === view.value}
                  onClick={() => changeView(view.value)}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div className="cal-mobile-view">
              <Popover open={viewPickerOpen} onOpenChange={setViewPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="切换日历视图"
                    title="切换日历视图"
                  >
                    {calendarView === "dayGridMonth" ? (
                      <CalendarDays size={18} />
                    ) : calendarView === "dayGridWeek" ? (
                      <Columns3 size={18} />
                    ) : (
                      <Rows3 size={18} />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  sideOffset={12}
                  className="cal-view-popover"
                >
                  <p>查看方式</p>
                  <div
                    className="cal-view-options"
                    role="group"
                    aria-label="日历视图"
                  >
                    {views.map((view) => (
                      <button
                        type="button"
                        key={view.value}
                        className="cal-view-option"
                        aria-pressed={calendarView === view.value}
                        onClick={() => changeView(view.value)}
                      >
                        <view.icon size={21} strokeWidth={1.7} />
                        <span>{view.label}视图</span>
                        {calendarView === view.value && (
                          <Check size={12} className="cal-view-check" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <div
          className={`cal-calendar ${calendarView === "dayGridDay" ? "is-day" : ""}`}
          aria-busy={loading}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            locale={zhLocale}
            initialView="dayGridMonth"
            initialDate={seoulDay()}
            timeZone="UTC"
            now={() => new Date(Date.now() + 9 * 3600000).toISOString()}
            headerToolbar={false}
            weekends
            datesSet={datesSet}
            events={events}
            eventOrder="start,timeSlot,nailArtist,id"
            eventOrderStrict
            eventContent={renderEvent}
            dayCellContent={(info) => {
              const date = info.date;
              const closed = date.toISOString().slice(0,10) >= seoulDay() && closedWeekdays.includes(date.getUTCDay());
              return <>{info.dayNumberText.replace(/日$/, "")}{closed && <small className="cal-weekly-closed" aria-label="全店固定休息">休</small>}</>;
            }}
            height={compact ? "100%" : "auto"}
            contentHeight={compact ? undefined : "auto"}
            fixedWeekCount={false}
            dayMaxEventRows={false}
            dayMaxEvents={false}
            dayHeaderFormat={{ weekday: "short" }}
          />
        </div>
        <div className="cal-summary">
          <span>
            <Flower2 size={13} />
            {currentUser?.memberType === "manager"
              ? "全店预约"
              : `${currentUser?.nailArtistName || currentUser?.username}的预约`}
            <i />
            韩国时间
          </span>
          <span className="cal-unread-summary">
            <b />
            {unread} 个未查看
          </span>
        </div>
      </section>
    </div>
  );
}

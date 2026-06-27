"use client";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

type StatRow = {
  month: string;
  nailArtistId: string | null;
  currency: string | null;
  count: number;
  pricedCount: number;
  revenue: number;
};

type Artist = { id: string; name: string };

type Overview = {
  month: string;
  daily: { day: string; count: number; revenue: number }[];
  byPayment: { method: string; count: number }[];
  byTimeSlot: { slot: string; count: number }[];
  summary: { count: number; pricedCount: number; revenue: number };
  prev: { count: number; revenue: number };
};

const LINE_COLORS = [
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#d946ef",
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: "现金",
  memberCard: "会员卡",
  wechat: "微信",
  alipay: "支付宝",
  card: "刷卡",
  unknown: "未知",
};

const PAYMENT_COLORS = ["#ec4899", "#8b5cf6", "#3b82f6", "#f59e0b", "#10b981", "#94a3b8"];

const formatNumber = (n: number) => n.toLocaleString();

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function StatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    memberType: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // tab：overview（本月看板，默认） / trends（趋势）
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<string>(
    tabParam === "trends" ? "trends" : "overview"
  );

  const onTabChange = useCallback(
    (v: string) => {
      setTab(v);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("tab", v);
      router.replace(`/dashboard/stats?${params.toString()}`);
    },
    [router, searchParams]
  );

  // 鉴权
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
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.memberType !== "manager") {
        toast.error("只有经理才能访问数据看板");
        router.push("/");
      } else {
        setIsLoading(false);
      }
    }
  }, [currentUser, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-pink-600 text-lg font-medium">正在验证访问权限...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 px-3 sm:px-4 py-4 sm:py-6">
      <div className="max-w-5xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-white/80 text-pink-600 hover:bg-white rounded-xl shadow-sm border border-pink-200 px-3"
          >
            ← 返回
          </Button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-pink-600">
            数据看板
          </h1>
          <div className="w-[68px]" />
        </div>

        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList className="mb-4 sm:mb-6">
            <TabsTrigger value="overview">单月看板</TabsTrigger>
            <TabsTrigger value="trends">历史趋势</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="trends">
            <TrendsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ============== 单月看板 ============== */
function OverviewTab() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  // 选中的月份，默认本月
  const [month, setMonth] = useState<string>(currentMonthStr());

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/getMonthlyOverview?month=${month}`);
        const data = await res.json();
        if (data.success) {
          setOverview(data);
        } else {
          toast.error("获取单月数据失败");
        }
      } catch (error) {
        console.error("获取单月数据失败:", error);
        toast.error("获取单月数据出错");
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [month]);

  const momPct = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;

  // 月份选择器（始终显示，便于切换月份）
  const monthPicker = (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm border border-pink-200 flex flex-wrap items-center gap-2 sm:gap-3">
      <span className="text-pink-600 font-bold text-sm">选择月份</span>
      <MonthPicker
        value={month}
        max={currentMonthStr()}
        onChange={(v) => setMonth(v)}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {monthPicker}
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-pink-600">加载单月数据中...</p>
        </div>
      </div>
    );
  }

  if (!overview || overview.summary.count === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {monthPicker}
        <div className="text-center py-20 text-pink-400">该月暂无预约数据</div>
      </div>
    );
  }

  const { summary, prev, daily, byPayment } = overview;
  const avgPrice =
    summary.pricedCount > 0
      ? Math.round(summary.revenue / summary.pricedCount)
      : 0;
  const countMoM = momPct(summary.count, prev.count);
  const revMoM = momPct(summary.revenue, prev.revenue);

  // 每日趋势：补齐当月每一天（缺的天补 0）
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dailyMap = new Map(daily.map((d) => [d.day, d]));
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const key = `${month}-${String(dayNum).padStart(2, "0")}`;
    const found = dailyMap.get(key);
    return {
      day: String(dayNum),
      预约数: found ? found.count : 0,
    };
  });

  const totalPayments = byPayment.reduce((s, p) => s + p.count, 0);
  const paymentData = byPayment
    .map((p) => ({
      name: PAYMENT_LABELS[p.method] || p.method,
      value: p.count,
      pct: totalPayments > 0 ? Math.round((p.count / totalPayments) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // 时间段分布：按 "10:00" 这种时间点排序
  const timeSlotData = [...overview.byTimeSlot]
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((t) => ({ slot: t.slot, 预约数: t.count }));
  const busiestSlot =
    timeSlotData.length > 0
      ? timeSlotData.reduce((max, t) =>
          t.预约数 > max.预约数 ? t : max
        )
      : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {monthPicker}

      {/* 核心数字卡 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={`${month} 预约数`}
          value={String(summary.count)}
          mom={countMoM}
        />
        <StatCard
          label="营收（KRW）"
          value={formatNumber(summary.revenue)}
          mom={revMoM}
        />
        <StatCard label="客单价（KRW）" value={formatNumber(avgPrice)} />
        <StatCard
          label="已收款单数"
          value={`${summary.pricedCount}/${summary.count}`}
        />
      </div>

      {/* 每日预约趋势 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm border border-pink-200">
        <h2 className="text-base sm:text-lg font-bold text-pink-600 mb-3">
          本月每日预约
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
            <Tooltip
              labelFormatter={(v) => `${m}月${v}日`}
              formatter={(v) => [`${v} 个`, "预约数"]}
            />
            <Bar dataKey="预约数" fill="#ec4899" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 时间段分布 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm border border-pink-200">
        <h2 className="text-base sm:text-lg font-bold text-pink-600 mb-1">
          时间段分布
        </h2>
        <p className="text-pink-400 text-xs mb-3">
          {busiestSlot
            ? `本月最火时段：${busiestSlot.slot}（${busiestSlot.预约数} 个）`
            : "本月哪个时间点来的人最多"}
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={timeSlotData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
            <XAxis dataKey="slot" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
            <Tooltip formatter={(v) => [`${v} 个`, "预约数"]} />
            <Bar dataKey="预约数" radius={[6, 6, 0, 0]}>
              {timeSlotData.map((t, i) => (
                <Cell
                  key={t.slot}
                  fill={
                    busiestSlot && t.slot === busiestSlot.slot
                      ? "#db2777"
                      : LINE_COLORS[i % LINE_COLORS.length]
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 支付方式占比（横向条形图，避免现金占比过大时标签重叠） */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm border border-pink-200">
        <h2 className="text-base sm:text-lg font-bold text-pink-600 mb-3">
          支付方式占比
        </h2>
        <ResponsiveContainer width="100%" height={Math.max(160, paymentData.length * 48)}>
          <BarChart
            data={paymentData}
            layout="vertical"
            margin={{ left: 8, right: 48 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={56}
            />
            <Tooltip
              formatter={(v, _n, item) => [
                `${v} 个（${item?.payload?.pct ?? 0}%）`,
                "笔数",
              ]}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {paymentData.map((_, i) => (
                <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  mom,
}: {
  label: string;
  value: string;
  mom?: number | null;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm border border-pink-200">
      <p className="text-pink-400 text-[11px] sm:text-xs mb-1 truncate">
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold text-pink-600 break-all">
        {value}
      </p>
      {mom != null && (
        <p
          className={`text-[11px] sm:text-xs mt-1 ${
            mom >= 0 ? "text-green-500" : "text-red-500"
          }`}
        >
          环比 {mom >= 0 ? "↑" : "↓"} {Math.abs(mom)}%
        </p>
      )}
    </div>
  );
}

/* ============== 历史趋势 ============== */
function TrendsTab() {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [artistMetric, setArtistMetric] = useState<"count" | "revenue">(
    "count"
  );
  const [startMonth, setStartMonth] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/getReservationStats");
        const data = await res.json();
        if (data.success) {
          setRows(data.rows);
          setArtists(data.artists);
          const allM = Array.from(
            new Set((data.rows as StatRow[]).map((r) => r.month))
          ).sort();
          if (allM.length > 0) {
            const cur = currentMonthStr();
            const latest = allM[allM.length - 1];
            const end = cur <= latest ? cur : latest;
            const endIdx = allM.indexOf(end);
            const refIdx = endIdx >= 0 ? endIdx : allM.length - 1;
            setEndMonth(end);
            setStartMonth(allM[Math.max(0, refIdx - 5)]);
          }
        } else {
          toast.error("获取趋势数据失败");
        }
      } catch (error) {
        console.error("获取趋势数据失败:", error);
        toast.error("获取趋势数据出错");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const allMonths = useMemo(() => {
    const set = new Set(rows.map((r) => r.month));
    return Array.from(set).sort();
  }, [rows]);

  const months = useMemo(() => {
    if (!startMonth || !endMonth) return allMonths;
    return allMonths.filter((m) => m >= startMonth && m <= endMonth);
  }, [allMonths, startMonth, endMonth]);

  // 每月客流量
  const trafficData = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      map[r.month] = (map[r.month] || 0) + r.count;
    });
    return months.map((m) => ({ month: m, 客流量: map[m] || 0 }));
  }, [rows, months]);

  // 每月 KRW 营收
  const revenueData = useMemo(() => {
    return months.map((m) => {
      const revenue = rows
        .filter((r) => r.month === m && r.currency === "KRW")
        .reduce((s, r) => s + r.revenue, 0);
      return { month: m, 营收: revenue };
    });
  }, [rows, months]);

  // 每月客单价（KRW）
  const avgPriceData = useMemo(() => {
    return months.map((m) => {
      let revenue = 0;
      let priced = 0;
      rows
        .filter((r) => r.month === m && r.currency === "KRW")
        .forEach((r) => {
          revenue += r.revenue;
          priced += r.pricedCount;
        });
      return { month: m, 客单价: priced > 0 ? Math.round(revenue / priced) : 0 };
    });
  }, [rows, months]);

  // 按美甲师拆分
  const artistData = useMemo(() => {
    return months.map((m) => {
      const point: Record<string, number | string> = { month: m };
      artists.forEach((a) => {
        point[a.name] = 0;
      });
      rows
        .filter((r) => r.month === m && r.nailArtistId)
        .forEach((r) => {
          const artist = artists.find((a) => a.id === r.nailArtistId);
          if (!artist) return;
          const val =
            artistMetric === "count"
              ? r.count
              : r.currency === "KRW"
              ? r.revenue
              : 0;
          point[artist.name] = (point[artist.name] as number) + val;
        });
      return point;
    });
  }, [rows, months, artists, artistMetric]);

  const avgOf = (data: { [k: string]: number | string }[], key: string) => {
    if (data.length === 0) return 0;
    const sum = data.reduce((s, d) => s + (d[key] as number), 0);
    return Math.round(sum / data.length);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-pink-600">加载趋势数据中...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="text-center py-20 text-pink-400">暂无预约数据</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 时间范围过滤（日历式月份选择器） */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm border border-pink-200 flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-pink-600 font-bold text-sm">时间范围</span>
        <MonthPicker
          value={startMonth}
          max={endMonth || undefined}
          onChange={(v) => {
            setStartMonth(v);
            if (endMonth && v > endMonth) setEndMonth(v);
          }}
        />
        <span className="text-pink-400">到</span>
        <MonthPicker
          value={endMonth}
          min={startMonth || undefined}
          onChange={(v) => {
            setEndMonth(v);
            if (startMonth && v < startMonth) setStartMonth(v);
          }}
        />
        <span className="text-pink-400 text-xs w-full sm:w-auto sm:ml-auto">
          共 {months.length} 个月
        </span>
      </div>

      {/* 每月客流量 */}
      <ChartCard title="每月客流量（预约数）">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
            <Tooltip />
            <ReferenceLine
              y={avgOf(trafficData, "客流量")}
              stroke="#f472b6"
              strokeDasharray="6 4"
              label={{
                value: `平均 ${avgOf(trafficData, "客流量")}`,
                position: "insideTopRight",
                fill: "#db2777",
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="客流量"
              stroke="#ec4899"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 每月营收（KRW） */}
      <ChartCard title="每月营收（KRW）" subtitle="仅含已填价格的预约">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              width={48}
              tickFormatter={(v) => formatNumber(v as number)}
            />
            <Tooltip formatter={(v) => formatNumber(v as number)} />
            <ReferenceLine
              y={avgOf(revenueData, "营收")}
              stroke="#8b5cf6"
              strokeDasharray="6 4"
              label={{
                value: `平均 ${formatNumber(avgOf(revenueData, "营收"))}`,
                position: "insideTopRight",
                fill: "#7c3aed",
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="营收"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 每月客单价 */}
      <ChartCard title="每月客单价（KRW）" subtitle="营收 ÷ 已填价格预约数">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={avgPriceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              width={48}
              tickFormatter={(v) => formatNumber(v as number)}
            />
            <Tooltip formatter={(v) => formatNumber(v as number)} />
            <ReferenceLine
              y={avgOf(avgPriceData, "客单价")}
              stroke="#a78bfa"
              strokeDasharray="6 4"
              label={{
                value: `平均 ${formatNumber(avgOf(avgPriceData, "客单价"))}`,
                position: "insideTopRight",
                fill: "#7c3aed",
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="客单价"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 按美甲师拆分 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm border border-pink-200">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base sm:text-lg font-bold text-pink-600">
            按美甲师拆分
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setArtistMetric("count")}
              className={`rounded-lg px-3 py-1 text-sm ${
                artistMetric === "count"
                  ? "bg-pink-500 text-white"
                  : "bg-pink-100 text-pink-600 hover:bg-pink-200"
              }`}
            >
              客流量
            </Button>
            <Button
              onClick={() => setArtistMetric("revenue")}
              className={`rounded-lg px-3 py-1 text-sm ${
                artistMetric === "revenue"
                  ? "bg-pink-500 text-white"
                  : "bg-pink-100 text-pink-600 hover:bg-pink-200"
              }`}
            >
              营收（KRW）
            </Button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={artistData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              allowDecimals={false}
              width={40}
              tickFormatter={(v) => formatNumber(v as number)}
            />
            <Tooltip formatter={(v) => formatNumber(v as number)} />
            <Legend />
            {artists.map((a, i) => (
              <Line
                key={a.id}
                type="monotone"
                dataKey={a.name}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 shadow-sm border border-pink-200">
      <h2 className="text-base sm:text-lg font-bold text-pink-600 mb-1">
        {title}
      </h2>
      {subtitle && <p className="text-pink-400 text-xs mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

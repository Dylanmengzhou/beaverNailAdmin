"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

type MonthPickerProps = {
  value: string; // YYYY-MM
  onChange: (v: string) => void;
  min?: string; // YYYY-MM
  max?: string; // YYYY-MM
  className?: string;
};

export function MonthPicker({
  value,
  onChange,
  min,
  max,
  className,
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  // 面板当前显示的年份
  const initialYear = value ? Number(value.split("-")[0]) : 2026;
  const [viewYear, setViewYear] = React.useState(initialYear);

  React.useEffect(() => {
    if (value) setViewYear(Number(value.split("-")[0]));
  }, [value]);

  const selYear = value ? Number(value.split("-")[0]) : null;
  const selMonth = value ? Number(value.split("-")[1]) : null;

  const isDisabled = (year: number, month: number) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (min && key < min) return true;
    if (max && key > max) return true;
    return false;
  };

  const handleSelect = (month: number) => {
    const key = `${viewYear}-${String(month).padStart(2, "0")}`;
    onChange(key);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2 rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm font-medium text-pink-700 shadow-sm transition-colors hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-300 ${
            className ?? ""
          }`}
        >
          <CalendarDays className="size-4 text-pink-400" />
          {value || "选择月份"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        {/* 年份切换 */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            className="flex size-8 items-center justify-center rounded-lg text-pink-500 hover:bg-pink-100"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="font-bold text-pink-600">{viewYear} 年</span>
          <button
            type="button"
            onClick={() => setViewYear((y) => y + 1)}
            className="flex size-8 items-center justify-center rounded-lg text-pink-500 hover:bg-pink-100"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* 12 个月格子 */}
        <div className="grid grid-cols-3 gap-2">
          {MONTH_LABELS.map((label, i) => {
            const month = i + 1;
            const disabled = isDisabled(viewYear, month);
            const selected = selYear === viewYear && selMonth === month;
            return (
              <button
                key={month}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(month)}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md"
                    : disabled
                    ? "cursor-not-allowed text-pink-200"
                    : "text-pink-600 hover:bg-pink-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

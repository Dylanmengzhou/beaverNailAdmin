"use client";

import * as React from "react";
import {Button} from "@/components/ui/button";
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
  triggerContent?: React.ReactNode;
  ariaLabel?: string;
};

export function MonthPicker({
  value,
  onChange,
  min,
  max,
  className,
  triggerContent,
  ariaLabel,
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
        <Button variant="ghost"
          type="button"
          aria-label={ariaLabel}
          className={`admin-month-trigger ${
            className ?? ""
          }`}
        >
          {triggerContent ?? (
            <>
              <CalendarDays className="size-4" />
              {value || "选择月份"}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="admin-month-popover w-64">
        {/* 年份切换 */}
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost"
            type="button"
            aria-label="上一年"
            onClick={() => setViewYear((y) => y - 1)}
            className="admin-month-year-arrow"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="admin-month-year">{viewYear} 年</span>
          <Button variant="ghost"
            type="button"
            aria-label="下一年"
            onClick={() => setViewYear((y) => y + 1)}
            className="admin-month-year-arrow"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* 12 个月格子 */}
        <div className="grid grid-cols-3 gap-2">
          {MONTH_LABELS.map((label, i) => {
            const month = i + 1;
            const disabled = isDisabled(viewYear, month);
            const selected = selYear === viewYear && selMonth === month;
            return (
              <Button variant="ghost"
                key={month}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(month)}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "admin-month-selected"
                    : disabled
                      ? "cursor-not-allowed opacity-40"
                      : "admin-month-option"
                }`}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

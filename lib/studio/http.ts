import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BookingError } from "./booking-db";
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        success: false,
        error: error.issues.map((i) => i.message).join("；"),
        message: "请检查输入内容",
      },
      { status: 400 },
    );
  if (error instanceof BookingError)
    return NextResponse.json(
      { success: false, error: error.message, message: error.message },
      { status: error.status },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  )
    return NextResponse.json(
      {
        success: false,
        error: "预约时间冲突或名称重复，请刷新后重试",
        message: "预约时间冲突或名称重复，请刷新后重试",
      },
      { status: 409 },
    );
  console.error(
    "Studio API failed",
    error instanceof Error ? error.message : error,
  );
  return NextResponse.json(
    {
      success: false,
      error: "服务暂不可用，请稍后重试",
      message: "服务暂不可用，请稍后重试",
    },
    { status: 503 },
  );
}

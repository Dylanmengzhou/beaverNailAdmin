import type { NailArtist, Reservation, User } from "@prisma/client";
import { dateKey } from "./booking";
import { serviceName } from "./booking-db";
export const escapeHTML = (value: unknown) =>
  String(value ?? "未设置")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
export function reservationMessage(
  action: string,
  reservation: Pick<
    Reservation,
    | "id"
    | "date"
    | "timeSlot"
    | "durationMinutes"
    | "serviceType"
    | "referenceImageIds"
    | "customerRequest"
    | "note"
  >,
  user: Pick<User, "name" | "email" | "contactType" | "customerNote">,
  artist: Pick<NailArtist, "name"> | null,
) {
  return `<b>${escapeHTML(action)}</b>\n👤 顾客姓名: ${escapeHTML(user.name)}\n💻 联系类型: ${escapeHTML(user.contactType)}\n☎️ 联系方式: ${escapeHTML(user.email)}\n🗓 预约日期: ${dateKey(reservation.date)}\n⌛️ 预约时间: ${reservation.timeSlot}（${reservation.durationMinutes} 分钟）\n✨ 预约业务: ${serviceName(reservation.serviceType)}\n👩‍🎤 服务员工: ${escapeHTML(artist?.name)}\n🆔 预约号码: ${reservation.id}\n📝 顾客长期备注: ${escapeHTML(user.customerNote || "无")}\n📌 本次预约备注: ${escapeHTML(reservation.note || "无")}\n💬 顾客本次需求: ${escapeHTML(reservation.customerRequest || "无")}\n🖼 参考图片: ${reservation.referenceImageIds.length} 张（管理端预约详情可查看）`;
}
export function telegramChunks(text: string) {
  const [heading, ...lines] = text.split("\n");
  const chunks: string[] = [];
  let chunk = heading + "\n";
  // Escaped entities stay intact, and Unicode code points are never cut in half.
  for (const token of lines.join("\n").match(/&(?:amp|lt|gt|quot);|[\s\S]/gu) ||
    []) {
    if (chunk.length + token.length > 3800) {
      chunks.push(chunk);
      chunk = "<b>预约通知（续）</b>\n";
    }
    chunk += token;
  }
  chunks.push(chunk);
  return chunks;
}
export async function sendTelegram(text: string) {
  if (!process.env.TELEGRAM_API || !process.env.TELEGRAM_CHAT_ID) return false;
  try {
    for (const chunk of telegramChunks(text)) {
      const response = await fetch(process.env.TELEGRAM_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          parse_mode: "HTML",
          text: chunk,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok || !(await response.json()).ok)
        throw new Error("Telegram rejected notification");
    }
    return true;
  } catch (error) {
    console.error("预约已保存，Telegram 通知失败", error);
    return false;
  }
}

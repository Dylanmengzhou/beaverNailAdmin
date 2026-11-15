import { BookingError } from "./booking-db";
export async function imageBytes(file: File) {
  if (!file.size || file.size > 4 * 1024 * 1024)
    throw new BookingError("请选择 4MB 以内的 JPG、PNG 或 WebP 图片");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (n, i) => bytes[i] === n,
  );
  const isWebp =
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  const mimeType = isJpeg
    ? "image/jpeg"
    : isPng
      ? "image/png"
      : isWebp
        ? "image/webp"
        : null;
  if (!mimeType || mimeType !== file.type)
    throw new BookingError("图片格式无效，仅支持 JPG、PNG、WebP");
  return { data: bytes, mimeType };
}

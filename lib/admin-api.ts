import { adminFetch } from "./admin-fetch";
export async function adminApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await adminFetch(url, init);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("服务暂时不可用，请稍后重试");
  }
  if (!response.ok)
    throw new Error(result.error || result.message || "操作失败，请重试");
  return result;
}

export function handleExpiredAdminSession(url: URL, status: number) {
  if (
    status !== 401 ||
    url.origin !== window.location.origin ||
    !url.pathname.startsWith("/api/") ||
    url.pathname === "/api/auth/login"
  ) return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("calendarDataCache");
  if (window.location.pathname !== "/") window.location.replace("/");
}

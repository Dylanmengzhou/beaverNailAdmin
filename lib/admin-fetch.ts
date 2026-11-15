export function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(
    input instanceof Request ? input.headers : undefined,
  );
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  const url = new URL(
    input instanceof Request ? input.url : String(input),
    window.location.origin,
  );
  const token = localStorage.getItem("accessToken");
  if (
    token &&
    url.origin === window.location.origin &&
    url.pathname.startsWith("/api/")
  )
    headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

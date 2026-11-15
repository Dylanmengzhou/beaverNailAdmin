import test from "node:test";
import assert from "node:assert/strict";
import { handleExpiredAdminSession } from "../lib/admin-session";

test("expired admin sessions return to login without treating permission errors as logout", () => {
  const removed: string[] = [];
  const redirects: string[] = [];
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location: { origin: "https://admin.example", pathname: "/calendar", replace: (path: string) => redirects.push(path) },
  }});
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { removeItem: (key: string) => removed.push(key) }});
  try {
    handleExpiredAdminSession(new URL("https://admin.example/api/auth/login"), 401);
    handleExpiredAdminSession(new URL("https://other.example/api/studio/content"), 401);
    handleExpiredAdminSession(new URL("https://admin.example/api/studio/content"), 403);
    assert.equal(removed.length, 0);
    assert.equal(redirects.length, 0);
    handleExpiredAdminSession(new URL("https://admin.example/api/studio/content"), 401);
    assert.deepEqual(removed, ["accessToken", "refreshToken", "calendarDataCache"]);
    assert.deepEqual(redirects, ["/"]);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

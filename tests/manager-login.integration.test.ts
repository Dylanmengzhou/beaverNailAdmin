import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
if (database.host !== "127.0.0.1:55432" || !/^\/beaver_(?:studio|settlement)_test(?:_[a-z0-9_]+)?$/.test(database.pathname))
  throw new Error("Manager login tests require the isolated local database");
const endpoint = (process.env.STUDIO_TEST_ADMIN_ORIGIN||"http://127.0.0.1:3001")+"/api/auth/login";
const login = (body: unknown) => fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
test("manager login rejects malformed credentials and incorrect passwords", async () => {
  for (const body of [null, {}, { username: {}, password: "anything" }, { username: "beavernail", password: "" }])
    assert.equal((await login(body)).status, 400);
  assert.equal((await login({ username: "beavernail", password: "wrong-password-for-regression" })).status, 401);
});
test("configured manager login returns signed manager access and refresh tokens", { skip: !process.env.STUDIO_TEST_MANAGER_PASSWORD }, async () => {
  const response = await login({ username: "beavernail", password: process.env.STUDIO_TEST_MANAGER_PASSWORD });
  assert.equal(response.status, 200);
  const data = await response.json();
  for (const token of [data.accessToken, data.refreshToken]) {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    assert.equal(payload.id, "beavernail-id"); assert.equal(payload.memberType, "manager");
  }
});

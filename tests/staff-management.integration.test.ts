import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
if (!["127.0.0.1", "localhost"].includes(database.hostname) || database.pathname !== "/"+(process.env.STUDIO_TEST_DB_NAME||"beaver_studio_test"))
  throw new Error("Employee tests require the isolated local test database.");
const db = new PrismaClient();
const prefix = "staff_wall_test_" + Date.now();
const base = process.env.STUDIO_TEST_ADMIN_ORIGIN||"http://127.0.0.1:3001";
const token = jwt.sign({ id: "beavernail-id",username:"beavernail",memberType: "manager" }, process.env.JWT_SECRET!, { expiresIn: "5m" });
const employeeToken = jwt.sign({ id: prefix + "_employee", memberType: "staff" }, process.env.JWT_SECRET!, { expiresIn: "5m" });
const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
const schedule = [{ days: [0, 1, 2, 3, 4, 5, 6], start: "10:00", end: "16:00" }];
const employee = {
  name: prefix + "_name", role: "L2", account: prefix + "_account",
  password: "test-password-only-123", services: ["nails", "makeup"],
  active: true, durationMinutes: 120, schedule,
};
let id = "";
before(async()=>{await db.nailArtist.create({data:{id:prefix+"_employee",name:prefix+"_auth",membertype:"staff"}});});
after(async () => {
  const items = await db.nailArtist.findMany({ where: { name: { startsWith: prefix } }, select: { id: true } });
  await db.reservation.deleteMany({ where: { nailArtistId: { in: items.map((item) => item.id) } } });
  await db.nailArtist.deleteMany({ where: { name: { startsWith: prefix } } });
  await db.user.deleteMany({ where: { id: prefix + "_customer" } });
  await db.$disconnect();
});
const save = (value: unknown) => fetch(base + "/api/studio/staff", { method: "PUT", headers, body: JSON.stringify(value) });

test("unified employee account and schedule lifecycle", async (t) => {
  await t.test("creation requires account and password without partial employees", async () => {
    const withoutLogin = { ...employee, account: undefined, password: undefined };
    const response = await save(withoutLogin);
    assert.equal(response.status, 400);
    assert.equal(await db.nailArtist.count({ where: { name: employee.name } }), 0);
  });
  await t.test("one save creates account, services, grade and schedule", async () => {
    const response = await save(employee);
    assert.equal(response.status, 200);
    const value = await response.json();
    id = value.id;
    assert.ok(id);
    assert.equal(value.password, undefined);
    assert.equal(value.account, employee.account);
    assert.equal(value.role, "L2");
    assert.deepEqual(value.services, ["nails", "makeup"]);
    assert.deepEqual(value.schedule, schedule);
  });
  await t.test("only manager employee detail reveals the configured password", async () => {
    const listing = await fetch(base + "/api/studio/staff", { headers });
    const items = await listing.json();
    assert.ok(items.every((item: { password?: unknown }) => item.password === undefined));
    const detail = await fetch(base + "/api/studio/staff?id=" + id, { headers });
    const value = await detail.json();
    assert.equal(value.account, employee.account);
    assert.equal(value.password, employee.password);
    assert.match(detail.headers.get("cache-control") || "", /no-store/);
    assert.equal((await fetch(base + "/api/studio/staff?id=" + id, {
      headers: { Authorization: "Bearer " + employeeToken },
    })).status, 403);
    assert.equal((await fetch(base + "/api/studio/staff?id=" + id)).status, 401);
  });
  await t.test("duplicate and reserved accounts are rejected atomically", async () => {
    assert.equal((await save({ ...employee, name: prefix + "_duplicate" })).status, 409);
    assert.equal((await save({ ...employee, name: prefix + "_reserved", account: "beavernail" })).status, 409);
    assert.equal(await db.nailArtist.count({ where: { name: { in: [prefix + "_duplicate", prefix + "_reserved"] } } }), 0);
  });
  await t.test("account and password can be edited with schedule and used to log in", async () => {
    const changed = { ...employee, id, account: prefix + "_changed", password: "changed-test-only-456", durationMinutes: 90, role: "L1" };
    const response = await save(changed);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).password, undefined);
    const loggedIn = await fetch(base + "/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: changed.account, password: changed.password }),
    });
    assert.equal(loggedIn.status, 200);
    const session = await loggedIn.json();
    const claims = jwt.verify(session.accessToken, process.env.JWT_SECRET!) as jwt.JwtPayload;
    assert.equal(claims.id, id);
    assert.equal(claims.memberType, "staff");
    const scheduleOnly = { ...changed, password: undefined };
    assert.equal((await save(scheduleOnly)).status, 200);
    assert.equal((await db.nailArtist.findUnique({ where: { id } }))?.password, changed.password);
    assert.equal((await save({ ...changed, account: "" })).status, 400);
    assert.equal((await save({ ...changed, password: "" })).status, 400);
  });
  await t.test("existing appointments protect an employee from removal", async () => {
    await db.user.create({ data: { id: prefix + "_customer", name: "test-only", provider: "credentials" } });
    await db.reservation.create({ data: {
      userId: prefix + "_customer", nailArtistId: id,
      date: new Date("2032-01-06"), timeSlot: "10:00", serviceType: "makeup", durationMinutes: 90,
    } });
    const response = await fetch(base + "/api/studio/staff?id=" + id, { method: "DELETE", headers });
    assert.equal(response.status, 409);
    assert.ok(await db.nailArtist.findUnique({ where: { id } }));
    assert.equal(await db.reservation.count({ where: { nailArtistId: id } }), 1);
    await db.reservation.deleteMany({ where: { nailArtistId: id } });
  });
  await t.test("management permission is editable independently of employee grade", async () => {
    const stored=await db.nailArtist.findUniqueOrThrow({where:{id}});
    const roleBefore=stored.role;
    const promoted=await save({...employee,id,account:stored.account,password:undefined,role:roleBefore,membertype:"manager"});
    assert.equal(promoted.status,200);
    assert.equal((await promoted.json()).role,roleBefore);
    const session=jwt.sign({id,username:stored.account,memberType:"staff"},process.env.JWT_SECRET!,{expiresIn:"5m"});
    assert.equal((await fetch(base+"/api/studio/staff",{headers:{Authorization:"Bearer "+session}})).status,200);
    assert.equal((await save({...employee,id,account:stored.account,password:undefined,role:roleBefore,membertype:"staff"})).status,200);
    assert.equal((await fetch(base+"/api/studio/staff",{headers:{Authorization:"Bearer "+session}})).status,403);
  });
  await t.test("legacy account URLs lead into the employee wall", async () => {
    for (const [path, destination] of [
      ["/dashboard/registerNailArtist", "/dashboard/studio?tab=staff&staff=new"],
      ["/dashboard/deleteNailArtist", "/dashboard/studio?tab=staff"],
    ]) {
      const response = await fetch(base + path, { redirect: "manual" });
      if (response.status === 307)
        assert.equal(response.headers.get("location"), destination);
      else {
        // A redirect after the root Suspense boundary starts streaming is sent in HTML.
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.ok(
          html.includes(destination) ||
          html.includes(destination.replaceAll("&", "&amp;")) ||
          html.includes(destination.replaceAll("&", "\\u0026")),
        );
      }
    }
  });
  await t.test("legacy registration creates one unified employee; removal uses the same protection", async () => {
    const response = await fetch(base + "/api/registerNailArtist", {
      method: "POST", headers, body: JSON.stringify({ name: prefix + "_legacy", role: "L4", account: prefix + "_legacy_login", password: "legacy-test-only-789" }),
    });
    assert.equal(response.status, 201);
    const { artist } = await response.json();
    assert.ok(artist.id);
    assert.deepEqual(artist.services, ["nails"]);
    assert.equal(artist.password, undefined);
    assert.equal((await fetch(base + "/api/nailArtists/" + artist.id, { method: "DELETE", headers })).status, 200);
    assert.equal(await db.nailArtist.count({ where: { id: artist.id } }), 0);
  });
});

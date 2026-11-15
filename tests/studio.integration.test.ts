import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { createBooking, getAvailability } from "../lib/studio/booking-db";
import { reservationMessage } from "../lib/studio/notifications";
import { DEFAULT_HOME } from "../lib/studio/home";
const url = new URL(process.env.DATABASE_URL || "postgresql://invalid");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !/^\/beaver_(?:studio|settlement)_test(?:_[a-z0-9_]+)?$/.test(url.pathname)
)
  throw new Error(
    "Integration tests require the isolated local test database.",
  );
const db = new PrismaClient();
const prefix = `test_${Date.now()}`;
const userId = `${prefix}_user`,
  staffA = `${prefix}_a`,
  staffB = `${prefix}_b`;
const day = "2030-01-08";
const token = jwt.sign(
  { id: "beavernail-id",memberType:"manager",username:"beavernail" },
  process.env.JWT_SECRET!,
  { expiresIn: "5m" },
);
const staffToken = jwt.sign(
  { id: staffA, memberType: "staff" },
  process.env.JWT_SECRET!,
  { expiresIn: "5m" },
);
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
const admin = process.env.STUDIO_TEST_ADMIN_ORIGIN||"http://127.0.0.1:3001";
const web = process.env.STUDIO_TEST_CUSTOMER_ORIGIN||"http://127.0.0.1:3000";
const schedule = [
  { days: [0, 1, 2, 3, 4, 5, 6], start: "10:00", end: "16:00" },
];
let oldHome: unknown;
before(async () => {
  oldHome = (await db.homeContent.findUnique({ where: { key: "homepage" } }))
    ?.value;
  await db.user.create({
    data: {
      id: userId,
      provider: "credentials",
      name: "测试顾客",
      customerNote: "怕冷 <敏感> & 请准备薄毯",
    },
  });
  for (const id of [staffA, staffB])
    await db.nailArtist.create({
      data: {
        id,
        name: id,
        services: ["nails", "makeup"],
        durationMinutes: 120,
        schedule,
      },
    });
});
after(async () => {
  await db.reservation.deleteMany({ where: { userId } });
  await db.timeOff.deleteMany({
    where: {
      OR: [{ nailArtistId: { in: [staffA, staffB] } }, { reason: prefix }],
    },
  });
  await db.nailArtist.deleteMany({ where: { id: { in: [staffA, staffB] } } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.mediaAsset.deleteMany({ where: { ownerId: userId } });
  if (oldHome)
    await db.homeContent.upsert({
      where: { key: "homepage" },
      create: { key: "homepage", value: oldHome as never },
      update: { value: oldHome as never },
    });
  else await db.homeContent.deleteMany({ where: { key: "homepage" } });
  await db.$disconnect();
});
test("anonymous and forged tokens cannot read private admin notes", async () => {
  assert.equal(
    (await fetch(`${admin}/api/studio/customer-note?userId=${userId}`)).status,
    401,
  );
  const forged = jwt.sign(
    { id: "attacker", memberType: "manager" },
    "wrong-key",
    { expiresIn: "5m" },
  );
  assert.equal(
    (
      await fetch(`${admin}/api/studio/customer-note?userId=${userId}`, {
        headers: { Authorization: `Bearer ${forged}` },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${admin}/api/studio/staff`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${staffToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: staffA,
          name: staffA,
          active: true,
          services: ["nails", "makeup"],
          durationMinutes: 120,
          schedule,
        }),
      })
    ).status,
    403,
  );
});
test("simultaneous nail and makeup requests get only one appointment", async () => {
  const attempts = await Promise.allSettled(
    ["nails", "makeup"].map((serviceType) =>
      createBooking(
        db,
        { date: day, timeSlot: "10:00", nailArtistId: staffA, serviceType },
        userId,
      ),
    ),
  );
  assert.equal(attempts.filter((v) => v.status === "fulfilled").length, 1);
  assert.equal(await db.reservation.count({ where: { userId } }), 1);
  const available = await getAvailability(db, day, staffA, "makeup");
  assert.deepEqual(available.availableTimeSlots, ["12:00", "14:00"]);
  await db.reservation.deleteMany({ where: { userId } });
});
test("database also prevents older direct writers from creating overlap", async () => {
  await createBooking(
    db,
    {
      date: day,
      timeSlot: "10:00",
      nailArtistId: staffA,
      serviceType: "nails",
    },
    userId,
  );
  await assert.rejects(() =>
    db.reservation.create({
      data: {
        date: new Date(day),
        timeSlot: "11:00",
        nailArtistId: staffA,
        userId,
        durationMinutes: 120,
      },
    }),
  );
  await db.reservation.deleteMany({ where: { userId } });
});
test("partial employee rest blocks only that employee; global rest blocks both", async () => {
  const partial = await fetch(`${admin}/api/studio/time-off`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nailArtistId: staffA,
      startsAt: `${day}T11:00:00+09:00`,
      endsAt: `${day}T11:30:00+09:00`,
      reason: prefix,
    }),
  });
  assert.equal(partial.status, 201, await partial.text());
  assert.deepEqual(
    (await getAvailability(db, day, staffA, "nails")).availableTimeSlots,
    ["12:00", "14:00"],
  );
  assert.equal(
    (await getAvailability(db, day, staffB, "makeup")).availableTimeSlots
      .length,
    3,
  );
  const global = await fetch(`${admin}/api/studio/time-off`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nailArtistId: null,
      startsAt: `${day}T14:00:00+09:00`,
      endsAt: `${day}T16:00:00+09:00`,
      reason: prefix,
    }),
  });
  assert.equal(global.status, 201, await global.text());
  assert.deepEqual(
    (await getAvailability(db, day, staffB, "makeup")).availableTimeSlots,
    ["10:00", "12:00"],
  );
  await db.timeOff.deleteMany({ where: { reason: prefix } });
});
test("a rest period conflicting with a real appointment returns conflicts without cancelling", async () => {
  const booking = await createBooking(
    db,
    {
      date: day,
      timeSlot: "12:00",
      nailArtistId: staffA,
      serviceType: "makeup",
    },
    userId,
  );
  const response = await fetch(`${admin}/api/studio/time-off`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nailArtistId: null,
      startsAt: `${day}T12:00:00+09:00`,
      endsAt: `${day}T14:00:00+09:00`,
      reason: prefix,
    }),
  });
  assert.equal(response.status, 409);
  const result = await response.json();
  assert.ok(
    result.conflicts.some(
      (r: { id: string }) => r.id === booking.reservation.id,
    ),
  );
  assert.ok(
    await db.reservation.findUnique({ where: { id: booking.reservation.id } }),
  );
  assert.equal(await db.timeOff.count({ where: { reason: prefix } }), 0);
  await db.reservation.deleteMany({ where: { userId } });
});
test("employee changes immediately affect customer availability and eligibility", async () => {
  const response = await fetch(`${admin}/api/studio/staff`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      id: staffA,
      name: staffA,
      active: true,
      services: ["makeup"],
      durationMinutes: 120,
      schedule: [{ days: [2], start: "12:00", end: "18:00" }],
    }),
  });
  assert.equal(response.status, 200, await response.text());
  const availability = await fetch(
    `${web}/api/reservations/availability?date=${day}&nailArtistId=${staffA}&serviceType=makeup`,
  );
  assert.equal(availability.status, 200);
  assert.deepEqual((await availability.json()).availableTimeSlots, [
    "12:00",
    "14:00",
    "16:00",
  ]);
  const nails = await getAvailability(db, day, staffA, "nails");
  assert.deepEqual(nails.availableTimeSlots, []);
  await db.nailArtist.update({
    where: { id: staffA },
    data: { services: ["nails", "makeup"], schedule },
  });
});
test("customer note and appointment note remain separate, and notifications include escaped latest notes", async () => {
  const response = await fetch(`${admin}/api/studio/customer-note`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ userId, note: "怕冷 <敏感> & 毯子" }),
  });
  assert.equal(response.status, 200);
  const { reservation, artist } = await createBooking(
    db,
    {
      date: day,
      timeSlot: "12:00",
      nailArtistId: staffA,
      serviceType: "makeup",
      customerRequest: "粉色日常妆",
    },
    userId,
  );
  const saved = await db.reservation.update({
    where: { id: reservation.id },
    data: { note: "本次粉色腮红" },
  });
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const text = reservationMessage("测试通知", saved, user, artist);
  assert.ok(text.includes("怕冷 &lt;敏感&gt; &amp; 毯子"));
  assert.ok(text.includes("本次粉色腮红"));
  assert.ok(text.includes("粉色日常妆"));
  assert.equal(user.customerNote, "怕冷 <敏感> & 毯子");
  await db.reservation.deleteMany({ where: { userId } });
});
test("home images and order saved in admin are read by the customer site", async () => {
  const config = {
    ...DEFAULT_HOME,
    slides: [...DEFAULT_HOME.slides].reverse(),
  };
  const saved = await fetch(`${admin}/api/studio/home`, {
    method: "PUT",
    headers,
    body: JSON.stringify(config),
  });
  assert.equal(saved.status, 200, await saved.text());
  const response = await fetch(`${web}/api/studio/home`);
  const home = await response.json();
  assert.equal(home.slides[0].id, "makeup");
  assert.equal(home.slides[1].id, "nails");
  assert.equal(home.makeupImage, undefined);
  const invalid = await fetch(`${admin}/api/studio/home`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      ...config,
      slides: config.slides.map((s) => ({ ...s, enabled: false })),
    }),
  });
  assert.equal(invalid.status, 400);
});
test("private reference media requires owner session or admin credentials; payment images stay separate", async () => {
  const asset = await db.mediaAsset.create({
    data: {
      ownerId: userId,
      purpose: "reference",
      data: new Uint8Array([255, 216, 255, 217]),
      mimeType: "image/jpeg",
    },
  });
  assert.equal((await fetch(`${web}/api/media/${asset.id}`)).status, 403);
  assert.equal((await fetch(`${admin}/api/media/${asset.id}`)).status, 401);
  const image = await fetch(`${admin}/api/media/${asset.id}`, { headers });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("cache-control"), "private, no-store");
  const booking = await createBooking(
    db,
    {
      date: day,
      timeSlot: "14:00",
      nailArtistId: staffA,
      serviceType: "nails",
      referenceImageIds: [asset.id],
    },
    userId,
  );
  assert.equal(booking.reservation.uploadImage, null);
  assert.deepEqual(booking.reservation.referenceImageIds, [asset.id]);
  await assert.rejects(() =>
    createBooking(
      db,
      {
        date: day,
        timeSlot: "10:00",
        nailArtistId: staffB,
        serviceType: "makeup",
        referenceImageIds: ["invalid"],
      },
      userId,
    ),
  );
  await db.reservation.deleteMany({ where: { userId } });
});

test("website login, optional upload, booking and customer history work together", async () => {
  const jar = new Map<string, string>();
  const request = async (path: string, init: RequestInit = {}) => {
    const hs = new Headers(init.headers);
    if (jar.size)
      hs.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const response = await fetch(web + path, {
      ...init,
      headers: hs,
      redirect: "manual",
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return response;
  };
  const csrf = await (await request("/api/auth/csrf")).json();
  const login = await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({
      csrfToken: csrf.csrfToken,
      username: "studio_preview",
      password: "local-preview-only",
      callbackUrl: "/reservation",
    }),
  });
  assert.equal(login.status, 200);
  const session = await (await request("/api/auth/session")).json();
  assert.equal(session.user.id, "local_preview_user");
  assert.equal(session.user.customerNote, undefined);
  const upcomingResponse = await request("/api/reservations/approachingReservationTime");
  assert.equal(upcomingResponse.status, 200);
  assert.match(upcomingResponse.headers.get("cache-control") || "", /no-store/);
  const { nextReservation } = await upcomingResponse.json();
  if (nextReservation) {
    assert.deepEqual(Object.keys(nextReservation).sort(), ["date", "id", "serviceType", "timeSlot"]);
    const owned = await db.reservation.findUnique({ where: { id: nextReservation.id }, select: { userId: true } });
    assert.equal(owned?.userId, session.user.id);
  }
  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array([255, 216, 255, 217])], { type: "image/jpeg" }),
    "reference.jpg",
  );
  const upload = await request("/api/media", { method: "POST", body: form });
  assert.equal(upload.status, 200, await upload.clone().text());
  const image = await upload.json();
  try {
    assert.equal((await request(`/api/media/${image.id}`)).status, 200);
    const body = {
      date: day,
      timeSlot: "10:00",
      nailArtistId: staffB,
      serviceType: "makeup",
      referenceImageIds: [image.id],
      customerRequest: "测试清透妆",
    };
    const response = await request("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 201, await response.clone().text());
    const booked = await response.json();
    try {
      assert.equal(booked.reservation.serviceType, "makeup");
      assert.equal(booked.customerNote, undefined);
      const history = await request(
        `/api/reservations/history/getSingleReservation?reservationId=${booked.reservation.id}`,
      );
      assert.equal(history.status, 200);
      const detail = await history.json();
      assert.deepEqual(detail.referenceImageIds, [image.id]);
      assert.equal(detail.customerNote, undefined);
      assert.equal(detail.depositImage, null);
      const otherUserAsset = await db.mediaAsset.create({
        data: {
          ownerId: userId,
          purpose: "reference",
          data: new Uint8Array([255, 216, 255, 217]),
          mimeType: "image/jpeg",
        },
      });
      assert.equal(
        (await request(`/api/media/${otherUserAsset.id}`)).status,
        403,
      );
    } finally {
      await db.reservation.deleteMany({ where: { id: booked.reservation.id } });
    }
    const noPhoto = await request("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: day,
        timeSlot: "12:00",
        nailArtistId: staffB,
        serviceType: "nails",
      }),
    });
    assert.equal(noPhoto.status, 201, await noPhoto.clone().text());
    const simple = await noPhoto.json();
    assert.deepEqual(simple.reservation.referenceImageIds, []);
    await db.reservation.deleteMany({ where: { id: simple.reservation.id } });
    const svg = new FormData();
    svg.set("file", new Blob(["<svg/>"], { type: "image/svg+xml" }), "bad.svg");
    assert.equal(
      (await request("/api/media", { method: "POST", body: svg })).status,
      400,
    );
  } finally {
    await db.mediaAsset.deleteMany({ where: { id: image.id } });
  }
});

test("legacy calendar, customer history, stats and settlement SQL remain compatible", async () => {
  const record = await createBooking(
    db,
    {
      date: day,
      timeSlot: "10:00",
      nailArtistId: staffA,
      serviceType: "makeup",
    },
    userId,
  );
  const oldCommission=await db.projectCommission.findUnique({where:{serviceId:"makeup"}});
  try {
    const calendar = await fetch(`${admin}/api/getNewReservation`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        loginUser: { username: "beavernail" },
        startDate: "2030-01-01",
        endDate: "2030-01-31",
      }),
    });
    assert.equal(calendar.status, 200, await calendar.clone().text());
    assert.ok(
      (await calendar.json()).message.some(
        (r: { id: string; serviceType: string }) =>
          r.id === record.reservation.id && r.serviceType === "makeup",
      ),
    );
    for (const path of [
      "/api/getNumberOfAllReservation",
      "/api/getReservationStats",
      "/api/getMonthlyOverview?month=2030-01",
      `/api/getUserDetail?userId=${userId}`,
      `/api/getUserReservations?userId=${userId}`,
      `/api/getSingleReservation?reservationid=${record.reservation.id}`,
    ]) {
      const response = await fetch(admin + path, { headers });
      assert.equal(
        response.status,
        200,
        `${path}: ${await response.clone().text()}`,
      );
    }
    await db.projectCommission.upsert({where:{serviceId:"makeup"},create:{serviceId:"makeup",rateBps:3000,updatedById:"beavernail-id"},update:{rateBps:3000}});
    const price = await fetch(`${admin}/api/modifyReservationPrice`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reservationid: record.reservation.id,
        price: "75000",
        currency: "KRW",
        paymentMethod: "cash",
      }),
    });
    assert.equal(price.status, 200, await price.clone().text());
    const proposal=await price.json();
    assert.equal((await db.reservation.findUniqueOrThrow({where:{id:record.reservation.id}})).finalPrice,null);
    const approval=await fetch(`${admin}/api/studio/settlements/${proposal.request.id}`,{method:"POST",headers,body:JSON.stringify({action:"approve"})});assert.equal(approval.status,200);
    assert.equal(
      (
        await db.reservation.findUniqueOrThrow({
          where: { id: record.reservation.id },
        })
      ).finalPrice,
      75000,
    );
    const recharge = await fetch(`${admin}/api/memberCardRecharge`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId,
        amount: "25000",
        operatorId: "integration-manager",
      }),
    });
    assert.equal(recharge.status, 200, await recharge.clone().text());
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: userId } })).balance,
      25000,
    );
  } finally {
    if(oldCommission)await db.projectCommission.update({where:{serviceId:"makeup"},data:oldCommission});else await db.projectCommission.deleteMany({where:{serviceId:"makeup"}});
    await db.settlementRequest.deleteMany({where:{reservationKey:record.reservation.id}});
    await db.reservation.deleteMany({ where: { id: record.reservation.id } });
  }
});

test("older callers default to nails and cannot offer starts outside an employee schedule", async () => {
  const artistsResponse = await fetch(`${web}/api/nail-artists`);
  assert.equal(artistsResponse.status, 200);
  const artists = await artistsResponse.json();
  assert.ok(
    artists.every((artist: { services: string[] }) =>
      artist.services.includes("nails"),
    ),
  );
  assert.ok(
    !artists.some((artist: { id: string }) => artist.id === "staff_bella"),
  );
  const response = await fetch(
    `${web}/api/reservations/unavailable-times?date=${day}&nailArtistId=${staffA}&serviceType=makeup`,
  );
  assert.equal(response.status, 200);
  const slots = await response.json();
  assert.ok(slots.unavailableTimes.includes("16:00"));
  assert.ok(slots.unavailableTimes.includes("19:00"));
  assert.deepEqual(slots.availableTimeSlots, ["10:00", "12:00", "14:00"]);
});

test("staff calendars use the signed employee identity, even when the request claims another employee or manager", async () => {
  const a = await createBooking(
    db,
    {
      date: day,
      timeSlot: "10:00",
      nailArtistId: staffA,
      serviceType: "nails",
    },
    userId,
  );
  const b = await createBooking(
    db,
    {
      date: day,
      timeSlot: "12:00",
      nailArtistId: staffB,
      serviceType: "makeup",
    },
    userId,
  );
  const signedHeaders = (id: string) => ({
    ...headers,
    Authorization: `Bearer ${jwt.sign({ id, username: id, memberType: "staff" }, process.env.JWT_SECRET!, { expiresIn: "5m" })}`,
  });
  const calendar = async (
    auth: Record<string, string>,
    loginUser?: unknown,
  ) => {
    const response = await fetch(`${admin}/api/getNewReservation`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        startDate: day,
        endDate: day,
        ...(loginUser ? { loginUser } : {}),
      }),
    });
    assert.equal(response.status, 200, await response.clone().text());
    return (await response.json()).message as {
      id: string;
      nailArtistId: string;
      durationMinutes: number;
    }[];
  };
  try {
    const all = await calendar(headers);
    assert.ok(
      all.some((row) => row.id === a.reservation.id) &&
        all.some((row) => row.id === b.reservation.id),
    );
    const ownA = await calendar(signedHeaders(staffA), {
      username: "beavernail",
      memberType: "manager",
      nailArtistId: staffB,
    });
    assert.deepEqual(
      ownA.map((row) => row.id),
      [a.reservation.id],
    );
    assert.equal(ownA[0].durationMinutes, 120);
    const ownB = await calendar(signedHeaders(staffB), {
      nailArtistId: staffA,
    });
    assert.deepEqual(
      ownB.map((row) => row.id),
      [b.reservation.id],
    );
    const withoutBodyIdentity = await calendar(signedHeaders(staffA));
    assert.deepEqual(
      withoutBodyIdentity.map((row) => row.id),
      [a.reservation.id],
    );
  } finally {
    await db.reservation.deleteMany({
      where: { id: { in: [a.reservation.id, b.reservation.id] } },
    });
  }
});

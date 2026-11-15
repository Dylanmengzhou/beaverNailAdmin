import test from "node:test";
import assert from "node:assert/strict";
import {
  availableSlots,
  candidateSlots,
  isDay,
  seoulDay,
  type StaffSchedule,
} from "../lib/studio/booking";
import { scheduleSchema, staffSchema } from "../lib/studio/validation";
import { escapeHTML, telegramChunks } from "../lib/studio/notifications";
const day = "2030-01-08"; // Tuesday, open under the default store calendar.
const now = new Date("2029-12-01T00:00:00Z");
const bella: StaffSchedule = {
  id: "bella",
  active: true,
  services: ["makeup"],
  durationMinutes: 120,
  schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], start: "10:00", end: "16:00" }],
};
test("two-hour services finish before closing", () =>
  assert.deepEqual(candidateSlots(day, bella, "makeup"), [
    "10:00",
    "12:00",
    "14:00",
  ]));
test("service eligibility and inactive staff are enforced", () => {
  assert.deepEqual(candidateSlots(day, bella, "nails"), []);
  assert.deepEqual(
    candidateSlots(day, { ...bella, active: false }, "makeup"),
    [],
  );
});
test("the default Monday closure follows the store even for staff working every day", () => {
  const monday = "2030-01-07";
  assert.deepEqual(candidateSlots(monday, bella, "makeup"), []);
  assert.deepEqual(candidateSlots(day, bella, "makeup", [2]), []);
  assert.equal(candidateSlots(monday, bella, "makeup", [2]).length, 3);
  assert.ok(candidateSlots(monday, {...bella, schedule:null}, "makeup", []).length);
  const tuesdayOnly = {...bella, schedule:[{days:[2], start:"10:00", end:"12:00"}]};
  assert.deepEqual(candidateSlots(monday, tuesdayOnly, "makeup", []), []);
});
test("partial time off blocks any intersecting appointment", () =>
  assert.deepEqual(
    availableSlots(
      day,
      bella,
      "makeup",
      [],
      [
        {
          nailArtistId: "bella",
          startsAt: `${day}T11:00:00+09:00`,
          endsAt: `${day}T11:30:00+09:00`,
        },
      ],
      now,
    ),
    ["12:00", "14:00"],
  ));
test("another employee's rest leaves Bella open", () =>
  assert.equal(
    availableSlots(
      day,
      bella,
      "makeup",
      [],
      [
        {
          nailArtistId: "nana",
          startsAt: `${day}T00:00:00+09:00`,
          endsAt: `${day}T23:59:00+09:00`,
        },
      ],
      now,
    ).length,
    3,
  ));
test("global time off applies to every employee", () =>
  assert.deepEqual(
    availableSlots(
      day,
      bella,
      "makeup",
      [],
      [
        {
          nailArtistId: null,
          startsAt: `${day}T14:00:00+09:00`,
          endsAt: `${day}T16:00:00+09:00`,
        },
      ],
      now,
    ),
    ["10:00", "12:00"],
  ));
test("a saved longer booking blocks overlapping later starts", () =>
  assert.deepEqual(
    availableSlots(
      day,
      bella,
      "makeup",
      [{ date: day, timeSlot: "10:00", durationMinutes: 240 }],
      [],
      now,
    ),
    ["14:00"],
  ));
test("back-to-back appointments are allowed", () =>
  assert.deepEqual(
    availableSlots(
      day,
      bella,
      "makeup",
      [{ date: day, timeSlot: "12:00", durationMinutes: 120 }],
      [],
      now,
    ),
    ["10:00", "14:00"],
  ));
test("time comparisons use Seoul even when server runs elsewhere", () => {
  assert.equal(seoulDay(new Date("2029-12-31T16:00:00Z")), "2030-01-01");
  assert.deepEqual(
    availableSlots(day, bella, "makeup", [], [], new Date(`${day}T03:00:00Z`)),
    ["14:00"],
  );
});
test("invalid dates and overlapping weekly windows are rejected", () => {
  assert.equal(isDay("2030-02-31"), false);
  assert.equal(
    scheduleSchema.safeParse([
      { days: [1], start: "10:00", end: "14:00" },
      { days: [1], start: "12:00", end: "16:00" },
    ]).success,
    false,
  );
  assert.equal(
    staffSchema.safeParse({ ...bella, name: "Bella", services: [] }).success,
    false,
  );
});
test("Telegram escapes note markup", () =>
  assert.equal(
    escapeHTML("<b>怕冷 & 敏感</b>"),
    "&lt;b&gt;怕冷 &amp; 敏感&lt;/b&gt;",
  ));

test("long Telegram notes split without breaking HTML entities or Unicode", () => {
  const chunks = telegramChunks(
    "<b>预约通知</b>\n" + escapeHTML("🥰 & <怕冷> ".repeat(1000)),
  );
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 3800);
    assert.ok(!/&(?!amp;|lt;|gt;|quot;)/.test(chunk));
    assert.ok(!/[\uD800-\uDBFF]$/.test(chunk));
  }
});

test('configurable half-hour starts retain their minutes', () => {
  assert.deepEqual(candidateSlots(day, { ...bella, schedule: [{ days: [2], start: '10:30', end: '16:30' }] }, 'makeup'), ['10:30', '12:30', '14:30']);
});
test('a multi-day whole-studio closure blocks every slot within the range', () => {
  assert.deepEqual(availableSlots(day, bella, 'makeup', [], [{ nailArtistId: null, startsAt: '2030-01-06T00:00:00+09:00', endsAt: '2030-01-09T00:00:00+09:00' }], now), []);
});

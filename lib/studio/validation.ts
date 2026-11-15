import { z } from "zod";
import { isDay, isTime, minutes, overlaps } from "./booking";
export const serviceSchema = z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/);
export const daySchema = z.string().refine(isDay, "日期格式无效");
export const timeSchema = z.string().refine(isTime, "时间格式无效");
export const scheduleSchema = z
  .array(
    z.object({
      days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
      start: timeSchema,
      end: timeSchema,
    }),
  )
  .max(28)
  .superRefine((windows, ctx) => {
    windows.forEach((window, i) => {
      if (minutes(window.start) >= minutes(window.end))
        ctx.addIssue({
          code: "custom",
          message: "下班时间必须晚于上班时间",
          path: [i],
        });
      if (
        windows
          .slice(0, i)
          .some(
            (other) =>
              other.days.some((day) => window.days.includes(day)) &&
              overlaps(
                minutes(other.start),
                minutes(other.end),
                minutes(window.start),
                minutes(window.end),
              ),
          )
      )
        ctx.addIssue({
          code: "custom",
          message: "同一天的工作时段不能重叠",
          path: [i],
        });
    });
  });
export const staffSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  services: z.array(serviceSchema).min(1).max(40),
  active: z.boolean(),
  durationMinutes: z.number().int().min(30).max(480).multipleOf(15),
  schedule: scheduleSchema,
  serviceSettings: z.record(z.object({durationMinutes:z.number().int().min(30).max(480).multipleOf(15),schedule:scheduleSchema})).optional(),
  commissionRateBps: z.number().int().min(0).max(10000).nullable().optional(),
});
export const bookingSchema = z.object({
  date: daySchema,
  timeSlot: timeSchema,
  nailArtistId: z.string().min(1),
  serviceType: serviceSchema.default("nails"),
  referenceImageIds: z.array(z.string().min(1)).max(4).default([]),
  customerRequest: z.string().trim().max(2000).optional(),
});
export const timeOffSchema = z
  .object({
    nailArtistId: z.string().min(1).nullable(),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    reason: z.string().trim().max(500).default(""),
  })
  .refine(
    (value) => Date.parse(value.startsAt) < Date.parse(value.endsAt),
    "休息结束时间必须晚于开始时间",
  );
export const localizedSchema = z.object({
  zh: z.string().max(200),
  en: z.string().max(200),
  kr: z.string().max(200),
});
export const imageSchema = z.object({
  id: z.string().min(1),
  image: z
    .string()
    .regex(/^\/(api\/media\/[a-zA-Z0-9_-]+|images\/[a-zA-Z0-9_.-]+)$/),
  title: localizedSchema,
  alt: localizedSchema,
  enabled: z.boolean(),
});
export const homeSchema = z
  .object({
    slides: z.array(imageSchema).min(1).max(12),
  })
  .refine(
    (value) => value.slides.some((slide) => slide.enabled),
    "请至少保留一张启用的轮播图",
  )
  .refine(
    (value) =>
      new Set(value.slides.map((s) => s.id)).size === value.slides.length,
    "轮播图 ID 不能重复",
  );

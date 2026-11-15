BEGIN;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customerNote" TEXT;
ALTER TABLE "NailArtist" ADD COLUMN IF NOT EXISTS services TEXT[] NOT NULL DEFAULT ARRAY['nails'];
ALTER TABLE "NailArtist" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "NailArtist" ADD COLUMN IF NOT EXISTS schedule JSONB;
ALTER TABLE "NailArtist" ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "serviceType" TEXT NOT NULL DEFAULT 'nails';
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "referenceImageIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "customerRequest" TEXT;
CREATE TABLE IF NOT EXISTS "TimeOff" (
 id TEXT PRIMARY KEY, "nailArtistId" TEXT REFERENCES "NailArtist"(id) ON DELETE CASCADE,
 "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, reason TEXT,
 CONSTRAINT "time_off_valid_range" CHECK ("startsAt" < "endsAt")
);
CREATE INDEX IF NOT EXISTS "TimeOff_startsAt_endsAt_idx" ON "TimeOff"("startsAt", "endsAt");
CREATE TABLE IF NOT EXISTS "MediaAsset" (
 id TEXT PRIMARY KEY, data BYTEA NOT NULL, "mimeType" TEXT NOT NULL, purpose TEXT NOT NULL,
 "ownerId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "HomeContent" (key TEXT PRIMARY KEY, value JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- Existing staff keep the legacy schedule until their schedule is explicitly saved.
-- Bella is bookable, but no login password/account is invented for her.
INSERT INTO "NailArtist" (id, name, role, membertype, services, "durationMinutes", schedule, active)
 SELECT 'staff_bella', 'bella', 'L3', 'staff', ARRAY['makeup'], 120,
 '[{"days":[0,1,2,3,4,5,6],"start":"10:00","end":"16:00"}]'::jsonb, TRUE
 WHERE NOT EXISTS (SELECT 1 FROM "NailArtist" WHERE lower(name) = 'bella');
UPDATE "NailArtist" SET services = ARRAY['makeup'], "durationMinutes" = 120,
 schedule = '[{"days":[0,1,2,3,4,5,6],"start":"10:00","end":"16:00"}]'::jsonb
 WHERE lower(name) = 'bella' AND schedule IS NULL;
-- Guard capacity even if an older client writes directly to Reservation.
CREATE OR REPLACE FUNCTION studio_reservation_capacity() RETURNS TRIGGER AS $$
DECLARE starts TIMESTAMP; finishes TIMESTAMP;
BEGIN
 IF NEW."nailArtistId" IS NULL THEN RETURN NEW; END IF;
 PERFORM id FROM "NailArtist" WHERE id = NEW."nailArtistId" FOR UPDATE;
 starts := NEW.date::date + NEW."timeSlot"::time;
 finishes := starts + make_interval(mins => NEW."durationMinutes");
 IF EXISTS (SELECT 1 FROM "Reservation" r WHERE r."nailArtistId" = NEW."nailArtistId" AND r.id <> NEW.id
  AND r.date::date + r."timeSlot"::time < finishes
  AND starts < r.date::date + r."timeSlot"::time + make_interval(mins => r."durationMinutes")) THEN
  RAISE EXCEPTION 'STAFF_TIME_CONFLICT' USING ERRCODE = '23505';
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS studio_reservation_capacity ON "Reservation";
CREATE TRIGGER studio_reservation_capacity BEFORE INSERT OR UPDATE OF date, "timeSlot", "nailArtistId", "durationMinutes" ON "Reservation" FOR EACH ROW EXECUTE FUNCTION studio_reservation_capacity();
COMMIT;

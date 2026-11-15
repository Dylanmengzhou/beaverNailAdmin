BEGIN;
CREATE TABLE IF NOT EXISTS "StudioSchedule" (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  "closedWeekdays" INTEGER[] NOT NULL DEFAULT ARRAY[1],
  CHECK ("closedWeekdays" <@ ARRAY[0,1,2,3,4,5,6])
);
INSERT INTO "StudioSchedule" (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
COMMIT;

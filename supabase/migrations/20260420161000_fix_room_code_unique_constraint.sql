DROP INDEX IF EXISTS public.idx_tracker_data_room_code;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tracker_data_room_code_key'
      AND conrelid = 'public.tracker_data'::regclass
  ) THEN
    ALTER TABLE public.tracker_data
    ADD CONSTRAINT tracker_data_room_code_key UNIQUE (room_code);
  END IF;
END
$$;

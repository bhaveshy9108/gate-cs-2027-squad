
-- Add room_code column to tracker_data
ALTER TABLE public.tracker_data 
ADD COLUMN room_code TEXT;

-- Create unique index on room_code
CREATE UNIQUE INDEX idx_tracker_data_room_code ON public.tracker_data (room_code) WHERE room_code IS NOT NULL;

-- Make user_id nullable (no longer required since we use room codes)
ALTER TABLE public.tracker_data ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.tracker_data ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own tracker data" ON public.tracker_data;
DROP POLICY IF EXISTS "Users can insert their own tracker data" ON public.tracker_data;
DROP POLICY IF EXISTS "Users can update their own tracker data" ON public.tracker_data;

-- New RLS policies allowing anon access via room_code
CREATE POLICY "Anyone can view tracker data by room code"
ON public.tracker_data FOR SELECT
TO anon, authenticated
USING (room_code IS NOT NULL);

CREATE POLICY "Anyone can insert tracker data with room code"
ON public.tracker_data FOR INSERT
TO anon, authenticated
WITH CHECK (room_code IS NOT NULL);

CREATE POLICY "Anyone can update tracker data by room code"
ON public.tracker_data FOR UPDATE
TO anon, authenticated
USING (room_code IS NOT NULL);

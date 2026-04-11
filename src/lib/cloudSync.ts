import { supabase } from "@/integrations/supabase/client";
import type { TrackerState } from "./trackerStore";

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const ROOM_CODE_KEY = "gate-tracker-room-code";

export function getSavedRoomCode(): string | null {
  return localStorage.getItem(ROOM_CODE_KEY);
}

export function saveRoomCode(code: string) {
  localStorage.setItem(ROOM_CODE_KEY, code);
}

export function clearRoomCode() {
  localStorage.removeItem(ROOM_CODE_KEY);
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function loadCloudState(roomCode: string): Promise<TrackerState | null> {
  const { data, error } = await supabase
    .from("tracker_data")
    .select("data")
    .eq("room_code", roomCode)
    .maybeSingle();

  if (error || !data) return null;
  return data.data as unknown as TrackerState;
}

export function saveCloudState(roomCode: string, state: TrackerState) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const payload = JSON.parse(JSON.stringify(state));
    const { error } = await supabase
      .from("tracker_data")
      .upsert(
        { room_code: roomCode, data: payload },
        { onConflict: "room_code" }
      );
    if (error) console.error("Cloud save failed:", error.message);
  }, 1500);
}

import { supabase } from "@/integrations/supabase/client";
import type { TrackerState } from "./trackerStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let isSaving = false;

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
    isSaving = true;
    const payload = JSON.parse(JSON.stringify(state));
    const { error } = await supabase
      .from("tracker_data")
      .upsert(
        { room_code: roomCode, data: payload },
        { onConflict: "room_code" }
      );
    if (error) console.error("Cloud save failed:", error.message);
    setTimeout(() => { isSaving = false; }, 300);
  }, 1500);
}

export function subscribeToRoom(
  roomCode: string,
  onUpdate: (state: TrackerState) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`room-${roomCode}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "tracker_data",
        filter: `room_code=eq.${roomCode}`,
      },
      (payload) => {
        // Skip updates triggered by our own saves
        if (isSaving) return;
        const newData = payload.new?.data as unknown as TrackerState;
        if (newData) {
          onUpdate(newData);
        }
      }
    )
    .subscribe();

  return channel;
}

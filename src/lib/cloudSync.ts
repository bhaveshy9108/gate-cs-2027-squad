import { supabase } from "@/integrations/supabase/client";
import type { TrackerState } from "./trackerStore";

const ROOM_CODE_KEY = "gate-tracker-room-code";
const ROOM_STATE_PREFIX = "gate-tracker-room-state:";
const ROOM_EVENT_PREFIX = "gate-tracker-room-updated:";

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let isSaving = false;

export function hasCloudSync() {
  return Boolean(supabase);
}

function getRoomStateKey(roomCode: string) {
  return `${ROOM_STATE_PREFIX}${roomCode}`;
}

function getRoomEventName(roomCode: string) {
  return `${ROOM_EVENT_PREFIX}${roomCode}`;
}

function cloneState(state: TrackerState): TrackerState {
  return JSON.parse(JSON.stringify(state)) as TrackerState;
}

function saveRoomStateLocally(roomCode: string, state: TrackerState) {
  localStorage.setItem(getRoomStateKey(roomCode), JSON.stringify(cloneState(state)));
  dispatchRoomUpdate(roomCode);
}

function dispatchRoomUpdate(roomCode: string) {
  window.dispatchEvent(new CustomEvent(getRoomEventName(roomCode)));
}

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
  if (supabase) {
    const { data, error } = await supabase
      .from("tracker_data")
      .select("data")
      .eq("room_code", roomCode)
      .maybeSingle();

    if (error || !data) return null;
    const cloudState = data.data as unknown as TrackerState;
    saveRoomStateLocally(roomCode, cloudState);
    return cloudState;
  }

  try {
    const raw = localStorage.getItem(getRoomStateKey(roomCode));
    return raw ? (JSON.parse(raw) as TrackerState) : null;
  } catch {
    return null;
  }
}

export function saveCloudState(roomCode: string, state: TrackerState) {
  saveRoomStateLocally(roomCode, state);

  if (supabase) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      isSaving = true;
      const payload = cloneState(state);
      const { error } = await supabase
        .from("tracker_data")
        .upsert({ room_code: roomCode, data: payload }, { onConflict: "room_code" });

      if (error) {
        console.error("Cloud save failed:", error.message);
      }

      setTimeout(() => {
        isSaving = false;
      }, 300);
    }, 1500);
    return;
  }

}

export function subscribeToRoom(
  roomCode: string,
  onUpdate: (state: TrackerState) => void
): { unsubscribe: () => void } {
  const roomStateKey = getRoomStateKey(roomCode);

  const emitLatestState = () => {
    const raw = localStorage.getItem(roomStateKey);
    if (!raw) return;

    try {
      onUpdate(JSON.parse(raw) as TrackerState);
    } catch (error) {
      console.error("Room sync failed:", error);
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === roomStateKey && event.newValue) {
      emitLatestState();
    }
  };

  const handleLocalUpdate = () => {
    emitLatestState();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(getRoomEventName(roomCode), handleLocalUpdate);

  if (supabase) {
    const channel = supabase
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tracker_data",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          if (isSaving) return;

          const newData = payload.new?.data as unknown as TrackerState;
          if (newData) {
            saveRoomStateLocally(roomCode, newData);
            onUpdate(newData);
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        channel.unsubscribe();
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(getRoomEventName(roomCode), handleLocalUpdate);
      },
    };
  }

  return {
    unsubscribe: () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(getRoomEventName(roomCode), handleLocalUpdate);
    },
  };
}

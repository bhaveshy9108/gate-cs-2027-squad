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

interface LocalRoomSnapshot {
  state: TrackerState;
  updatedAt: string;
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

function parseLocalRoomSnapshot(raw: string | null): LocalRoomSnapshot | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as TrackerState | LocalRoomSnapshot;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "state" in parsed &&
      "updatedAt" in parsed
    ) {
      return parsed as LocalRoomSnapshot;
    }

    return {
      state: parsed as TrackerState,
      updatedAt: new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function getLocalRoomSnapshot(roomCode: string): LocalRoomSnapshot | null {
  return parseLocalRoomSnapshot(localStorage.getItem(getRoomStateKey(roomCode)));
}

function saveRoomStateLocally(roomCode: string, state: TrackerState, updatedAt = new Date().toISOString()) {
  const snapshot: LocalRoomSnapshot = {
    state: cloneState(state),
    updatedAt,
  };
  localStorage.setItem(getRoomStateKey(roomCode), JSON.stringify(snapshot));
  dispatchRoomUpdate(roomCode);
}

function dispatchRoomUpdate(roomCode: string) {
  window.dispatchEvent(new CustomEvent(getRoomEventName(roomCode)));
}

export function getSavedRoomCode(): string | null {
  return localStorage.getItem(ROOM_CODE_KEY);
}

export function getSavedRoomState(roomCode: string): TrackerState | null {
  return getLocalRoomSnapshot(roomCode)?.state ?? null;
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
  const localSnapshot = getLocalRoomSnapshot(roomCode);

  if (supabase) {
    const { data, error } = await supabase
      .from("tracker_data")
      .select("data,updated_at")
      .eq("room_code", roomCode)
      .maybeSingle();

    if (error || !data) return localSnapshot?.state ?? null;

    const cloudState = data.data as unknown as TrackerState;
    const cloudUpdatedAt = data.updated_at ?? new Date(0).toISOString();

    if (localSnapshot && localSnapshot.updatedAt > cloudUpdatedAt) {
      void persistCloudState(roomCode, localSnapshot.state);
      return localSnapshot.state;
    }

    saveRoomStateLocally(roomCode, cloudState, cloudUpdatedAt);
    return cloudState;
  }

  return localSnapshot?.state ?? null;
}

async function persistCloudState(roomCode: string, state: TrackerState) {
  const payload = cloneState(state);
  const { error } = await supabase
    .from("tracker_data")
      .upsert({ room_code: roomCode, data: payload }, { onConflict: "room_code" });

  if (error) {
    console.error("Cloud save failed:", error.message);
  }
}

export function saveCloudState(
  roomCode: string,
  state: TrackerState,
  options?: { immediate?: boolean }
) {
  saveRoomStateLocally(roomCode, state);

  if (supabase) {
    if (options?.immediate) {
      if (saveTimeout) clearTimeout(saveTimeout);
      isSaving = true;
      void persistCloudState(roomCode, state).finally(() => {
        setTimeout(() => {
          isSaving = false;
        }, 300);
      });
      return;
    }

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      isSaving = true;
      await persistCloudState(roomCode, state);

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
    const snapshot = getLocalRoomSnapshot(roomCode);
    if (!snapshot) return;

    try {
      onUpdate(snapshot.state);
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
            saveRoomStateLocally(roomCode, newData, payload.new?.updated_at);
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

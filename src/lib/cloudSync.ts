import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { mergeTrackerStates, normalizeTrackerState, type TrackerState } from "./trackerStore";
import { toast } from "sonner";

const ROOM_CODE_KEY = "gate-tracker-room-code";
const ROOM_STATE_PREFIX = "gate-tracker-room-state:";
const ROOM_EVENT_PREFIX = "gate-tracker-room-updated:";
const CLOUD_SYNC_DISABLED_UNTIL_KEY = "gate-tracker-cloud-sync-disabled-until";
const CLOUD_SYNC_DISABLED_MS = 15 * 1000;
const CLOUD_ERROR_NOTICE_COOLDOWN_MS = 5 * 60 * 1000;

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let isSaving = false;
const lastCloudErrorAt: Record<string, number> = {};
const CLOUD_SAVE_DELAY_MS = 300;
const CLOUD_POLL_INTERVAL_MS = 1000;

export function hasCloudSync() {
  // Configuration determines cloud availability. A transient network issue
  // should not turn a shared room into an apparently local-only workspace.
  return Boolean(supabase);
}

interface LocalRoomSnapshot {
  state: TrackerState;
  updatedAt: string;
}

interface BroadcastRoomMessage {
  type: "room-state";
  roomCode: string;
  updatedAt: string;
  state: TrackerState;
}

function getRoomStateKey(roomCode: string) {
  return `${ROOM_STATE_PREFIX}${roomCode}`;
}

function getRoomEventName(roomCode: string) {
  return `${ROOM_EVENT_PREFIX}${roomCode}`;
}

function cloneState(state: TrackerState): TrackerState {
  return normalizeTrackerState(JSON.parse(JSON.stringify(state)));
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
      return {
        state: normalizeTrackerState((parsed as LocalRoomSnapshot).state),
        updatedAt: (parsed as LocalRoomSnapshot).updatedAt,
      };
    }

    return {
      state: normalizeTrackerState(parsed),
      updatedAt: new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function getLocalRoomSnapshot(roomCode: string): LocalRoomSnapshot | null {
  return parseLocalRoomSnapshot(localStorage.getItem(getRoomStateKey(roomCode)));
}

function createRoomChannel(roomCode: string): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(`gate-tracker-room:${roomCode}`);
}

function saveRoomStateLocally(
  roomCode: string,
  state: TrackerState,
  updatedAt = new Date().toISOString(),
  notify = true
) {
  const snapshot: LocalRoomSnapshot = {
    state: cloneState(state),
    updatedAt,
  };
  localStorage.setItem(getRoomStateKey(roomCode), JSON.stringify(snapshot));
  if (notify) dispatchRoomUpdate(roomCode);
}

function dispatchRoomUpdate(roomCode: string) {
  window.dispatchEvent(new CustomEvent(getRoomEventName(roomCode)));
}

function isNetworkFetchFailure(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : String(error ?? "");
  return /failed to fetch|networkerror|network request failed|dns|name does not exist|unreachable/i.test(message);
}

function notifyCloudLoadFailure(roomCode: string, reason: string) {
  const now = Date.now();
  const lastShown = lastCloudErrorAt[roomCode] ?? 0;
  if (now - lastShown < CLOUD_ERROR_NOTICE_COOLDOWN_MS) return;

  lastCloudErrorAt[roomCode] = now;
  toast.error(`Cloud load failed for room ${roomCode}: ${reason}`);
}

function normalizeCloudError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Unknown cloud error";
}

function getCloudSyncDisabledUntil() {
  const raw = localStorage.getItem(CLOUD_SYNC_DISABLED_UNTIL_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

function isCloudSyncTemporarilyDisabled() {
  return getCloudSyncDisabledUntil() > Date.now();
}

function clearCloudSyncDisabledFlag() {
  localStorage.removeItem(CLOUD_SYNC_DISABLED_UNTIL_KEY);
}

function disableCloudSyncTemporarily() {
  localStorage.setItem(CLOUD_SYNC_DISABLED_UNTIL_KEY, String(Date.now() + CLOUD_SYNC_DISABLED_MS));
}

function retryCloudSave(roomCode: string, state: TrackerState) {
  if (!supabase) return;

  if (retryTimeout) clearTimeout(retryTimeout);
  const retryAfter = Math.max(250, getCloudSyncDisabledUntil() - Date.now());
  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    void persistCloudState(roomCode, state);
  }, retryAfter);
}

export function getSavedRoomCode(): string | null {
  return localStorage.getItem(ROOM_CODE_KEY);
}

export function getSavedRoomState(roomCode: string): TrackerState | null {
  return getLocalRoomSnapshot(roomCode)?.state ?? null;
}

export function publishRoomState(roomCode: string, state: TrackerState) {
  const updatedAt = new Date().toISOString();
  saveRoomStateLocally(roomCode, state, updatedAt, false);

  const channel = createRoomChannel(roomCode);
  channel?.postMessage({
    type: "room-state",
    roomCode,
    updatedAt,
    state: cloneState(state),
  } satisfies BroadcastRoomMessage);
  channel?.close();
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

  if (supabase && !isCloudSyncTemporarilyDisabled()) {
    try {
      const { data, error } = await supabase
        .from("tracker_data")
        .select("data,updated_at")
        .eq("room_code", roomCode)
        .maybeSingle();

      if (error) {
        console.error(`Cloud load failed for room ${roomCode}:`, error.message);
        if (isNetworkFetchFailure(error)) {
          disableCloudSyncTemporarily();
        } else {
          notifyCloudLoadFailure(roomCode, error.message);
        }
        return localSnapshot?.state ?? null;
      }

      if (!data) {
        clearCloudSyncDisabledFlag();
        return localSnapshot?.state ?? null;
      }

      const cloudState = normalizeTrackerState(data.data);
      const cloudUpdatedAt = data.updated_at ?? new Date(0).toISOString();

      const mergedState = localSnapshot ? mergeTrackerStates(localSnapshot.state, cloudState) : cloudState;
      const mergedUpdatedAt = mergedState.lastUpdatedAt ?? cloudUpdatedAt;
      const changedLocally = !localSnapshot || JSON.stringify(mergedState) !== JSON.stringify(localSnapshot.state);
      if (JSON.stringify(mergedState) !== JSON.stringify(cloudState)) {
        void persistCloudState(roomCode, mergedState);
      }

      if (changedLocally) saveRoomStateLocally(roomCode, mergedState, mergedUpdatedAt, false);
      clearCloudSyncDisabledFlag();
      return mergedState;
    } catch (error) {
      const reason = isNetworkFetchFailure(error)
        ? "Supabase is unreachable from this browser session. Check your live deployment env vars and network access."
        : normalizeCloudError(error);
      console.error(`Cloud load failed for room ${roomCode}:`, error);
      if (isNetworkFetchFailure(error)) {
        disableCloudSyncTemporarily();
      } else {
        notifyCloudLoadFailure(roomCode, reason);
      }
      return localSnapshot?.state ?? null;
    }
  }

  return localSnapshot?.state ?? null;
}

async function persistCloudState(roomCode: string, state: TrackerState) {
  if (!supabase) return;
  if (isCloudSyncTemporarilyDisabled()) {
    retryCloudSave(roomCode, state);
    return;
  }

  try {
    const payload = cloneState(state);
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("tracker_data")
      .upsert(
        { room_code: roomCode, data: payload as unknown as Json, user_id: null, updated_at: updatedAt },
        { onConflict: "room_code" }
      );

    if (error) {
      console.error("Cloud save failed:", error.message);
      if (isNetworkFetchFailure(error)) {
        disableCloudSyncTemporarily();
        retryCloudSave(roomCode, state);
      } else {
        toast.error(`Cloud save failed: ${error.message}`);
      }
    } else {
      clearCloudSyncDisabledFlag();
    }
  } catch (error) {
    console.error("Cloud save failed:", error);
    const reason = isNetworkFetchFailure(error)
      ? "Supabase is unreachable from this browser session."
      : normalizeCloudError(error);
    if (isNetworkFetchFailure(error)) {
      disableCloudSyncTemporarily();
      retryCloudSave(roomCode, state);
    } else {
      toast.error(`Cloud save failed: ${reason}`);
    }
  }
}

export function saveCloudState(
  roomCode: string,
  state: TrackerState,
  options?: { immediate?: boolean; localAlreadyPublished?: boolean }
) {
  if (!options?.localAlreadyPublished) {
    publishRoomState(roomCode, state);
  }

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
    }, CLOUD_SAVE_DELAY_MS);
    return;
  }

}

export function subscribeToRoom(
  roomCode: string,
  onUpdate: (state: TrackerState) => void
): { unsubscribe: () => void } {
  if (!supabase) {
    const snapshotOnly = getLocalRoomSnapshot(roomCode);
    if (snapshotOnly) {
      try {
        onUpdate(snapshotOnly.state);
      } catch (error) {
        console.error("Room sync failed:", error);
      }
    }

    return {
      unsubscribe: () => undefined,
    };
  }

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

  const broadcastChannel = createRoomChannel(roomCode);
  const handleBroadcast = (event: MessageEvent<BroadcastRoomMessage>) => {
    const message = event.data;
    if (!message || message.type !== "room-state" || message.roomCode !== roomCode) {
      return;
    }

    const localSnapshot = getLocalRoomSnapshot(roomCode);
    if (localSnapshot && localSnapshot.updatedAt >= message.updatedAt) {
      return;
    }
    const mergedState = localSnapshot ? mergeTrackerStates(localSnapshot.state, message.state) : message.state;
    saveRoomStateLocally(roomCode, mergedState, message.updatedAt, false);
    onUpdate(mergedState);
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(getRoomEventName(roomCode), handleLocalUpdate);
  broadcastChannel?.addEventListener("message", handleBroadcast);

  if (supabase) {
    let pollInterval: number | null = null;
    let channel: { unsubscribe: () => void } | null = null;

    const stopCloudSync = () => {
      if (pollInterval) {
        window.clearInterval(pollInterval);
        pollInterval = null;
      }
      channel?.unsubscribe();
      channel = null;
    };

    const syncFromCloud = async () => {
      if (isCloudSyncTemporarilyDisabled()) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from("tracker_data")
          .select("data,updated_at")
          .eq("room_code", roomCode)
          .maybeSingle();

        if (error) {
          console.error(`Cloud sync poll failed for room ${roomCode}:`, error.message);
          if (isNetworkFetchFailure(error)) {
            disableCloudSyncTemporarily();
          }
          return;
        }

        if (!data) return;

        const cloudUpdatedAt = data.updated_at ?? new Date(0).toISOString();
        const cloudState = normalizeTrackerState(data.data);
        const localSnapshot = getLocalRoomSnapshot(roomCode);
        if (localSnapshot && localSnapshot.updatedAt >= cloudUpdatedAt) {
          if (localSnapshot.updatedAt > cloudUpdatedAt) {
            void persistCloudState(roomCode, localSnapshot.state);
          }
          return;
        }
        const mergedState = localSnapshot ? mergeTrackerStates(localSnapshot.state, cloudState) : cloudState;
        const changedLocally = !localSnapshot || JSON.stringify(mergedState) !== JSON.stringify(localSnapshot.state);
        if (JSON.stringify(mergedState) !== JSON.stringify(cloudState)) {
          void persistCloudState(roomCode, mergedState);
        }
        if (changedLocally) {
          saveRoomStateLocally(roomCode, mergedState, cloudUpdatedAt, false);
          onUpdate(mergedState);
        }
      } catch (error) {
        console.error(`Cloud sync poll failed for room ${roomCode}:`, error);
        if (isNetworkFetchFailure(error)) {
          disableCloudSyncTemporarily();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncFromCloud();
      }
    };

    channel = supabase
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

          const newRow = payload.new as { data?: unknown; updated_at?: string };
          const newData = newRow?.data ? normalizeTrackerState(newRow.data) : null;
          if (newData) {
            const localSnapshot = getLocalRoomSnapshot(roomCode);
            if (localSnapshot && newRow.updated_at && localSnapshot.updatedAt >= newRow.updated_at) return;
            const mergedState = localSnapshot ? mergeTrackerStates(localSnapshot.state, newData) : newData;
            const changedLocally = !localSnapshot || JSON.stringify(mergedState) !== JSON.stringify(localSnapshot.state);
            if (JSON.stringify(mergedState) !== JSON.stringify(newData)) {
              void persistCloudState(roomCode, mergedState);
            }
            if (changedLocally) {
              saveRoomStateLocally(roomCode, mergedState, newRow?.updated_at, false);
              onUpdate(mergedState);
            }
          }
        }
      )
      .subscribe();

    pollInterval = window.setInterval(() => {
      void syncFromCloud();
    }, CLOUD_POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return {
      unsubscribe: () => {
        stopCloudSync();
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(getRoomEventName(roomCode), handleLocalUpdate);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        broadcastChannel?.removeEventListener("message", handleBroadcast);
        broadcastChannel?.close();
      },
    };
  }

  return {
    unsubscribe: () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(getRoomEventName(roomCode), handleLocalUpdate);
      broadcastChannel?.removeEventListener("message", handleBroadcast);
      broadcastChannel?.close();
    },
  };
}

import { supabase } from "@/integrations/supabase/client";
import type { TrackerState } from "./trackerStore";

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export async function loadCloudState(userId: string): Promise<TrackerState | null> {
  const { data, error } = await supabase
    .from("tracker_data")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.data as unknown as TrackerState;
}

export function saveCloudState(userId: string, state: TrackerState) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const payload = JSON.parse(JSON.stringify(state));
    const { error } = await supabase
      .from("tracker_data")
      .upsert({ user_id: userId, data: payload }, { onConflict: "user_id" });
    if (error) console.error("Cloud save failed:", error.message);
  }, 1500);
}

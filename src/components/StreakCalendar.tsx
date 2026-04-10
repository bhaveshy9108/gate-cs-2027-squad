import { useMemo } from "react";
import { type TrackerState } from "@/lib/trackerStore";
import { type Member, MEMBERS } from "@/lib/gateData";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface Props {
  state: TrackerState;
}

function getActivityMap(state: TrackerState, member: Member): Map<string, number> {
  const map = new Map<string, number>();
  for (const [key, entry] of Object.entries(state.checklist)) {
    if (!entry.completed || !entry.completedAt) continue;
    const [m] = key.split("|");
    if (m !== member) continue;
    const day = entry.completedAt.slice(0, 10);
    map.set(day, (map.get(day) || 0) + 1);
  }
  return map;
}

function getStreaks(activityMap: Map<string, number>): { current: number; longest: number } {
  if (activityMap.size === 0) return { current: 0, longest: 0 };
  
  const days = Array.from(activityMap.keys()).sort();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let longest = 1;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
    if (diffDays === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  const lastDay = days[days.length - 1];
  const current = (lastDay === today || lastDay === yesterday) ? streak : 0;

  return { current, longest };
}

function getLast120Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 119; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-primary/30";
  if (count <= 5) return "bg-primary/60";
  return "bg-primary";
}

export default function StreakCalendar({ state }: Props) {
  const days = useMemo(getLast120Days, []);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Daily Streaks</h2>
      </div>

      {MEMBERS.map((member) => {
        const activityMap = getActivityMap(state, member);
        const { current, longest } = getStreaks(activityMap);

        return (
          <div key={member} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-foreground text-sm">{member}</span>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{current}</p>
                  <p className="text-[10px] text-muted-foreground">Current</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{longest}</p>
                  <p className="text-[10px] text-muted-foreground">Longest</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-[3px]">
              {days.map((day) => {
                const count = activityMap.get(day) || 0;
                return (
                  <div
                    key={day}
                    className={cn("w-3 h-3 rounded-sm transition-colors", getColor(count))}
                    title={`${day}: ${count} topics`}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-1 mt-2 justify-end">
              <span className="text-[10px] text-muted-foreground">Less</span>
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <div className="w-3 h-3 rounded-sm bg-primary/30" />
              <div className="w-3 h-3 rounded-sm bg-primary/60" />
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

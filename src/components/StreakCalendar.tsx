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
  const current = lastDay === today || lastDay === yesterday ? streak : 0;

  return { current, longest };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface GridData {
  weeks: { day: string; count: number; date: Date }[][];
  monthLabels: { label: string; weekIndex: number }[];
}

function buildGrid(totalWeeks: number): GridData {
  const today = new Date();
  // Align to end of current week (Saturday), like LeetCode
  const endDay = new Date(today);
  // Move to Saturday
  endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

  const totalDays = totalWeeks * 7;
  const startDay = new Date(endDay);
  startDay.setDate(startDay.getDate() - totalDays + 1);

  const weeks: { day: string; count: number; date: Date }[][] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  let currentDate = new Date(startDay);
  let weekIndex = 0;
  let currentWeek: { day: string; count: number; date: Date }[] = [];

  while (currentDate <= endDay) {
    const dayOfWeek = currentDate.getDay(); // 0=Sun

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
      weekIndex++;
    }

    const month = currentDate.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ label: MONTH_NAMES[month], weekIndex });
      lastMonth = month;
    }

    currentWeek.push({
      day: currentDate.toISOString().slice(0, 10),
      count: 0,
      date: new Date(currentDate),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return { weeks, monthLabels };
}

function getColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-primary/30";
  if (count <= 5) return "bg-primary/60";
  return "bg-primary";
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function StreakCalendar({ state }: Props) {
  const totalWeeks = 22; // ~5 months
  const grid = useMemo(() => buildGrid(totalWeeks), []);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Daily Streaks</h2>
      </div>

      {MEMBERS.map((member) => {
        const activityMap = getActivityMap(state, member);
        const { current, longest } = getStreaks(activityMap);

        // Fill counts into grid
        const filledWeeks = grid.weeks.map((week) =>
          week.map((cell) => ({
            ...cell,
            count: activityMap.get(cell.day) || 0,
          }))
        );

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

            {/* Month labels */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-0">
                <div className="flex ml-7">
                  {grid.monthLabels.map((m, i) => {
                    const nextIdx = grid.monthLabels[i + 1]?.weekIndex ?? grid.weeks.length;
                    const span = nextIdx - m.weekIndex;
                    return (
                      <span
                        key={`${m.label}-${m.weekIndex}`}
                        className="text-[10px] text-muted-foreground"
                        style={{ width: `${span * 15}px`, flexShrink: 0 }}
                      >
                        {m.label}
                      </span>
                    );
                  })}
                </div>

                {/* Grid: day labels + cells */}
                <div className="flex gap-0">
                  {/* Day labels column */}
                  <div className="flex flex-col gap-[3px] mr-1 pt-0">
                    {DAY_LABELS.map((label, i) => (
                      <div key={i} className="h-3 flex items-center">
                        <span className="text-[9px] text-muted-foreground w-6 text-right pr-1">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Weeks columns */}
                  <div className="flex gap-[3px]">
                    {filledWeeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-[3px]">
                        {Array.from({ length: 7 }).map((_, di) => {
                          const cell = week.find((c) => c.date.getDay() === di);
                          if (!cell) {
                            return <div key={di} className="w-3 h-3" />;
                          }
                          return (
                            <div
                              key={di}
                              className={cn(
                                "w-3 h-3 rounded-sm transition-colors",
                                getColor(cell.count)
                              )}
                              title={`${cell.day}: ${cell.count} topics`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

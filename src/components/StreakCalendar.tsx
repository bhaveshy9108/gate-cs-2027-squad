import { useMemo } from "react";
import {
  formatStudyDuration,
  getStudyDaySummaries,
  type TrackerState,
} from "@/lib/trackerStore";
import { type Member, MEMBERS } from "@/lib/gateData";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

interface Props {
  state: TrackerState;
}

interface DayActivity {
  active: boolean;
  effectiveMs: number;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getLiveTimerDayKeys(state: TrackerState, member: Member): string[] {
  const timer = state.studyTimer;
  if (timer.member !== member || !timer.startedAt || timer.status === "idle") return [];

  const start = new Date(timer.startedAt);
  const end = timer.status === "paused" && timer.lastPausedAt ? new Date(timer.lastPausedAt) : new Date();
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return [];

  const keys: string[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= endDay) {
    keys.push(toLocalDateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

function getActivityMap(state: TrackerState, member: Member): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();
  for (const day of getStudyDaySummaries(state, 370)) {
    if (day.effectiveMs <= 0 && day.sessionCount === 0) continue;
    map.set(day.date, {
      active: true,
      effectiveMs: day.effectiveMs,
    });
  }

  for (const dayKey of getLiveTimerDayKeys(state, member)) {
    const current = map.get(dayKey);
    map.set(dayKey, {
      active: true,
      effectiveMs: current?.effectiveMs ?? 0,
    });
  }

  return map;
}

function getStreaks(activityMap: Map<string, DayActivity>): { current: number; longest: number } {
  if (activityMap.size === 0) return { current: 0, longest: 0 };

  const days = Array.from(activityMap.keys()).sort();
  const today = toLocalDateKey(new Date());
  const yesterday = toLocalDateKey(addDays(new Date(), -1));

  let longest = 1;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(`${days[i - 1]}T00:00:00`);
    const curr = new Date(`${days[i]}T00:00:00`);
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
  weeks: { day: string; activity: DayActivity | null; date: Date }[][];
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

  const weeks: { day: string; activity: DayActivity | null; date: Date }[][] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  let currentDate = new Date(startDay);
  let weekIndex = 0;
  let currentWeek: { day: string; activity: DayActivity | null; date: Date }[] = [];

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
      day: toLocalDateKey(currentDate),
      activity: null,
      date: new Date(currentDate),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return { weeks, monthLabels };
}

function getColor(activity: DayActivity | null): string {
  if (!activity?.active) return "bg-muted/80";
  const hours = activity.effectiveMs / 3600000;
  if (hours < 1) return "bg-rose-200";
  if (hours < 3) return "bg-rose-300";
  if (hours < 5) return "bg-rose-500";
  return "bg-rose-700";
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function StreakCalendar({ state }: Props) {
  const totalWeeks = 53; // Last 12 months
  const grid = useMemo(() => buildGrid(totalWeeks), []);

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Activity Heatmap</h2>
      </div>

      {MEMBERS.map((member) => {
        const activityMap = getActivityMap(state, member);
        const { current, longest } = getStreaks(activityMap);

        // Fill study activity into the heatmap grid.
        const filledWeeks = grid.weeks.map((week) =>
          week.map((cell) => ({
            ...cell,
            activity: activityMap.get(cell.day) ?? null,
          }))
        );

        return (
          <div key={member} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold text-foreground text-sm">{member}</span>
                <p className="text-xs text-muted-foreground">Timer activity across the last 12 months</p>
              </div>
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
            <div className="overflow-x-auto pb-2">
              <div className="inline-block min-w-0">
                <div className="flex ml-7">
                  {grid.monthLabels.map((m, i) => {
                    const nextIdx = grid.monthLabels[i + 1]?.weekIndex ?? grid.weeks.length;
                    const span = nextIdx - m.weekIndex;
                    return (
                      <span
                        key={`${m.label}-${m.weekIndex}`}
                        className="text-[10px] text-muted-foreground"
                        style={{ width: `${span * 18}px`, flexShrink: 0 }}
                      >
                        {m.label}
                      </span>
                    );
                  })}
                </div>

                {/* Grid: day labels + cells */}
                <div className="flex gap-0">
                  {/* Day labels column */}
                  <div className="flex flex-col gap-1 mr-1 pt-0">
                    {DAY_LABELS.map((label, i) => (
                      <div key={i} className="h-4 flex items-center">
                        <span className="text-[9px] text-muted-foreground w-6 text-right pr-1">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Weeks columns */}
                  <div className="flex gap-1">
                    {filledWeeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-1">
                        {Array.from({ length: 7 }).map((_, di) => {
                          const cell = week.find((c) => c.date.getDay() === di);
                          if (!cell) {
                            return <div key={di} className="w-4 h-4" />;
                          }
                          const tooltipDate = cell.date.toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          });
                          const activeLabel = cell.activity?.active
                            ? `${formatStudyDuration(cell.activity.effectiveMs)} active`
                            : "No timer activity";
                          return (
                            <div
                              key={di}
                              className={cn(
                                "w-4 h-4 rounded border border-border/40 transition-colors hover:ring-2 hover:ring-primary/40",
                                getColor(cell.activity)
                              )}
                              title={`${tooltipDate}: ${activeLabel}`}
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
              <div className="w-3 h-3 rounded-sm bg-muted/80 border border-border/40" />
              <div className="w-3 h-3 rounded-sm bg-rose-200 border border-border/40" />
              <div className="w-3 h-3 rounded-sm bg-rose-300 border border-border/40" />
              <div className="w-3 h-3 rounded-sm bg-rose-500 border border-border/40" />
              <div className="w-3 h-3 rounded-sm bg-rose-700 border border-border/40" />
              <span className="text-[10px] text-muted-foreground">More active hrs</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

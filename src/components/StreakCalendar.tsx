import { useMemo, useState, type MouseEvent } from "react";
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

interface HeatmapTooltip {
  x: number;
  y: number;
  date: string;
  activeLabel: string;
}

interface ActivityReadout {
  date: string;
  activeLabel: string;
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

interface GridData {
  months: {
    label: string;
    days: { day: string; activity: DayActivity | null; date: Date }[];
  }[];
}

function buildGrid(): GridData {
  const startDay = new Date(2026, 1, 1);
  const today = new Date();
  const endDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const months: GridData["months"] = [];

  let currentMonth = new Date(startDay.getFullYear(), startDay.getMonth(), 1);
  while (currentMonth <= endDay) {
    const label = currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const days: GridData["months"][number]["days"] = [];
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

    for (let day = 1; day <= lastDayOfMonth; day += 1) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      if (date > endDay) break;
      days.push({
        day: toLocalDateKey(date),
        activity: null,
        date,
      });
    }

    months.push({ label, days });

    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }

  return { months };
}

function getColor(activity: DayActivity | null): string {
  if (!activity?.active) return "bg-slate-200";
  const hours = activity.effectiveMs / 3600000;
  if (hours < 1) return "bg-red-200";
  if (hours < 3) return "bg-red-300";
  if (hours < 5) return "bg-red-500";
  return "bg-red-700";
}

function getTooltipPosition(x: number, y: number): { x: number; y: number } {
  if (typeof window === "undefined") return { x, y };
  return {
    x: Math.min(Math.max(12, x), window.innerWidth - 190),
    y: Math.min(Math.max(12, y), window.innerHeight - 72),
  };
}

export default function StreakCalendar({ state }: Props) {
  const grid = useMemo(() => buildGrid(), []);
  const [tooltip, setTooltip] = useState<HeatmapTooltip | null>(null);
  const [readout, setReadout] = useState<ActivityReadout | null>(null);

  const showTooltip = (
    event: MouseEvent<HTMLButtonElement>,
    date: string,
    activeLabel: string
  ) => {
    setReadout({ date, activeLabel });
    const position = getTooltipPosition(event.clientX + 14, event.clientY + 14);
    setTooltip({
      x: position.x,
      y: position.y,
      date,
      activeLabel,
    });
  };

  return (
    <div className="mt-6 space-y-4">
      {MEMBERS.map((member) => {
        const activityMap = getActivityMap(state, member);
        const { current, longest } = getStreaks(activityMap);

        return (
          <div key={member} className="relative rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Activity Heatmap</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value="feb-2026-now"
                  aria-label="Activity heatmap range"
                  className="h-9 min-w-[210px] rounded border border-border bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  onChange={() => undefined}
                >
                  <option value="feb-2026-now">Feb 2026 to now</option>
                </select>
                <div className="rounded border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
                  Public
                </div>
              </div>
            </div>

            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  Current streak {current}
                </span>
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  Longest {longest}
                </span>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm">
                {readout ? (
                  <>
                    <span className="font-semibold">{readout.date}</span>
                    <span className="ml-2 text-muted-foreground">{readout.activeLabel}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Hover a square to see active hrs</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto pb-3">
              <div className="flex w-max min-w-full gap-8">
                {grid.months.map((month) => {
                  const filledDays = month.days.map((cell) => ({
                    ...cell,
                    activity: activityMap.get(cell.day) ?? null,
                  }));

                  return (
                    <div key={month.label} className="shrink-0">
                      <div className="grid grid-flow-col grid-rows-7 gap-[5px]">
                        {filledDays.map((cell) => {
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
                            <button
                              type="button"
                              key={cell.day}
                              className={cn(
                                "h-5 w-5 rounded-[0.3rem] border border-border/50 transition-transform hover:scale-110 hover:ring-2 hover:ring-red-300 focus:outline-none focus:ring-2 focus:ring-primary/50",
                                getColor(cell.activity)
                              )}
                              aria-label={`${tooltipDate}: ${activeLabel}`}
                              onMouseEnter={(event) => showTooltip(event, tooltipDate, activeLabel)}
                              onMouseMove={(event) => showTooltip(event, tooltipDate, activeLabel)}
                              onClick={(event) => showTooltip(event, tooltipDate, activeLabel)}
                              onMouseLeave={() => setTooltip(null)}
                              onFocus={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                const position = getTooltipPosition(rect.right + 12, rect.top);
                                setReadout({ date: tooltipDate, activeLabel });
                                setTooltip({
                                  x: position.x,
                                  y: position.y,
                                  date: tooltipDate,
                                  activeLabel,
                                });
                              }}
                              onBlur={() => setTooltip(null)}
                            />
                          );
                        })}
                      </div>
                      <p className="mt-2 text-center text-[10px] text-muted-foreground">{month.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1 mt-2 justify-end">
              <span className="text-[10px] text-muted-foreground">Less</span>
              <div className="w-3 h-3 rounded-sm bg-slate-200 border border-border/40" />
              <div className="w-3 h-3 rounded-sm bg-red-200 border border-border/40" />
              <div className="w-3 h-3 rounded-sm bg-red-300 border border-border/40" />
              <div className="w-3 h-3 rounded-sm bg-red-500 border border-border/40" />
              <div className="w-3 h-3 rounded-sm bg-red-700 border border-border/40" />
              <span className="text-[10px] text-muted-foreground">More active hrs</span>
            </div>

            {tooltip && (
              <div
                className="pointer-events-none fixed z-[9999] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-xl"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                }}
              >
                <p className="font-semibold">{tooltip.date}</p>
                <p className="text-slate-600">{tooltip.activeLabel}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

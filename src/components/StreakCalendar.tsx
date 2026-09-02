import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  const totalWeeks = 53; // Last 12 months
  const grid = useMemo(() => buildGrid(totalWeeks), []);
  const [tooltip, setTooltip] = useState<HeatmapTooltip | null>(null);
  const [readout, setReadout] = useState<ActivityReadout | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const scrollToLatest = () => {
      scroller.scrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    };
    scrollToLatest();
    const frame = window.requestAnimationFrame(scrollToLatest);
    const timeout = window.setTimeout(scrollToLatest, 150);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, []);

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

        // Fill study activity into the heatmap grid.
        const filledWeeks = grid.weeks.map((week) =>
          week.map((cell) => ({
            ...cell,
            activity: activityMap.get(cell.day) ?? null,
          }))
        );

        return (
          <div key={member} className="relative rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Activity Heatmap</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value="last-12-months"
                  aria-label="Activity heatmap range"
                  className="h-9 min-w-[190px] rounded border border-border bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  onChange={() => undefined}
                >
                  <option value="last-12-months">Default (Last 12 months)</option>
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

            <div ref={scrollerRef} className="overflow-x-scroll pb-3">
              <div className="w-max min-w-[1040px]">
                <div className="flex gap-[5px]">
                  {filledWeeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[5px]">
                      {Array.from({ length: 7 }).map((_, di) => {
                        const cell = week.find((c) => c.date.getDay() === di);
                        if (!cell) {
                          return <div key={di} className="h-5 w-5" />;
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
                          <button
                            type="button"
                            key={di}
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
                  ))}
                </div>

                <div className="mt-2 flex">
                  {grid.monthLabels.map((m, i) => {
                    const nextIdx = grid.monthLabels[i + 1]?.weekIndex ?? grid.weeks.length;
                    const span = nextIdx - m.weekIndex;
                    return (
                      <span
                        key={`${m.label}-${m.weekIndex}`}
                        className="text-[10px] text-muted-foreground"
                        style={{ width: `${span * 25}px`, flexShrink: 0 }}
                      >
                        {m.label}
                      </span>
                    );
                  })}
                </div>
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

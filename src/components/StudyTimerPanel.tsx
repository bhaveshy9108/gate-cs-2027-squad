import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  Square,
  TimerReset,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SUBJECTS, type Member } from "@/lib/gateData";
import {
  deleteStudySession,
  formatStudyDuration,
  getCurrentStudyTimerElapsed,
  getStudyDailyTotals,
  pauseStudyTimer,
  resetStudyTimer,
  resumeStudyTimer,
  startStudyTimer,
  stopStudyTimer,
  type TrackerState,
} from "@/lib/trackerStore";
import { cn } from "@/lib/utils";

interface Props {
  state: TrackerState;
  member: Member;
  onUpdate: (s: TrackerState) => void;
}

function formatShortClock(iso?: string) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function StudyTimerPanel({ state, member, onUpdate }: Props) {
  const timer = state.studyTimer;
  const [selectedSubjectId, setSelectedSubjectId] = useState(timer.subjectId ?? SUBJECTS[0]?.id ?? "");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.subjectId && timer.subjectId !== selectedSubjectId) {
      setSelectedSubjectId(timer.subjectId);
    }
  }, [selectedSubjectId, timer.subjectId]);

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer.status, timer.lastStartedAt]);

  const activeSubject = SUBJECTS.find((subject) => subject.id === (timer.subjectId ?? selectedSubjectId)) ?? null;
  const effectiveMs = getCurrentStudyTimerElapsed(state, new Date(now));
  const chartData = useMemo(
    () =>
      getStudyDailyTotals(state, 7).map((entry) => ({
        ...entry,
        hours: Number((entry.effectiveMs / 3600000).toFixed(2)),
      })),
    [state]
  );

  const weekTotalMs = chartData.reduce((sum, entry) => sum + entry.effectiveMs, 0);
  const todayMs = chartData[chartData.length - 1]?.effectiveMs ?? 0;
  const recentSessions = [...state.studySessions]
    .filter((session) => session.member === member)
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
    .slice(0, 5);

  const start = () => {
    const subject = SUBJECTS.find((entry) => entry.id === selectedSubjectId) ?? SUBJECTS[0];
    onUpdate(startStudyTimer(state, member, subject?.id, subject?.name));
  };

  const pause = () => onUpdate(pauseStudyTimer(state));
  const resume = () => onUpdate(resumeStudyTimer(state));
  const stop = () => onUpdate(stopStudyTimer(state));
  const reset = () => onUpdate(resetStudyTimer(state));
  const deleteSession = (sessionId: string) => {
    const session = state.studySessions.find((entry) => entry.id === sessionId);
    const confirmed = window.confirm(
      `Delete this study session${session?.subjectName ? ` for ${session.subjectName}` : ""}? This only removes the session record.`
    );
    if (!confirmed) return;
    onUpdate(deleteStudySession(state, sessionId));
  };

  const statusLabel =
    timer.status === "running" ? "Running" : timer.status === "paused" ? "Paused" : "Ready to start";

  return (
    <div className="space-y-5">
      <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-5 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Effective study timer</p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Study only counts when the timer is running
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Start when you begin a session, pause for breaks, resume when you’re back, and stop when the session is done.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Status</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{statusLabel}</p>
            <p className="text-xs text-muted-foreground">{timer.subjectName ?? activeSubject?.name ?? "No subject selected"}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Current session</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{formatStudyDuration(effectiveMs)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Counts only active study time</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Today</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{formatStudyDuration(todayMs)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Effective study so far</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">This week</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{formatStudyDuration(weekTotalMs)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{state.studySessions.length} sessions saved</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Subject</label>
              <select
                value={timer.status === "idle" ? selectedSubjectId : timer.subjectId ?? selectedSubjectId}
                onChange={(event) => setSelectedSubjectId(event.target.value)}
                disabled={timer.status !== "idle"}
                className="mt-2 w-full rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                The timer is attached to the subject you started with.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {timer.status === "idle" ? (
                <button
                  onClick={start}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
                >
                  <Play className="h-4 w-4" />
                  Start
                </button>
              ) : timer.status === "running" ? (
                <button
                  onClick={pause}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={resume}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              )}

              <button
                onClick={stop}
                disabled={timer.status === "idle"}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            </div>

            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground hover:shadow-md"
            >
              <TimerReset className="h-4 w-4" />
              Reset timer
            </button>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Current selection</p>
              <p className="mt-1">{timer.subjectName ?? activeSubject?.name ?? "No subject selected yet"}</p>
              <p className="mt-1">Started at {formatShortClock(timer.startedAt)}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Effective study graph</p>
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Last 7 days</h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                Active minutes only
              </div>
            </div>

            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `${value}h`} />
                  <Tooltip
                    formatter={(value) => [formatStudyDuration((value as number) * 3600000), "Effective study"]}
                    labelClassName="text-xs font-medium"
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid rgba(148,163,184,0.2)",
                      background: "rgba(255,255,255,0.98)",
                    }}
                  />
                  <Bar dataKey="hours" radius={[12, 12, 0, 0]} fill="url(#studyBarGradient)" />
                  <defs>
                    <linearGradient id="studyBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-5 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Recent sessions</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Your latest effective study blocks</h3>
          </div>
          <p className="text-xs text-muted-foreground">{recentSessions.length} shown</p>
        </div>

        <div className="mt-4 space-y-3">
          {recentSessions.length > 0 ? (
            recentSessions.map((session) => (
              <div key={session.id} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{session.subjectName ?? "Study session"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(session.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {formatShortClock(session.startedAt)} - {formatShortClock(session.endedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                    {formatStudyDuration(session.effectiveMs)}
                  </div>
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-destructive/30 hover:text-destructive"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Start your first session to build the effective study graph.</p>
          )}
        </div>
      </div>
    </div>
  );
}

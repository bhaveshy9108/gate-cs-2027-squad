import { Clock3, Pause, Play, Square, BookOpen } from "lucide-react";

import {
  formatStudyDuration,
  getCurrentStudyTimerElapsed,
  pauseStudyTimer,
  resumeStudyTimer,
  stopStudyTimer,
  type TrackerState,
} from "@/lib/trackerStore";
import { cn } from "@/lib/utils";

type Props = {
  state: TrackerState;
  onUpdate: (next: TrackerState) => void;
  onOpenSection?: (section: string) => void;
};

export default function StudyTimerFloating({ state, onUpdate, onOpenSection }: Props) {
  const timer = state.studyTimer;
  if (timer.status === "idle") return null;

  const elapsedMs = getCurrentStudyTimerElapsed(state);
  const isRunning = timer.status === "running";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-[min(92vw,18rem)]">
      <div className="pointer-events-auto rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Study timer</p>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{timer.subjectName ?? "Study session"}</p>
            <p className="text-xs text-muted-foreground">{isRunning ? "Running now" : "Paused"}</p>
          </div>
          <div className="rounded-xl bg-primary/10 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Live</p>
            <p className="text-lg font-semibold text-primary">{formatStudyDuration(elapsedMs)}</p>
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300",
              isRunning ? "w-full animate-pulse" : "w-[72%]"
            )}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onUpdate(isRunning ? pauseStudyTimer(state) : resumeStudyTimer(state))}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isRunning ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={() => onUpdate(stopStudyTimer(state))}
            className="inline-flex items-center justify-center rounded-xl border border-border/70 bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary/30"
            title="Stop session"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenSection?.("study")}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/30"
        >
          <BookOpen className="h-4 w-4" />
          Open Study
        </button>
      </div>
    </div>
  );
}

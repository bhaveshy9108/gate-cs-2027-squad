import { useEffect, useState } from "react";
import { Clock3, Pause, Play, Square } from "lucide-react";
import {
  formatStudyDuration,
  getCurrentStudyTimerElapsed,
  pauseStudyTimer,
  resumeStudyTimer,
  stopStudyTimer,
  type TrackerState,
} from "@/lib/trackerStore";

interface StudyTimerFloatingProps {
  state: TrackerState;
  onUpdate: (nextState: TrackerState) => void;
  onOpenStudy?: () => void;
}

export function StudyTimerFloating({ state, onUpdate, onOpenStudy }: StudyTimerFloatingProps) {
  const [, setTick] = useState(0);
  const timer = state.studyTimer;

  useEffect(() => {
    if (!timer || timer.status !== "running") return;
    const intervalId = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [timer?.status, timer?.lastStartedAt]);

  if (!timer || timer.status === "idle") {
    return null;
  }

  const isRunning = timer.status === "running";
  const elapsedMs = getCurrentStudyTimerElapsed(state, new Date());
  const subject = timer.subjectName || "Study session";

  const handleToggle = () => {
    onUpdate(isRunning ? pauseStudyTimer(state) : resumeStudyTimer(state));
  };

  const handleStop = () => {
    onUpdate(stopStudyTimer(state));
  };

  const handleOpenStudy = () => {
    onOpenStudy?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-5 right-5 z-[90] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border/80 bg-card/95 p-4 shadow-2xl shadow-slate-950/15 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            <Clock3 className="h-4 w-4 text-primary" />
            Study Timer
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-foreground">{subject}</p>
          <p className="text-xs text-muted-foreground">{isRunning ? "Running" : "Paused"}</p>
        </div>

        <div className="shrink-0 rounded-2xl bg-primary/10 px-4 py-3 text-center text-primary">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em]">Live</p>
          <p className="text-lg font-bold">{formatStudyDuration(elapsedMs)}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(8, (elapsedMs % 3600000) / 36000))}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? "Pause" : "Resume"}
        </button>
        <button
          type="button"
          onClick={handleStop}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          <Square className="h-4 w-4" />
          Stop
        </button>
      </div>

      <button
        type="button"
        onClick={handleOpenStudy}
        className="mt-2 h-10 w-full rounded-xl border border-border bg-background text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        Open Study
      </button>
    </div>
  );
}

export default StudyTimerFloating;

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
import { cn } from "@/lib/utils";

interface Props {
  state: TrackerState;
  onUpdate: (s: TrackerState) => void;
  onOpenStudy: () => void;
}

export default function StudyTimerFloating({ state, onUpdate, onOpenStudy }: Props) {
  const timer = state.studyTimer;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer.status, timer.lastStartedAt]);

  if (timer.status === "idle") return null;

  const elapsedMs = getCurrentStudyTimerElapsed(state, new Date(now));

  const handlePauseResume = () => {
    onUpdate(timer.status === "running" ? pauseStudyTimer(state) : resumeStudyTimer(state));
  };

  const handleStop = () => {
    onUpdate(stopStudyTimer(state));
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] w-[min(92vw,20rem)] rounded-[1.5rem] border border-border/70 bg-card/95 p-4 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Study timer
            </p>
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-foreground">
            {timer.subjectName ?? "Study session"}
          </p>
          <p className="text-xs text-muted-foreground">
            {timer.status === "running" ? "Running now" : "Paused"}
          </p>
        </div>
        <div className="pointer-events-auto rounded-2xl bg-primary/10 px-3 py-2 text-right">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Live</p>
          <p className="text-lg font-semibold text-primary">{formatStudyDuration(elapsedMs)}</p>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300",
            timer.status === "running" ? "w-full animate-pulse" : "w-[72%]"
          )}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handlePauseResume}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
        >
          {timer.status === "running" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {timer.status === "running" ? "Pause" : "Resume"}
        </button>
        <button
          onClick={handleStop}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <Square className="h-4 w-4" />
          Stop
        </button>
      </div>

      <button
        onClick={onOpenStudy}
        className="mt-2 w-full rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
      >
        Open Study tab
      </button>
    </div>
  );
}

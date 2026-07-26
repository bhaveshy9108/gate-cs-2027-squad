import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookMarked, BookOpen, CalendarDays, Clock3, Sparkles, RefreshCw, Target } from "lucide-react";

import { SUBJECTS } from "@/lib/gateData";
import { type TrackerState, getDifficultyStats, getSubjectProgress } from "@/lib/trackerStore";
import { cn } from "@/lib/utils";

const SECTION_META = [
  { key: "study", label: "Study", icon: BookOpen },
  { key: "revision", label: "Revision", icon: RefreshCw },
  { key: "pyq", label: "PYQs", icon: BookMarked },
] as const;

type SectionKey = (typeof SECTION_META)[number]["key"];

interface Props {
  state: TrackerState;
  onOpenSection?: (section: SectionKey) => void;
}

type SubjectSummary = {
  id: string;
  name: string;
  weightage: number;
  counts: Record<SectionKey, { done: number; total: number; pct: number }>;
  overall: { done: number; total: number; pct: number };
};

type ProgressSnapshot = {
  label: string;
  value: number;
  description: string;
  icon: typeof Clock3;
};

function getLocalStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getWeekStart(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  return getLocalStartOfDay(start);
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getProgressSnapshots(state: TrackerState, member: string): ProgressSnapshot[] {
  const now = new Date();
  const todayStart = getLocalStartOfDay(now);
  const weekStart = getWeekStart(now);
  const monthStart = getMonthStart(now);

  const entries = Object.entries(state.checklist).filter(([key, entry]) => {
    if (!entry.completed || !entry.completedAt || !key.startsWith(`${member}|`)) return false;
    const completedAt = new Date(entry.completedAt);
    return Number.isFinite(completedAt.getTime());
  });

  const counts = entries.reduce(
    (acc, [, entry]) => {
      const completedAt = new Date(entry.completedAt ?? "");
      if (completedAt >= todayStart) acc.today++;
      if (completedAt >= weekStart) acc.week++;
      if (completedAt >= monthStart) acc.month++;
      return acc;
    },
    { today: 0, week: 0, month: 0 }
  );

  return [
    {
      label: "Today",
      value: counts.today,
      description: counts.today === 1 ? "completion" : "completions",
      icon: Clock3,
    },
    {
      label: "This week",
      value: counts.week,
      description: counts.week === 1 ? "completion" : "completions",
      icon: CalendarDays,
    },
    {
      label: "This month",
      value: counts.month,
      description: counts.month === 1 ? "completion" : "completions",
      icon: Target,
    },
  ];
}

export default function OverallDashboard({ state, onOpenSection }: Props) {
  const member = state.currentMember;
  const [selectedSubjectId, setSelectedSubjectId] = useState(SUBJECTS[0]?.id ?? "");

  useEffect(() => {
    if (!SUBJECTS.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(SUBJECTS[0]?.id ?? "");
    }
  }, [selectedSubjectId]);

  const subjectSummaries = useMemo<SubjectSummary[]>(
    () =>
      SUBJECTS.map((subject) => {
        const counts = SECTION_META.reduce((acc, section) => {
          const progress = getSubjectProgress(state, member, section.key, subject.id);
          const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
          acc[section.key] = { ...progress, pct };
          return acc;
        }, {} as Record<SectionKey, { done: number; total: number; pct: number }>);

        const overallDone = SECTION_META.reduce((sum, section) => sum + counts[section.key].done, 0);
        const overallTotal = SECTION_META.reduce((sum, section) => sum + counts[section.key].total, 0);

        return {
          id: subject.id,
          name: subject.name,
          weightage: subject.weightage,
          counts,
          overall: {
            done: overallDone,
            total: overallTotal,
            pct: overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0,
          },
        };
      }),
    [state, member]
  );

  const selectedSubject = subjectSummaries.find((subject) => subject.id === selectedSubjectId) ?? subjectSummaries[0];
  const overallDone = subjectSummaries.reduce((sum, subject) => sum + subject.overall.done, 0);
  const overallTotal = subjectSummaries.reduce((sum, subject) => sum + subject.overall.total, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;
  const progressSnapshots = useMemo(() => getProgressSnapshots(state, member), [state, member]);
  const totalDifficultyCount = Object.values(getDifficultyStats(state)).reduce((sum, value) => sum + value, 0);
  const weakestSubject = subjectSummaries
    .filter((subject) => subject.overall.total > 0)
    .sort((a, b) => a.overall.pct - b.overall.pct)[0];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="min-w-0 rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Overall</p>
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{overallPct}%</p>
              <p className="mt-1 text-sm text-muted-foreground">{overallDone}/{overallTotal} tasks done</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500")}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              {subjectSummaries.length} subjects tracked
            </span>
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              {totalDifficultyCount} difficulty tags
            </span>
            {weakestSubject ? (
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                Focus: {weakestSubject.name} {weakestSubject.overall.pct}%
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:col-span-3">
          {progressSnapshots.map((snapshot) => {
            const Icon = snapshot.icon;
            return (
              <div key={snapshot.label} className="rounded-[1.35rem] border border-border/70 bg-card/90 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">{snapshot.label}</p>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{snapshot.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{snapshot.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Subjects</p>
              </div>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">Subjects</h3>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">Tap a row</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {subjectSummaries.map((subject) => {
              const isSelected = subject.id === selectedSubject?.id;
              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubjectId(subject.id)}
                  className={cn(
                    "group flex min-h-[8.5rem] min-w-0 flex-col rounded-3xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                    isSelected ? "border-primary/30 bg-primary/5 shadow-lg shadow-primary/10" : "border-border/70 bg-background/70 hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="line-clamp-2 break-words text-[13px] font-semibold leading-snug text-foreground">
                        {subject.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">~{subject.weightage} marks</p>
                    </div>
                    <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">{subject.overall.pct}%</div>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                      style={{ width: `${subject.overall.pct}%` }}
                    />
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    {SECTION_META.map((section) => {
                      const value = subject.counts[section.key];
                      return (
                        <span
                          key={section.key}
                              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", section.key === "study" ? "bg-primary" : section.key === "revision" ? "bg-accent" : "bg-yellow-500")} />
                              {section.label} {value.pct}%
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookMarked, BookOpen, Sparkles, RefreshCw } from "lucide-react";

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

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-[1.5rem] border border-border/70 bg-card/90 p-3 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Overall</p>
          </div>
          <div className="mt-4 flex min-w-0 items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{overallPct}%</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{overallDone}/{overallTotal} done</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500")}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Subjects</p>
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Subjects</h3>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">Tap a row</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {subjectSummaries.map((subject) => {
              const isSelected = subject.id === selectedSubject?.id;
              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubjectId(subject.id)}
                  className={cn(
                    "group min-w-0 rounded-3xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                    isSelected ? "border-primary/30 bg-primary/5 shadow-lg shadow-primary/10" : "border-border/70 bg-background/70 hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="break-words text-[13px] font-semibold leading-snug text-foreground">
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

                  <div className="mt-3 flex flex-wrap gap-2">
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

        <div className="space-y-5">
          <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Selected</p>
                </div>
                <h3 className="mt-2 break-words text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">
                  {selectedSubject?.name ?? "Pick a subject"}
                </h3>
              </div>
              <div className="rounded-2xl bg-primary/10 px-3 py-2 text-right">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Total</p>
                <p className="text-lg font-semibold text-primary">{selectedSubject?.overall.pct ?? 0}%</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 sm:space-y-3">
              {selectedSubject ? (
                SECTION_META.map((section) => {
                  const Icon = section.icon;
                  const value = selectedSubject.counts[section.key];
                  return (
                    <div key={section.key} className="rounded-2xl border border-border/70 bg-background/70 p-3 sm:p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-8 sm:w-8">
                            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground sm:text-base">{section.label}</p>
                            <p className="text-[11px] text-muted-foreground sm:text-xs">
                              {value.done}/{value.total} topics
                            </p>
                          </div>
                        </div>
                        <p className="text-base font-semibold text-foreground sm:text-lg">{value.pct}%</p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            section.key === "study" ? "bg-primary" : section.key === "revision" ? "bg-accent" : "bg-yellow-500"
                          )}
                          style={{ width: `${value.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Select a subject to see the deeper breakdown.</p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {SECTION_META.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.key}
                    onClick={() => onOpenSection?.(section.key)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:px-4"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    Open {section.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

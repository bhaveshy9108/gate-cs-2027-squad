import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookMarked, BookOpen, Flame, Sparkles, RefreshCw, Target, Trophy } from "lucide-react";

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

  const difficultyStats = useMemo(() => getDifficultyStats(state), [state]);
  const totalTagged = difficultyStats.easy + difficultyStats.medium + difficultyStats.hard;

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
  const sortedSubjects = [...subjectSummaries].sort((a, b) => a.overall.pct - b.overall.pct || a.name.localeCompare(b.name));
  const weakestSubject = sortedSubjects[0];
  const strongestSubject = [...subjectSummaries].sort((a, b) => b.overall.pct - a.overall.pct || a.name.localeCompare(b.name))[0];

  const overallDone = subjectSummaries.reduce((sum, subject) => sum + subject.overall.done, 0);
  const overallTotal = subjectSummaries.reduce((sum, subject) => sum + subject.overall.total, 0);
  const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Overall</p>
          </div>
          <div className="mt-4 flex min-w-0 items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{overallPct}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {overallDone}/{overallTotal} tasks completed
              </p>
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

        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Best subject</p>
          </div>
          <p className="mt-4 break-words text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
            {strongestSubject?.name ?? "No subject yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {strongestSubject ? `${strongestSubject.overall.pct}% complete` : "Start checking topics to unlock this card"}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Next focus</p>
          </div>
          <p className="mt-4 break-words text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
            {weakestSubject?.name ?? "Nothing to focus yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {weakestSubject ? `${weakestSubject.overall.pct}% complete` : "Pick a subject to see the weakest area"}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Difficulty</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
              <p className="text-lg font-semibold text-foreground">{difficultyStats.easy}</p>
              <p className="text-[11px] text-muted-foreground">Easy</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
              <p className="text-lg font-semibold text-foreground">{difficultyStats.medium}</p>
              <p className="text-[11px] text-muted-foreground">Medium</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
              <p className="text-lg font-semibold text-foreground">{difficultyStats.hard}</p>
              <p className="text-[11px] text-muted-foreground">Hard</p>
            </div>
          </div>
          {totalTagged > 0 && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="flex h-full">
                <div className="bg-accent" style={{ width: `${(difficultyStats.easy / totalTagged) * 100}%` }} />
                <div className="bg-yellow-500" style={{ width: `${(difficultyStats.medium / totalTagged) * 100}%` }} />
                <div className="bg-destructive" style={{ width: `${(difficultyStats.hard / totalTagged) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Subjects</p>
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Interactive progress board</h3>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">Click a subject to inspect it</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {subjectSummaries.map((subject) => {
              const isSelected = subject.id === selectedSubject?.id;
              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubjectId(subject.id)}
                  className={cn(
                    "group min-w-0 rounded-3xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                    isSelected ? "border-primary/30 bg-primary/5 shadow-lg shadow-primary/10" : "border-border/70 bg-background/70 hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="break-words text-sm font-semibold leading-tight text-foreground sm:text-base">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">~{subject.weightage} marks</p>
                    </div>
                    <div className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {subject.overall.pct}%
                    </div>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                      style={{ width: `${subject.overall.pct}%` }}
                    />
                  </div>

                  <div className="mt-4 grid gap-2 xl:grid-cols-3">
                    {SECTION_META.map((section) => {
                      const Icon = section.icon;
                      const value = subject.counts[section.key];
                      return (
                        <div key={section.key} className="rounded-2xl border border-border/70 bg-card/80 p-3">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                            {section.label}
                          </div>
                          <div className="mt-2 flex items-end justify-between gap-2">
                            <p className="text-base font-semibold text-foreground">{value.pct}%</p>
                            <p className="text-[11px] text-muted-foreground">
                              {value.done}/{value.total}
                            </p>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-muted">
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
                <h3 className="mt-2 break-words text-xl font-semibold leading-tight tracking-tight text-foreground">
                  {selectedSubject?.name ?? "Pick a subject"}
                </h3>
              </div>
              <div className="rounded-2xl bg-primary/10 px-3 py-2 text-right">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Total</p>
                <p className="text-lg font-semibold text-primary">{selectedSubject?.overall.pct ?? 0}%</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {selectedSubject ? (
                SECTION_META.map((section) => {
                  const Icon = section.icon;
                  const value = selectedSubject.counts[section.key];
                  return (
                    <div key={section.key} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{section.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {value.done}/{value.total} topics
                            </p>
                          </div>
                        </div>
                        <p className="text-lg font-semibold text-foreground">{value.pct}%</p>
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
                    className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    Open {section.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] sm:p-5">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Fast reads</p>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="font-semibold text-foreground">Momentum</p>
                <p className="mt-1">
                  Your strongest subject is{" "}
                  <span className="text-foreground">{strongestSubject?.name ?? "not set yet"}</span>, while{" "}
                  <span className="text-foreground">{weakestSubject?.name ?? "nothing yet"}</span> is the best next push.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="font-semibold text-foreground">Member view</p>
                <p className="mt-1">This dashboard is now centered on {member === "Bhavesh" ? "you" : member} so the UI stays personal and calm.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

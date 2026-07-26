import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, CircleDashed, Filter, LineChart, Target, Trophy } from "lucide-react";
import {
  getCoverageScopeLabel,
  getMockTestTypeLabel,
  getTestAnalysisChecklist,
  getTestPerformanceRecords,
  isTestAnalysisComplete,
  setTestAnalysisChecklistDone,
  toggleTestAnalysisChecklistItem,
  type MockTestType,
  type TestAnalysisChecklistKey,
  type TestPerformanceRecord,
  type TrackerState,
} from "@/lib/trackerStore";

interface Props {
  state: TrackerState;
  onUpdate: (next: TrackerState) => void;
}

type AnalysisStatusFilter = "all" | "needs-analysis" | "done";
type TestTypeFilter = "all" | MockTestType;

type ChecklistItem = {
  key: TestAnalysisChecklistKey;
  title: string;
  helper: string;
};

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: "reviewed", title: "Review answers", helper: "Read through each marked answer once." },
  { key: "mistakes", title: "List mistakes", helper: "Capture all wrong or guessed questions." },
  { key: "revised", title: "Revise weak parts", helper: "Revisit the concepts that caused confusion." },
  { key: "notesUpdated", title: "Update notes", helper: "Sync the useful takeaways to your notes." },
];

function getPercent(score: number | null, totalMarks: number) {
  if (score === null || totalMarks <= 0) return null;
  return Math.round((score / totalMarks) * 100);
}

function percentLabel(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

export default function TestAnalysisSection({ state, onUpdate }: Props) {
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TestTypeFilter>("all");
  const member = state.currentMember;

  const records = useMemo(
    () =>
      getTestPerformanceRecords(state).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state]
  );

  const completedRecords = useMemo(
    () => records.filter((record) => record.scores[member] !== null),
    [member, records]
  );

  const filteredRecords = useMemo(() => {
    return completedRecords.filter((record) => {
      if (typeFilter !== "all" && record.type !== typeFilter) return false;

      const done = isTestAnalysisComplete(state, record.id);
      if (analysisFilter === "needs-analysis") return !done;
      if (analysisFilter === "done") return done;
      return true;
    });
  }, [analysisFilter, completedRecords, state, typeFilter]);

  const summary = useMemo(() => {
    const percents = completedRecords
      .map((record) => getPercent(record.scores[member], record.totalMarks))
      .filter((percent): percent is number => percent !== null);
    const recentPercents = completedRecords
      .slice(0, 5)
      .map((record) => getPercent(record.scores[member], record.totalMarks))
      .filter((percent): percent is number => percent !== null);

    const recentAverage = recentPercents.length > 0 ? Math.round(recentPercents.reduce((sum, value) => sum + value, 0) / recentPercents.length) : null;

    return {
      testsTaken: completedRecords.length,
      average: percents.length > 0 ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length) : null,
      best: percents.length > 0 ? Math.round(Math.max(...percents)) : null,
      analyzed: completedRecords.filter((record) => isTestAnalysisComplete(state, record.id)).length,
      recentAverage,
    };
  }, [completedRecords, member, state]);

  const updateChecklist = (testId: string, key: TestAnalysisChecklistKey) => {
    onUpdate(toggleTestAnalysisChecklistItem(state, testId, key));
  };

  const updateAnalysisDone = (testId: string, done: boolean) => {
    onUpdate(setTestAnalysisChecklistDone(state, testId, done));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LineChart className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Test Analysis</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        Your completed tests, quick analysis checklist, and filters for finding what still needs review.
      </p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Completed</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{summary.testsTaken}</p>
          <p className="mt-1 text-xs text-muted-foreground">tests with a score entered</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Average</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{percentLabel(summary.average)}</p>
          <p className="mt-1 text-xs text-muted-foreground">across completed tests</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Best</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{percentLabel(summary.best)}</p>
          <p className="mt-1 text-xs text-muted-foreground">highest completed score</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Analyzed</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {summary.analyzed}/{summary.testsTaken}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">tests with the checklist finished</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Filter</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["all", "needs-analysis", "done"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnalysisFilter(option)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  analysisFilter === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {option === "all" ? "All tests" : option === "done" ? "Analysis done" : "Needs analysis"}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["all", "full", "subject", "weekly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTypeFilter(option)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  typeFilter === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {option === "all" ? "All types" : getMockTestTypeLabel(option)}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">{member}'s test analysis</h3>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.recentAverage !== null ? `Recent 5 average: ${summary.recentAverage}%` : "Add a few completed tests to see recent trends."}
          </p>
        </div>
      </div>

      {records.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Add a test score to unlock analysis and the checklist here.
        </div>
      )}

      {records.length > 0 && filteredRecords.length === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          No tests match the current filter.
        </div>
      )}

      <div className="space-y-4">
        {filteredRecords.map((record) => {
          const score = record.scores[member];
          const analysis = getTestAnalysisChecklist(state, record.id);
          const done = Object.values(analysis).every(Boolean);
          const percent = getPercent(score, record.totalMarks);

          return (
            <div key={record.id} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-foreground">{record.displayName}</h3>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                      {getMockTestTypeLabel(record.type)}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {getCoverageScopeLabel(record.coverageScope ?? "full")}
                    </span>
                    {record.source && (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-foreground">
                        {record.source}
                      </span>
                    )}
                    <label
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                        done
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "border-border/70 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={(e) => updateAnalysisDone(record.id, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-muted-foreground text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      {done ? "Analysis done" : "Mark analysis done"}
                    </label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {record.subjectName ?? "General"}{record.topicLabel ? ` • ${record.topicLabel}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(record.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>

                <div className="flex flex-nowrap items-stretch gap-2 overflow-x-auto xl:justify-end">
                  <div className="min-w-[98px] rounded-2xl border border-border/70 bg-background px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Score</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                      {score !== null ? `${score}/${record.totalMarks}` : "-"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{percentLabel(percent)}</p>
                  </div>
                  <div
                    className={`min-w-[98px] rounded-2xl border px-4 py-3 text-right ${
                      done ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Analysis</p>
                    <p className={`mt-1 text-lg font-semibold ${done ? "text-emerald-600" : "text-amber-600"}`}>
                      {done ? "Done" : "Pending"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {CHECKLIST_ITEMS.map((item) => {
                  const checked = analysis[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updateChecklist(record.id, item.key)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        checked
                          ? "border-primary/30 bg-primary/5 shadow-sm shadow-primary/5"
                          : "border-border/70 bg-background hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {checked ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <CircleDashed className="h-4 w-4 text-muted-foreground" />
                        )}
                        <p className="font-medium text-foreground">{item.title}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

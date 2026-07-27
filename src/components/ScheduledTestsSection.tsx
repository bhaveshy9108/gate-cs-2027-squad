import { useEffect, useMemo, useState } from "react";
import { MEMBERS, SUBJECTS, type Member } from "@/lib/gateData";
import {
  addTestSeries,
  addWeeklyTest,
  deleteWeeklyTest,
  getCoverageScopeLabel,
  getWeekNumber,
  getWeeklyTestDisplayName,
  removeTestSeries,
  updateTestSeries,
  updateWeeklyTestActive,
  updateWeeklyTestMeta,
  updateWeeklyTestScore,
  updateWeeklyTestTaken,
  type TestCoverageScope,
  type TrackerState,
  type WeeklyTest,
  type WeeklyTestSource,
} from "@/lib/trackerStore";
import { CalendarCheck2, ChevronDown, ChevronUp, Check, ExternalLink, Link2, Plus, Trash2, X } from "lucide-react";

interface Props {
  state: TrackerState;
  onUpdate: (state: TrackerState) => void;
  onOpenSection?: (section: "test-analysis") => void;
}

const QUIZ_ONLY_SOURCE = "GateOverflow Quizzes";

function buildStatusByMember(totalMarks?: number | null): WeeklyTest["statusByMember"] {
  return Object.fromEntries(
    MEMBERS.map((member) => [
      member,
      {
        taken: false,
        score: null,
        outOf: typeof totalMarks === "number" && Number.isFinite(totalMarks) && totalMarks > 0 ? totalMarks : null,
        correctQuestions: null,
      },
    ])
  ) as WeeklyTest["statusByMember"];
}

function getDraftKey(
  testId: string,
  member: Member,
  field: "score" | "outOf" | "correct" | "duration" | "questions" | "date"
) {
  return `${testId}|${member}|${field}`;
}

function getDraftValue(
  drafts: Record<string, string>,
  key: string,
  fallback: number | null | undefined
) {
  if (drafts[key] !== undefined) return drafts[key];
  return typeof fallback === "number" && Number.isFinite(fallback) ? String(fallback) : "";
}

function getDraftDateValue(drafts: Record<string, string>, testId: string, member: Member, fallback?: string) {
  const key = getDraftKey(testId, member, "date");
  return drafts[key] ?? fallback ?? "";
}

function toDateInputValue(iso?: string) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function isOlderThanDays(iso: string | undefined, days: number) {
  if (!iso) return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() - parsed.getTime() > days * 24 * 60 * 60 * 1000;
}

function formatSimpleDate(iso?: string) {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getPercent(score?: number | null, outOf?: number | null) {
  if (typeof score !== "number" || typeof outOf !== "number" || outOf <= 0) return null;
  return Math.round((score / outOf) * 100);
}

export default function ScheduledTestsSection({ state, onUpdate, onOpenSection }: Props) {
  const currentWeek = getWeekNumber(new Date());
  const currentMember = state.currentMember;
  const [showAddTest, setShowAddTest] = useState(false);
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState<WeeklyTestSource>(state.testSeries[0]?.name ?? "GO Classes");
  const [coverageScope, setCoverageScope] = useState<TestCoverageScope>("full");
  const [subjectId, setSubjectId] = useState("");
  const [topicLabel, setTopicLabel] = useState("");
  const [scheduledWeek, setScheduledWeek] = useState(String(currentWeek));
  const [testLink, setTestLink] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [seriesUrl, setSeriesUrl] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState(state.testSeries[0]?.id ?? "");
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  useEffect(() => {
    if (!state.testSeries.length) return;
    if (!state.testSeries.some((series) => series.id === selectedSeriesId)) {
      setSelectedSeriesId(state.testSeries[0].id);
    }
  }, [selectedSeriesId, state.testSeries]);

  useEffect(() => {
    setSource((current) => {
      if (state.testSeries.some((series) => series.name === current)) return current;
      return state.testSeries[0]?.name ?? "GO Classes";
    });
  }, [state.testSeries]);

  const selectedSeries =
    state.testSeries.find((series) => series.id === selectedSeriesId) ?? state.testSeries[0] ?? null;
  const editingSeries = state.testSeries.find((series) => series.id === editingSeriesId) ?? null;
  const seriesButtons = useMemo(() => state.testSeries, [state.testSeries]);

  const allTests = useMemo(
    () =>
      [...state.weeklyTests].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        if (a.scheduledWeek !== b.scheduledWeek) return b.scheduledWeek - a.scheduledWeek;
        return b.id.localeCompare(a.id);
      }),
    [state.weeklyTests]
  );

  const activeTests = useMemo(
    () =>
      allTests
        .filter((test) => {
          if (test.isActive === false) return false;
          const status = test.statusByMember[currentMember];
          if (!status?.taken) return true;
          return !isOlderThanDays(status.takenAt, 7);
        })
        .sort((a, b) => {
          const aStatus = a.statusByMember[currentMember];
          const bStatus = b.statusByMember[currentMember];
          const aTaken = Boolean(aStatus?.taken);
          const bTaken = Boolean(bStatus?.taken);
          if (aTaken !== bTaken) return Number(aTaken) - Number(bTaken);
          const aTakenTime = aStatus?.takenAt ? new Date(aStatus.takenAt).getTime() : 0;
          const bTakenTime = bStatus?.takenAt ? new Date(bStatus.takenAt).getTime() : 0;
          if (aTakenTime !== bTakenTime) return bTakenTime - aTakenTime;
          const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          if (aTime !== bTime) return bTime - aTime;
          if (a.scheduledWeek !== b.scheduledWeek) return b.scheduledWeek - a.scheduledWeek;
          return b.id.localeCompare(a.id);
        }),
    [allTests, currentMember]
  );

  const inactiveTests = useMemo(
    () =>
      allTests.filter((test) => {
        if (test.isActive !== false) return false;
        const status = test.statusByMember[currentMember];
        return !status?.taken;
      }),
    [allTests, currentMember]
  );

  const historyTests = useMemo(
    () =>
      allTests.filter((test) => {
        const status = test.statusByMember[currentMember];
        return Boolean(status?.taken);
      }),
    [allTests, currentMember]
  );

  const resetForm = () => {
    setName("");
    setSource(state.testSeries[0]?.name ?? "GO Classes");
    setKind("mock");
    setCoverageScope("full");
    setSubjectId("");
    setTopicLabel("");
    setScheduledWeek(String(currentWeek));
    setTestLink("");
    setQuestionCount("");
    setTotalMarks("");
    setDurationMinutes("");
    setNotes("");
  };

  const handleAddTest = () => {
    if (!name.trim()) return;
    const parsedTotalMarks = totalMarks.trim() ? parseFloat(totalMarks) : null;
    const test: WeeklyTest = {
      id: `weekly-test-${Date.now()}`,
      name: name.trim(),
      source,
      kind: source === QUIZ_ONLY_SOURCE ? "quiz" : "mock",
      subjectId: coverageScope !== "full" ? subjectId || undefined : undefined,
      coverageScope,
      topicLabel: coverageScope === "topic" ? topicLabel.trim() : "",
      link: testLink.trim(),
      scheduledWeek: Math.max(1, parseInt(scheduledWeek, 10) || currentWeek),
      questionCount: questionCount.trim() ? parseInt(questionCount, 10) : undefined,
      totalMarks: parsedTotalMarks ?? undefined,
      durationMinutes: durationMinutes.trim() ? parseInt(durationMinutes, 10) : undefined,
      notes: notes.trim(),
      statusByMember: buildStatusByMember(parsedTotalMarks),
      updatedAt: new Date().toISOString(),
    };
    onUpdate(addWeeklyTest(state, test));
    resetForm();
    setShowAddTest(false);
  };

  const handleAddSeries = () => {
    if (!seriesName.trim()) return;
    onUpdate(addTestSeries(state, seriesName, seriesUrl));
    setSeriesName("");
    setSeriesUrl("");
    setShowAddSeries(false);
  };

  const handleResetSeriesForm = () => {
    setShowAddSeries(false);
    setSeriesName("");
    setSeriesUrl("");
  };

  const saveScore = (test: WeeklyTest, member: Member) => {
    const scoreKey = getDraftKey(test.id, member, "score");
    const outOfKey = getDraftKey(test.id, member, "outOf");
    const correctKey = getDraftKey(test.id, member, "correct");
    const scoreText = draftScores[scoreKey];
    const outOfText = draftScores[outOfKey];
    const correctText = draftScores[correctKey];
    const score = scoreText !== undefined && scoreText.trim() !== "" ? Number(scoreText) : null;
    const outOf = outOfText !== undefined && outOfText.trim() !== "" ? Number(outOfText) : null;
    const correctQuestions = correctText !== undefined && correctText.trim() !== "" ? Number(correctText) : null;

    onUpdate(updateWeeklyTestScore(state, test.id, member, Number.isFinite(score as number) ? score : null, Number.isFinite(outOf as number) ? outOf : null, Number.isFinite(correctQuestions as number) ? correctQuestions : null));
  };

  const renderTestCard = (test: WeeklyTest) => {
    const status = test.statusByMember[currentMember];
    const percent = getPercent(status?.score, status?.outOf);
    const currentScore = getDraftValue(draftScores, getDraftKey(test.id, currentMember, "score"), status?.score);
    const currentOutOf = getDraftValue(draftScores, getDraftKey(test.id, currentMember, "outOf"), status?.outOf);
    const currentCorrect = getDraftValue(draftScores, getDraftKey(test.id, currentMember, "correct"), status?.correctQuestions);
    const currentDuration = getDraftValue(draftScores, getDraftKey(test.id, currentMember, "duration"), test.durationMinutes);
    const currentQuestions = getDraftValue(draftScores, getDraftKey(test.id, currentMember, "questions"), test.questionCount);
    const topics = test.topics?.length
      ? test.topics
      : test.topicLabel.trim()
        ? [test.topicLabel.trim()]
        : test.notes.trim()
          ? [test.notes.trim()]
          : [];
    const archived = Boolean(status?.taken && isOlderThanDays(status.takenAt, 7));
    const isEditing = editingTestId === test.id;

    return (
      <div
        key={test.id}
        className={`rounded-xl border px-4 py-3 transition-colors ${
          status?.taken
            ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-900/10"
            : "border-border bg-background"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="max-w-full text-base font-semibold leading-snug text-foreground">{getWeeklyTestDisplayName(test)}</h4>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{test.source}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {test.kind === "mock" ? "Mock" : test.kind === "subject" ? "Subject" : "Weekly Quiz"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  status?.taken
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}
              >
                {status?.taken ? "Done" : "To do"}
              </span>
              {archived && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  History
                </span>
              )}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {topics.length > 0 ? topics.join(" · ") : "Topics will appear here once the schedule is loaded."}
            </p>
          </div>
          <div className="flex flex-nowrap items-center gap-2 shrink-0">
            <button
              onClick={() => onUpdate(updateWeeklyTestActive(state, test.id, test.isActive === false))}
              className={`rounded-lg border p-2 transition-colors ${
                test.isActive === false
                  ? "border-amber-300 bg-amber-50 text-amber-600 hover:border-amber-400 hover:text-amber-700"
                  : "border-emerald-300 bg-emerald-50 text-emerald-600 hover:border-emerald-400 hover:text-emerald-700"
              }`}
              title={test.isActive === false ? "Make active" : "Remove from active tests"}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setEditingTestId((current) => (current === test.id ? null : test.id))}
              className="whitespace-nowrap rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground shrink-0"
              title="Edit test details"
            >
              {isEditing ? "Done" : "Edit"}
            </button>
            {test.link && (
              <button
                onClick={() => window.open(test.link, "_blank", "noopener,noreferrer")}
                className="shrink-0 rounded-lg border border-border bg-background p-2 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                title="Open test link"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onUpdate(deleteWeeklyTest(state, test.id))}
              className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Delete test"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <input
                value={currentQuestions}
                onChange={(e) => setDraftScores((current) => ({ ...current, [getDraftKey(test.id, currentMember, "questions")]: e.target.value }))}
                onBlur={() =>
                  onUpdate(
                    updateWeeklyTestMeta(state, test.id, {
                      questionCount: currentQuestions.trim() ? Number(currentQuestions) : null,
                      totalMarks: currentOutOf.trim() ? Number(currentOutOf) : null,
                      durationMinutes: currentDuration.trim() ? Number(currentDuration) : null,
                      link: test.link ?? "",
                    })
                  )
                }
                placeholder="Questions"
                type="number"
                min={0}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                value={currentOutOf}
                onChange={(e) => setDraftScores((current) => ({ ...current, [getDraftKey(test.id, currentMember, "outOf")]: e.target.value }))}
                onBlur={() => saveScore(test, currentMember)}
                placeholder="Total"
                type="number"
                min={1}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                value={currentDuration}
                onChange={(e) => setDraftScores((current) => ({ ...current, [getDraftKey(test.id, currentMember, "duration")]: e.target.value }))}
                onBlur={() =>
                  onUpdate(
                    updateWeeklyTestMeta(state, test.id, {
                      questionCount: currentQuestions.trim() ? Number(currentQuestions) : null,
                      totalMarks: currentOutOf.trim() ? Number(currentOutOf) : null,
                      durationMinutes: currentDuration.trim() ? Number(currentDuration) : null,
                      link: test.link ?? "",
                    })
                  )
                }
                placeholder="Duration (min)"
                type="number"
                min={0}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                value={currentCorrect}
                onChange={(e) => setDraftScores((current) => ({ ...current, [getDraftKey(test.id, currentMember, "correct")]: e.target.value }))}
                onBlur={() => saveScore(test, currentMember)}
                placeholder="Correct"
                type="number"
                min={0}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <input
              value={test.link ?? ""}
              onChange={(e) =>
                onUpdate(
                  updateWeeklyTestMeta(state, test.id, {
                    questionCount: currentQuestions.trim() ? Number(currentQuestions) : null,
                    totalMarks: currentOutOf.trim() ? Number(currentOutOf) : null,
                    durationMinutes: currentDuration.trim() ? Number(currentDuration) : null,
                    link: e.target.value,
                  })
                )
              }
              placeholder="Test link"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ) : (
          <>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] leading-tight">Questions</p>
                <p className="mt-1 text-sm font-medium text-foreground">{test.questionCount ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] leading-tight">Marks</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {typeof status?.score === "number" && typeof status?.outOf === "number"
                    ? `${status.score}/${status.outOf}`
                    : test.totalMarks
                      ? `—/${test.totalMarks}`
                      : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] leading-tight">Duration</p>
                <p className="mt-1 text-sm font-medium text-foreground">{typeof test.durationMinutes === "number" ? `${test.durationMinutes} min` : "—"}</p>
              </div>
              <div className="rounded-xl bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] leading-tight">Correct</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {typeof status?.correctQuestions === "number" ? status.correctQuestions : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-muted/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] leading-tight">Week</p>
                <p className="mt-1 text-sm font-medium text-foreground">W{test.scheduledWeek}</p>
              </div>
            </div>

            {test.notes && <p className="mt-3 text-xs leading-5 text-muted-foreground">{test.notes}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3">
              <button
                onClick={() => {
                  const nextTaken = !status?.taken;
                  onUpdate(updateWeeklyTestTaken(state, test.id, currentMember, nextTaken));
                  if (nextTaken) onOpenSection?.("test-analysis");
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ${
                  status?.taken ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {status?.taken && <Check className="w-3.5 h-3.5" />}
                {status?.taken ? "Mark not done" : "Mark done"}
              </button>
              <input
                value={currentScore}
                onChange={(e) => setDraftScores((current) => ({ ...current, [getDraftKey(test.id, currentMember, "score")]: e.target.value }))}
                onBlur={() => saveScore(test, currentMember)}
                placeholder="Obtained"
                type="number"
                min={0}
                className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                value={currentOutOf}
                onChange={(e) => setDraftScores((current) => ({ ...current, [getDraftKey(test.id, currentMember, "outOf")]: e.target.value }))}
                onBlur={() => saveScore(test, currentMember)}
                placeholder="Total"
                type="number"
                min={1}
                className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                value={currentCorrect}
                onChange={(e) => setDraftScores((current) => ({ ...current, [getDraftKey(test.id, currentMember, "correct")]: e.target.value }))}
                onBlur={() => saveScore(test, currentMember)}
                placeholder="Correct"
                type="number"
                min={0}
                className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {percent !== null && (
                <span className="text-xs font-medium text-foreground">
                  {status?.score ?? 0}/{status?.outOf ?? 0} ({percent}%)
                </span>
              )}
              {typeof status?.correctQuestions === "number" && (
                <span className="text-xs font-medium text-muted-foreground">Correct {status.correctQuestions}</span>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const handleSeriesRemove = (seriesId: string) => {
    onUpdate(removeTestSeries(state, seriesId));
    const fallback = state.testSeries.find((series) => series.id !== seriesId);
    setSelectedSeriesId(fallback?.id ?? "");
    setEditingSeriesId(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Scheduled Tests</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Add a scheduled entry with the same test logic used across weekly tests, then keep recent completions visible before they move into history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddTest((current) => !current)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {showAddTest ? "Close" : "Add Scheduled Test"}
            {showAddTest ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showAddTest && (
          <div className="rounded-xl border border-dashed border-border bg-background p-4 space-y-4">
            <div className="grid gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Test name"
                className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {state.testSeries.map((series) => (
                    <option key={series.id} value={series.name}>
                      {series.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)]">
                <select
                  value={coverageScope}
                  onChange={(e) => {
                    const nextScope = e.target.value as TestCoverageScope;
                    setCoverageScope(nextScope);
                    if (nextScope === "full") {
                      setSubjectId("");
                      setTopicLabel("");
                    } else if (nextScope === "subject") {
                      setTopicLabel("");
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="full">Full Syllabus</option>
                  <option value="subject">Subject Wise</option>
                  <option value="topic">Topic Wise</option>
                </select>
                <select
                  value={subjectId}
                  onChange={(e) => {
                    const nextSubject = e.target.value;
                    setSubjectId(nextSubject);
                    if (nextSubject && coverageScope === "full") {
                      setCoverageScope("subject");
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select subject</option>
                  {SUBJECTS.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <input
                  value={scheduledWeek}
                  onChange={(e) => setScheduledWeek(e.target.value)}
                  placeholder="Week"
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {coverageScope === "topic" && (
                <input
                  value={topicLabel}
                  onChange={(e) => setTopicLabel(e.target.value)}
                  placeholder="Topic label"
                  className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
              <input
                value={testLink}
                onChange={(e) => setTestLink(e.target.value)}
                placeholder="Direct test or quiz link (optional)"
                className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  placeholder="No. of questions (optional)"
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  placeholder="Total marks (optional)"
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Duration (min, optional)"
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes or syllabus coverage"
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAddTest}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddTest(false);
                  }}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Active scheduled tests</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {activeTests.length} items
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {activeTests.length > 0 ? (
            activeTests.map((test) => (
              <div key={test.id} className="w-[560px] max-w-[560px] shrink-0 snap-start">
                {renderTestCard(test)}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No scheduled tests yet.</p>
          )}
        </div>
      </div>

      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
          Inactive scheduled tests ({inactiveTests.length})
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">Tick a card to make it active again.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{inactiveTests.map(renderTestCard)}</div>
      </details>

      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
          Test history ({historyTests.length})
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {historyTests.length > 0 ? historyTests.map(renderTestCard) : (
            <p className="text-sm text-muted-foreground">Completed tests will appear here.</p>
          )}
        </div>
      </details>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Platform Test Links</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Add the test series you use, then import PDF lists into the same order they appear in the file.
        </p>
        <div className="flex flex-wrap justify-between gap-2">
          {!showAddSeries ? (
            <button
              onClick={() => setShowAddSeries(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Add Series
            </button>
          ) : (
            <button
              onClick={handleResetSeriesForm}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              <X className="h-4 w-4" />
              Close Series Editor
            </button>
          )}
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Zeal and Made Easy tests are loaded automatically into the synced schedule board.
        </div>
        {showAddSeries && (
          <div className="rounded-lg border border-dashed border-border bg-background p-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
              <input
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="Test series name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={seriesUrl}
                onChange={(e) => setSeriesUrl(e.target.value)}
                placeholder="Test series link"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddSeries}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Save
              </button>
            </div>
          </div>
        )}
        {selectedSeries && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {seriesButtons.map((series) => (
                  <button
                    key={series.id}
                    onClick={() => setSelectedSeriesId(series.id)}
                    className={
                      series.id === selectedSeries.id
                        ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                        : "rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    }
                  >
                    {series.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {selectedSeries.url && (
                  <a href={selectedSeries.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary">
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  onClick={() => setEditingSeriesId((current) => (current === selectedSeries.id ? null : selectedSeries.id))}
                  className="rounded-lg px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
                >
                  {editingSeriesId === selectedSeries.id ? "Close" : "Modify"}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/80 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{selectedSeries.name}</span>
                {selectedSeries.url ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Linked
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Link missing
                  </span>
                )}
              </div>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {selectedSeries.url || "No link added yet for this test series."}
              </p>
            </div>
            {editingSeries && editingSeries.id === selectedSeries.id && (
              <div className="rounded-lg border border-dashed border-border bg-background p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modify Test Series</p>
                  <button
                    onClick={() => handleSeriesRemove(editingSeries.id)}
                    className="rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    title={`Remove ${editingSeries.name}`}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <input
                    value={editingSeries.name}
                    onChange={(e) => onUpdate(updateTestSeries(state, editingSeries.id, { name: e.target.value }))}
                    placeholder="Series name"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    value={editingSeries.url}
                    onChange={(e) => onUpdate(updateTestSeries(state, editingSeries.id, { url: e.target.value }))}
                    placeholder={`Paste ${editingSeries.name} link`}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { MEMBERS, SUBJECTS, type Member } from "@/lib/gateData";
import {
  addTestSeries,
  addWeeklyTest,
  deleteWeeklyTest,
  getCoverageScopeLabel,
  getWeekNumber,
  getWeeklyTestAnalysis,
  getWeeklyTestDisplayName,
  removeTestSeries,
  updateTestSeries,
  updateWeeklyTestMeta,
  updateWeeklyTestScore,
  updateWeeklyTestTaken,
  type TestCoverageScope,
  type TrackerState,
  type WeeklyTest,
  type WeeklyTestKind,
  type WeeklyTestSource,
} from "@/lib/trackerStore";
import {
  CalendarCheck2,
  Check,
  ExternalLink,
  Link2,
  Plus,
  X,
  Trash2,
  Trophy,
} from "lucide-react";

interface Props {
  state: TrackerState;
  onUpdate: (state: TrackerState) => void;
  onOpenSection?: (section: "test-analysis") => void;
}

const kinds: WeeklyTestKind[] = ["mock", "subject", "quiz"];
const QUIZ_ONLY_SOURCE = "GateOverflow Quizzes";

const memberBorder: Record<Member, string> = {
  Bhavesh: "border-person1 text-person1",
};

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

function describeWeeklyTopics(test: WeeklyTest): string[] {
  if (test.topics?.length) return test.topics;
  if (test.topicLabel.trim()) return [test.topicLabel.trim()];
  if (test.notes.trim()) return [test.notes.trim()];
  return [];
}

function formatWeeklyMetaValue(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return `${value}${suffix}`;
}

function formatTestCardDate(date: string) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function WeeklyTestsSection({ state, onUpdate, onOpenSection }: Props) {
  const currentWeek = getWeekNumber(new Date());
  const currentMember = state.currentMember;
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState<WeeklyTestSource>(state.testSeries[0]?.name ?? "GO Classes");
  const [kind, setKind] = useState<WeeklyTestKind>("mock");
  const [coverageScope, setCoverageScope] = useState<TestCoverageScope>("full");
  const [subjectId, setSubjectId] = useState("");
  const [topicLabel, setTopicLabel] = useState("");
  const [scheduledWeek, setScheduledWeek] = useState(String(currentWeek));
  const [testLink, setTestLink] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [notes, setNotes] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [seriesUrl, setSeriesUrl] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState(state.testSeries[0]?.id ?? "");
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | TestCoverageScope>("all");
  const [completionFilter, setCompletionFilter] = useState<"all" | "done" | "todo">("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

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

  const sortedTests = useMemo(
    () =>
      [...state.weeklyTests].sort((a, b) => {
        if (a.scheduledWeek !== b.scheduledWeek) return a.scheduledWeek - b.scheduledWeek;
        const aOrder = typeof a.seriesOrder === "number" ? a.seriesOrder : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b.seriesOrder === "number" ? b.seriesOrder : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return b.id.localeCompare(a.id);
      }),
    [state.weeklyTests]
  );

  const analysis = useMemo(() => getWeeklyTestAnalysis(state), [state]);
  const seriesNames = useMemo(() => {
    const names = new Set<string>();
    state.testSeries.forEach((series) => names.add(series.name));
    sortedTests.forEach((test) => names.add(test.source));
    return Array.from(names).filter(Boolean);
  }, [sortedTests, state.testSeries]);
  const filteredTests = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    const topicQuery = topicFilter.trim().toLowerCase();

    return sortedTests.filter((test) => {
      if (seriesFilter !== "all" && test.source !== seriesFilter) return false;
      if (scopeFilter !== "all" && (test.coverageScope ?? "full") !== scopeFilter) return false;
      if (subjectFilter && test.subjectId !== subjectFilter) return false;
      if (topicQuery) {
        const topicBlob = [test.topicLabel, test.notes, test.name, ...(test.topics ?? [])].join(" ").toLowerCase();
        if (!topicBlob.includes(topicQuery)) return false;
      }
      if (query) {
        const haystack = [test.name, test.source, test.topicLabel, test.notes, getWeeklyTestDisplayName(test), ...(test.topics ?? [])]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      const status = test.statusByMember[currentMember];
      if (completionFilter === "done" && !status?.taken) return false;
      if (completionFilter === "todo" && status?.taken) return false;
      return true;
    });
  }, [completionFilter, currentMember, scopeFilter, searchFilter, seriesFilter, sortedTests, subjectFilter, topicFilter]);
  const groupedTests = useMemo(
    () =>
      filteredTests.reduce<Record<string, WeeklyTest[]>>((acc, test) => {
        const key = test.source || "Unsorted series";
        acc[key] = acc[key] || [];
        acc[key].push(test);
        return acc;
      }, {}),
    [filteredTests]
  );
  const filteredStats = useMemo(() => {
    const done = filteredTests.filter((test) => test.statusByMember[currentMember]?.taken).length;
    return {
      total: filteredTests.length,
      done,
      todo: filteredTests.length - done,
      subjects: new Set(filteredTests.map((test) => test.subjectId).filter(Boolean)).size,
      topics: filteredTests.filter((test) => test.coverageScope === "topic").length,
    };
  }, [currentMember, filteredTests]);

  const isQuizOnlySource = source === QUIZ_ONLY_SOURCE;

  const getDraftKey = (testId: string, member: Member, field: "score" | "outOf" | "correct") => `${testId}|${member}|${field}`;

  const getDraftValue = (testId: string, member: Member, field: "score" | "outOf" | "correct", fallback?: number | null) => {
    const key = getDraftKey(testId, member, field);
    return draftScores[key] ?? (typeof fallback === "number" ? String(fallback) : "");
  };

  const saveMemberScore = (test: WeeklyTest, member: Member) => {
    const scoreRaw = getDraftValue(test.id, member, "score", test.statusByMember[member]?.score);
    const outOfRaw = getDraftValue(test.id, member, "outOf", test.statusByMember[member]?.outOf);
    const correctRaw = getDraftValue(test.id, member, "correct", test.statusByMember[member]?.correctQuestions);
    const parsedScore = scoreRaw.trim() === "" ? null : parseFloat(scoreRaw);
    const parsedOutOf = outOfRaw.trim() === "" ? null : parseFloat(outOfRaw);
    const parsedCorrect = correctRaw.trim() === "" ? null : parseFloat(correctRaw);

    onUpdate(
      updateWeeklyTestScore(
        state,
        test.id,
        member,
        Number.isFinite(parsedScore as number) ? parsedScore : null,
        Number.isFinite(parsedOutOf as number) ? parsedOutOf : null,
        Number.isFinite(parsedCorrect as number) ? parsedCorrect : null
      )
    );
  };

  const openTestLink = (url?: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAdd = () => {
    if (!name.trim()) return;

    const test: WeeklyTest = {
      id: `weekly-test-${Date.now()}`,
      name: name.trim(),
      source,
      kind: isQuizOnlySource ? "quiz" : kind,
      subjectId: coverageScope !== "full" ? subjectId || undefined : undefined,
      coverageScope,
      topicLabel: coverageScope === "topic" ? topicLabel.trim() : "",
      link: testLink.trim(),
      scheduledWeek: Math.max(1, parseInt(scheduledWeek, 10) || currentWeek),
      questionCount: questionCount.trim() ? parseInt(questionCount, 10) : undefined,
      totalMarks: totalMarks.trim() ? parseFloat(totalMarks) : undefined,
      notes: notes.trim(),
      statusByMember: buildStatusByMember(totalMarks.trim() ? parseFloat(totalMarks) : null),
    };

    onUpdate(addWeeklyTest(state, test));
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
    setNotes("");
    setShowAdd(false);
  };

  const handleAddSeries = () => {
    if (!seriesName.trim()) return;
    onUpdate(addTestSeries(state, seriesName, seriesUrl));
    if (!state.testSeries.some((entry) => entry.name.toLowerCase() === seriesName.trim().toLowerCase())) {
      setSource(seriesName.trim());
    }
    setSeriesName("");
    setSeriesUrl("");
    setShowAddSeries(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarCheck2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Weekly Tests</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        Track the planned test schedule with topics, marks, and duration so the weekly list reads like a proper study plan.
      </p>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Visible tests</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{filteredStats.total}</p>
          <p className="text-xs text-muted-foreground">after your current filters</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{filteredStats.done}</p>
          <p className="text-xs text-muted-foreground">marked done by {currentMember}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">To do</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{filteredStats.todo}</p>
          <p className="text-xs text-muted-foreground">still pending</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Scope mix</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{filteredStats.subjects + filteredStats.topics}</p>
          <p className="text-xs text-muted-foreground">
            {filteredStats.subjects} subject series, {filteredStats.topics} topicwise tests
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Test board</h3>
            <p className="text-xs text-muted-foreground">
              Filter by series, scope, subject, topic, or completion status.
            </p>
          </div>
          <button
            onClick={() => {
              setSeriesFilter("all");
              setScopeFilter("all");
              setCompletionFilter("all");
              setSubjectFilter("");
              setTopicFilter("");
              setSearchFilter("");
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Reset filters
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSeriesFilter("all")}
            className={
              seriesFilter === "all"
                ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                : "rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            All series
          </button>
          {seriesNames.map((seriesName) => (
            <button
              key={seriesName}
              onClick={() => setSeriesFilter(seriesName)}
              className={
                seriesFilter === seriesName
                  ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {seriesName}
            </button>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All scopes" },
                { value: "subject", label: "Subject wise" },
                { value: "topic", label: "Topic wise" },
                { value: "full", label: "Full syllabus" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setScopeFilter(item.value as "all" | TestCoverageScope)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    scopeFilter === item.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All status" },
                { value: "done", label: "Completed" },
                { value: "todo", label: "To do" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setCompletionFilter(item.value as "all" | "done" | "todo")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    completionFilter === item.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All subjects</option>
                {SUBJECTS.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search test, series, or notes"
                className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <input
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="Topic keyword filter"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
            Filters stay compact here so the test cards can carry the schedule details.
          </div>
        </div>
      </div>

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
              onClick={() => {
                setShowAddSeries(false);
                setSeriesName("");
                setSeriesUrl("");
              }}
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
                {state.testSeries.map((series) => (
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
                  <a
                    href={selectedSeries.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary"
                  >
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
                    onClick={() => {
                      onUpdate(removeTestSeries(state, editingSeries.id));
                      const fallback = state.testSeries.find((series) => series.id !== editingSeries.id);
                      setSelectedSeriesId(fallback?.id ?? "");
                      setEditingSeriesId(null);
                    }}
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

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test name"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={source}
              onChange={(e) => {
                const nextSource = e.target.value as WeeklyTestSource;
                setSource(nextSource);
                if (nextSource === QUIZ_ONLY_SOURCE) {
                  setKind("quiz");
                  if (coverageScope === "full") {
                    setCoverageScope("topic");
                  }
                }
              }}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {state.testSeries.map((entry) => (
                <option key={entry.id} value={entry.name}>
                  {entry.name}
                </option>
              ))}
              {!state.testSeries.some((entry) => entry.name === source) && source && (
                <option key={source} value={source}>
                  {source}
                </option>
              )}
            </select>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as WeeklyTestKind)}
              disabled={isQuizOnlySource}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(isQuizOnlySource ? ["quiz"] : kinds).map((value) => (
                <option key={value} value={value}>
                  {value === "mock" ? "Mock Test" : value === "subject" ? "Subject Test" : "Weekly Quiz"}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
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
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="full">Full Syllabus</option>
              <option value="subject">Subject Wise</option>
              <option value="topic">Topic Wise</option>
            </select>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={coverageScope === "full"}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed"
            >
              <option value="">{coverageScope === "topic" ? "Select subject for topic" : "Select subject"}</option>
              {SUBJECTS.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={scheduledWeek}
              onChange={(e) => setScheduledWeek(e.target.value)}
              placeholder="Week number"
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {coverageScope === "topic" && (
            <input
              value={topicLabel}
              onChange={(e) => setTopicLabel(e.target.value)}
              placeholder="Topic wise name (e.g., Set Theory, Linear Algebra)"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          <input
            value={testLink}
            onChange={(e) => setTestLink(e.target.value)}
            placeholder="Direct test or quiz link (optional)"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              placeholder="No. of questions (optional)"
              type="number"
              min={1}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              placeholder="Total marks (optional)"
              type="number"
              min={1}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes or syllabus coverage"
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Add
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setName("");
                setSource(state.testSeries[0]?.name ?? "GO Classes");
                setKind("mock");
                setCoverageScope("full");
                setSubjectId("");
                setTopicLabel("");
                setScheduledWeek(String(currentWeek));
                setTestLink("");
                setTotalMarks("");
                setNotes("");
              }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sortedTests.length === 0 && !showAdd && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No weekly tests planned yet. Add a manual entry or import a PDF list to get started.
        </div>
      )}

      {sortedTests.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {analysis.map((entry) => (
            <div key={entry.member} className={`group min-h-[64px] rounded-xl border-2 px-3 py-2 ${memberBorder[entry.member]}`}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-1.5 font-semibold">
                  <span>{entry.member}</span>
                  {entry.bestPercent !== null && <Trophy className="h-3.5 w-3.5" />}
                </div>
                <span className="text-xs font-medium">Tests: {entry.testsTaken}</span>
              </div>
              <div className="mt-1 max-h-0 overflow-hidden text-[11px] opacity-0 transition-all duration-200 group-hover:max-h-16 group-hover:opacity-100">
                <p>Average: {entry.averagePercent !== null ? `${entry.averagePercent}%` : "-"}</p>
                <p>Best: {entry.bestPercent !== null ? `${entry.bestPercent}%` : "-"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Add Weekly Test
        </button>
      </div>

      {Object.entries(groupedTests).map(([seriesName, tests]) => {
        const doneCount = tests.filter((test) => test.statusByMember[currentMember]?.taken).length;
        const byScope = tests.reduce<Record<string, WeeklyTest[]>>((acc, test) => {
          const key = test.coverageScope ?? "full";
          acc[key] = acc[key] || [];
          acc[key].push(test);
          return acc;
        }, {});

        return (
          <div key={seriesName} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{seriesName}</h3>
                <p className="text-xs text-muted-foreground">
                  {doneCount}/{tests.length} completed, {tests.length - doneCount} left
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {tests.length} tests
              </span>
            </div>

            <div className="space-y-3">
              {Object.entries(byScope).map(([scope, scopedTests]) => (
                <div key={`${seriesName}-${scope}`} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {getCoverageScopeLabel(scope as TestCoverageScope)}
                    </h4>
                    <span className="text-xs text-muted-foreground">{scopedTests.length} items</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {scopedTests.map((test) => {
                      const status = test.statusByMember[currentMember];
                      const topics = describeWeeklyTopics(test);
                      const marksLabel =
                        status.taken &&
                        typeof status.score === "number" &&
                        typeof status.outOf === "number" &&
                        status.outOf > 0
                          ? `${status.score}/${status.outOf}`
                          : formatWeeklyMetaValue(test.totalMarks) ?? "—";
                      const durationLabel = formatWeeklyMetaValue(test.durationMinutes, " min") ?? "—";
                      const correctLabel =
                        typeof status.correctQuestions === "number" ? String(status.correctQuestions) : "—";
                      const percent =
                        status.taken &&
                        typeof status.score === "number" &&
                        typeof status.outOf === "number" &&
                        status.outOf > 0
                          ? Math.round((status.score / status.outOf) * 100)
                          : null;
                      const currentScore = getDraftValue(test.id, currentMember, "score", status.score);
                      const currentOutOf = getDraftValue(test.id, currentMember, "outOf", status.outOf);

                      return (
                        <div
                          key={test.id}
                          className={`rounded-xl border px-4 py-3 transition-colors ${
                            status.taken
                              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-900/10"
                              : "border-border bg-background"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                              {test.date && (
                                <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                                  {formatTestCardDate(test.date)}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold text-foreground">{getWeeklyTestDisplayName(test)}</h4>
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                  {test.source}
                                </span>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {test.kind === "mock" ? "Mock" : test.kind === "subject" ? "Subject" : "Weekly Quiz"}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    status.taken
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                  }`}
                                >
                                  {status.taken ? "Done" : "To do"}
                                </span>
                              </div>
                              <p className="text-xs leading-5 text-muted-foreground">
                                {topics.length > 0
                                  ? topics.join(" · ")
                                  : "Topics will appear here once the schedule is loaded."}
                              </p>
                            </div>
                            <button
                              onClick={() => setEditingTestId((current) => (current === test.id ? null : test.id))}
                              className="rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                              title="Edit test details"
                            >
                              {editingTestId === test.id ? "Done" : "Edit"}
                            </button>
                            {test.link && (
                              <button
                                onClick={() => openTestLink(test.link)}
                                className="rounded-lg border border-border bg-background p-2 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                                title="Open test link"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onUpdate(deleteWeeklyTest(state, test.id))}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              title="Delete weekly test"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {editingTestId === test.id ? (
                            <div className="mt-3 space-y-2">
                              <div className="rounded-lg bg-muted/30 px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Test Link</p>
                                  {test.link && (
                                    <button
                                      type="button"
                                      onClick={() => openTestLink(test.link)}
                                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Open
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="url"
                                  value={test.link ?? ""}
                                  onChange={(e) => onUpdate(updateWeeklyTestMeta(state, test.id, { link: e.target.value }))}
                                  placeholder="Paste the test link here"
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-lg bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Total Questions</p>
                                <input
                                  type="number"
                                  min={1}
                                  value={test.questionCount ?? ""}
                                  onChange={(e) =>
                                    onUpdate(
                                      updateWeeklyTestMeta(state, test.id, {
                                        questionCount: e.target.value.trim() ? parseInt(e.target.value, 10) : null,
                                      })
                                    )
                                  }
                                  placeholder="—"
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div className="rounded-lg bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Marks</p>
                                <input
                                  type="number"
                                  min={1}
                                  value={test.totalMarks ?? ""}
                                  onChange={(e) =>
                                    onUpdate(
                                      updateWeeklyTestMeta(state, test.id, {
                                        totalMarks: e.target.value.trim() ? parseFloat(e.target.value) : null,
                                      })
                                    )
                                  }
                                  placeholder="—"
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div className="rounded-lg bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Duration</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">
                                  {formatWeeklyMetaValue(test.durationMinutes, " min") ?? "—"}
                                </p>
                              </div>
                              <div className="rounded-lg bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Correct Questions</p>
                                <input
                                  type="number"
                                  min={0}
                                  value={status.correctQuestions ?? ""}
                                  onChange={(e) =>
                                    onUpdate(
                                      updateWeeklyTestScore(
                                        state,
                                        test.id,
                                        currentMember,
                                        typeof status.score === "number" ? status.score : null,
                                        typeof status.outOf === "number" ? status.outOf : null,
                                        e.target.value.trim() ? parseInt(e.target.value, 10) : null
                                      )
                                    )
                                  }
                                  placeholder="—"
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              <div className="rounded-lg bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Total Questions</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{formatWeeklyMetaValue(test.questionCount) ?? "—"}</p>
                              </div>
                              <div className="rounded-lg bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Marks</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{marksLabel}</p>
                              </div>
                              <div className="rounded-lg bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Duration</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{durationLabel}</p>
                              </div>
                              <div className="rounded-lg bg-muted/30 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Correct Questions</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{correctLabel}</p>
                              </div>
                            </div>
                          )}

                          {test.notes && <p className="mt-3 text-xs leading-5 text-muted-foreground">{test.notes}</p>}

                          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3">
                            <button
                              onClick={() => {
                                const nextTaken = !status.taken;
                                onUpdate(updateWeeklyTestTaken(state, test.id, currentMember, nextTaken));
                                if (nextTaken) {
                                  onOpenSection?.("test-analysis");
                                }
                              }}
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ${
                                status.taken ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {status.taken && <Check className="w-3.5 h-3.5" />}
                              {status.taken ? "Mark not done" : "Mark done"}
                            </button>
                            <input
                              value={currentScore}
                              onChange={(e) =>
                                setDraftScores((current) => ({
                                  ...current,
                                  [getDraftKey(test.id, currentMember, "score")]: e.target.value,
                                }))
                              }
                              onBlur={() => saveMemberScore(test, currentMember)}
                              onKeyDown={(e) => e.key === "Enter" && saveMemberScore(test, currentMember)}
                              placeholder="Obtained"
                              type="number"
                              min={0}
                              className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              value={currentOutOf}
                              onChange={(e) =>
                                setDraftScores((current) => ({
                                  ...current,
                                  [getDraftKey(test.id, currentMember, "outOf")]: e.target.value,
                                }))
                              }
                              onBlur={() => saveMemberScore(test, currentMember)}
                              onKeyDown={(e) => e.key === "Enter" && saveMemberScore(test, currentMember)}
                              placeholder="Total"
                              type="number"
                              min={1}
                              className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              value={getDraftValue(test.id, currentMember, "correct", status.correctQuestions)}
                              onChange={(e) =>
                                setDraftScores((current) => ({
                                  ...current,
                                  [getDraftKey(test.id, currentMember, "correct")]: e.target.value,
                                }))
                              }
                              onBlur={() => saveMemberScore(test, currentMember)}
                              onKeyDown={(e) => e.key === "Enter" && saveMemberScore(test, currentMember)}
                              placeholder="Correct"
                              type="number"
                              min={0}
                              className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-xs text-muted-foreground">
                              {status.taken && status.takenAt
                                ? `Taken on ${new Date(status.takenAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                  })}`
                                : "Not yet taken"}
                            </span>
                            {percent !== null && (
                              <span className="text-xs font-medium text-foreground">
                                {status.score ?? 0}/{status.outOf ?? 0} ({percent}%)
                              </span>
                            )}
                            {typeof status.correctQuestions === "number" && (
                              <span className="text-xs font-medium text-muted-foreground">Correct {status.correctQuestions}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>
    </div>
    );
  }

import { useMemo, useState } from "react";
import { MEMBERS, SUBJECTS, type Member } from "@/lib/gateData";
import {
  addWeeklyTest,
  addTestSeries,
  deleteWeeklyTest,
  getCoverageScopeLabel,
  getWeekNumber,
  getWeeklyTestDisplayName,
  getWeeklyTestAnalysis,
  type TestCoverageScope,
  type TrackerState,
  type WeeklyTest,
  type WeeklyTestKind,
  type WeeklyTestSource,
  removeTestSeries,
  updateTestSeries,
  updateWeeklyTestScore,
  updateWeeklyTestTaken,
} from "@/lib/trackerStore";
import { BarChart3, CalendarCheck2, Check, ExternalLink, Link2, Plus, Trash2, Trophy } from "lucide-react";

interface Props {
  state: TrackerState;
  onUpdate: (state: TrackerState) => void;
}

const kinds: WeeklyTestKind[] = ["mock", "subject", "quiz"];
const QUIZ_ONLY_SOURCE = "GateOverflow Quizzes";

const memberBorder: Record<Member, string> = {
  Bhavesh: "border-person1 text-person1",
  Aryan: "border-amber-500 text-amber-600",
  Avani: "border-pink-500 text-pink-600",
  Akshita: "border-emerald-500 text-emerald-600",
  Nayan: "border-violet-500 text-violet-600",
};

export default function WeeklyTestsSection({ state, onUpdate }: Props) {
  const currentWeek = getWeekNumber(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState<WeeklyTestSource>("GO Classes");
  const [kind, setKind] = useState<WeeklyTestKind>("mock");
  const [coverageScope, setCoverageScope] = useState<TestCoverageScope>("full");
  const [subjectId, setSubjectId] = useState("");
  const [topicLabel, setTopicLabel] = useState("");
  const [scheduledWeek, setScheduledWeek] = useState(String(currentWeek));
  const [testLink, setTestLink] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [notes, setNotes] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [seriesUrl, setSeriesUrl] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState(state.testSeries[0]?.id ?? "");
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});

  const sortedTests = useMemo(
    () => [...state.weeklyTests].sort((a, b) => b.scheduledWeek - a.scheduledWeek || a.name.localeCompare(b.name)),
    [state.weeklyTests]
  );
  const analysis = useMemo(() => getWeeklyTestAnalysis(state), [state]);
  const subjectTests = useMemo(
    () => state.weeklyTests.filter((test) => test.kind === "subject"),
    [state.weeklyTests]
  );

  const groupedTests = sortedTests.reduce<Record<string, WeeklyTest[]>>((acc, test) => {
    const key = test.scheduledWeek === currentWeek ? `Week ${test.scheduledWeek} (Current)` : `Week ${test.scheduledWeek}`;
    acc[key] = acc[key] || [];
    acc[key].push(test);
    return acc;
  }, {});

  const isQuizOnlySource = source === QUIZ_ONLY_SOURCE;
  const selectedSeries =
    state.testSeries.find((series) => series.id === selectedSeriesId) ??
    state.testSeries[0] ??
    null;
  const editingSeries =
    state.testSeries.find((series) => series.id === editingSeriesId) ?? null;

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
      notes: notes.trim(),
      statusByMember: Object.fromEntries(
        MEMBERS.map((member) => [
          member,
          { taken: false, score: null, outOf: totalMarks.trim() ? parseFloat(totalMarks) || null : null },
        ])
      ) as WeeklyTest["statusByMember"],
    };

    onUpdate(addWeeklyTest(state, test));
    setName("");
    setSource("GO Classes");
    setKind("mock");
    setCoverageScope("full");
    setSubjectId("");
    setTopicLabel("");
    setScheduledWeek(String(currentWeek));
    setTestLink("");
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

  const getDraftKey = (testId: string, member: Member, field: "score" | "outOf") => `${testId}|${member}|${field}`;

  const getDraftValue = (testId: string, member: Member, field: "score" | "outOf", fallback?: number | null) => {
    const key = getDraftKey(testId, member, field);
    return draftScores[key] ?? (typeof fallback === "number" ? String(fallback) : "");
  };

  const saveMemberScore = (test: WeeklyTest, member: Member) => {
    const scoreRaw = getDraftValue(test.id, member, "score", test.statusByMember[member]?.score);
    const outOfRaw = getDraftValue(test.id, member, "outOf", test.statusByMember[member]?.outOf);
    const parsedScore = scoreRaw.trim() === "" ? null : parseFloat(scoreRaw);
    const parsedOutOf = outOfRaw.trim() === "" ? null : parseFloat(outOfRaw);

    onUpdate(
      updateWeeklyTestScore(
        state,
        test.id,
        member,
        Number.isFinite(parsedScore as number) ? parsedScore : null,
        Number.isFinite(parsedOutOf as number) ? parsedOutOf : null
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarCheck2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Weekly Tests</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        Track which weekly tests should be taken, save the portal links, and mark who has completed them.
      </p>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Platform Test Links</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Add and manage the test series you use. Any series added here becomes available in both Weekly Tests and Mock Tests.
        </p>
        <div className="flex justify-end">
          {!showAddSeries ? (
            <button
              onClick={() => setShowAddSeries(true)}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium"
            >
              Add Series
            </button>
          ) : (
            <div className="w-full rounded-lg border border-dashed border-border bg-background p-3 space-y-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
                <input
                  value={seriesName}
                  onChange={(e) => setSeriesName(e.target.value)}
                  placeholder="Test series name"
                  className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  value={seriesUrl}
                  onChange={(e) => setSeriesUrl(e.target.value)}
                  placeholder="Test series link"
                  className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button onClick={handleAddSeries} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium">
                  Save
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAddSeries(false);
                    setSeriesName("");
                    setSeriesUrl("");
                  }}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
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
                  onClick={() =>
                    setEditingSeriesId((current) =>
                      current === selectedSeries.id ? null : selectedSeries.id
                    )
                  }
                  className="px-3 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-lg"
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Modify Test Series
                  </p>
                  <button
                    onClick={() => {
                      onUpdate(removeTestSeries(state, editingSeries.id));
                      const fallback = state.testSeries.find((series) => series.id !== editingSeries.id);
                      setSelectedSeriesId(fallback?.id ?? "");
                      setEditingSeriesId(null);
                    }}
                    className="px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
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
                    className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    value={editingSeries.url}
                    onChange={(e) => onUpdate(updateTestSeries(state, editingSeries.id, { url: e.target.value }))}
                    placeholder={`Paste ${editingSeries.name} link`}
                    className="w-full px-3 py-2 text-sm bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test name"
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="full">Full Syllabus</option>
              <option value="subject">Subject Wise</option>
              <option value="topic">Topic Wise</option>
            </select>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={coverageScope === "full"}
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {coverageScope === "topic" && (
            <input
              value={topicLabel}
              onChange={(e) => setTopicLabel(e.target.value)}
              placeholder="Topic wise name (e.g., Set Theory, Linear Algebra)"
              className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          <input
            value={testLink}
            onChange={(e) => setTestLink(e.target.value)}
            placeholder="Direct test or quiz link (optional)"
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)}
            placeholder="Default out of marks (optional)"
            type="number"
            min={1}
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes or syllabus coverage"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium">
              Add
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setName("");
                setSource("GO Classes");
                setKind("mock");
                setCoverageScope("full");
                setSubjectId("");
                setTopicLabel("");
                setScheduledWeek(String(currentWeek));
                setTestLink("");
                setTotalMarks("");
                setNotes("");
              }}
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sortedTests.length === 0 && !showAdd && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No weekly tests planned yet. Add this week's tests to start tracking them.
        </div>
      )}

      {sortedTests.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {analysis.map((entry) => (
            <div
              key={entry.member}
              className={`group rounded-xl border-2 px-3 py-2 min-h-[64px] ${memberBorder[entry.member]}`}
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-1.5 font-semibold">
                  <span>{entry.member}</span>
                  {entry.bestPercent !== null && <Trophy className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-medium">Tests: {entry.testsTaken}</span>
              </div>
              <div className="mt-1 text-[11px] opacity-0 max-h-0 overflow-hidden transition-all duration-200 group-hover:opacity-100 group-hover:max-h-16">
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Weekly Test
        </button>
      </div>

      {subjectTests.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Subject Test Score Comparison</h3>
          </div>
          {subjectTests.map((test) => (
            <div key={test.id} className="rounded-lg bg-muted/40 p-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-foreground">{getWeeklyTestDisplayName(test)}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                  {test.source}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                  {getCoverageScopeLabel(test.coverageScope ?? "full")}
                </span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {MEMBERS.map((member) => {
                  const status = test.statusByMember[member];
                  const percent =
                    status.taken && typeof status.score === "number" && typeof status.outOf === "number" && status.outOf > 0
                      ? Math.round((status.score / status.outOf) * 100)
                      : null;

                  return (
                    <div key={member} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{member}:</span>{" "}
                      {status.taken
                        ? `${status.score ?? "-"} / ${status.outOf ?? "-"}${percent !== null ? ` (${percent}%)` : ""}`
                        : "Pending"}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.entries(groupedTests).map(([label, tests]) => (
        <div key={label} className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          {tests.map((test) => (
            <div key={test.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-foreground">{getWeeklyTestDisplayName(test)}</h4>
                    {test.topicLabel && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        {test.topicLabel}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                      {test.source}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                      {getCoverageScopeLabel(test.coverageScope ?? "full")}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent text-accent-foreground">
                      {test.kind === "mock" ? "Mock" : test.kind === "subject" ? "Subject" : "Weekly Quiz"}
                    </span>
                    {test.link && (
                      <a
                        href={test.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {test.notes && <p className="text-xs text-muted-foreground mt-1">{test.notes}</p>}
                </div>
                <button
                  onClick={() => onUpdate(deleteWeeklyTest(state, test.id))}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                  title="Delete weekly test"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {MEMBERS.map((member) => {
                  const status = test.statusByMember[member];
                  return (
                    <div
                      key={member}
                      className={`border-2 rounded-lg p-3 text-left transition-colors ${memberBorder[member]} ${status.taken ? "bg-muted/50" : "bg-background"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{member}</span>
                        <button
                          onClick={() => onUpdate(updateWeeklyTestTaken(state, test.id, member, !status.taken))}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${status.taken ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                        >
                          {status.taken && <Check className="w-3.5 h-3.5" />}
                          {status.taken ? "Taken" : "Mark done"}
                        </button>
                      </div>
                      <p className="text-xs mt-1">
                        {status.taken && status.takenAt
                          ? `Taken on ${new Date(status.takenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                          : "Not taken yet"}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <input
                          value={getDraftValue(test.id, member, "score", status.score)}
                          onChange={(e) =>
                            setDraftScores((current) => ({
                              ...current,
                              [getDraftKey(test.id, member, "score")]: e.target.value,
                            }))
                          }
                          onBlur={() => saveMemberScore(test, member)}
                          onKeyDown={(e) => e.key === "Enter" && saveMemberScore(test, member)}
                          placeholder="Score"
                          type="number"
                          min={0}
                          className="w-full px-2 py-1 text-xs bg-muted rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          value={getDraftValue(test.id, member, "outOf", status.outOf)}
                          onChange={(e) =>
                            setDraftScores((current) => ({
                              ...current,
                              [getDraftKey(test.id, member, "outOf")]: e.target.value,
                            }))
                          }
                          onBlur={() => saveMemberScore(test, member)}
                          onKeyDown={(e) => e.key === "Enter" && saveMemberScore(test, member)}
                          placeholder="Out of"
                          type="number"
                          min={1}
                          className="w-full px-2 py-1 text-xs bg-muted rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      {status.taken && typeof status.score === "number" && typeof status.outOf === "number" && status.outOf > 0 && (
                        <p className="text-xs mt-2 font-medium">
                          {Math.round((status.score / status.outOf) * 100)}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

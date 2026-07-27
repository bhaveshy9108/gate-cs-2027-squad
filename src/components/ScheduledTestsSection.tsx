import { useEffect, useMemo, useState } from "react";
import { MEMBERS, SUBJECTS } from "@/lib/gateData";
import {
  addTestSeries,
  addWeeklyTest,
  getWeekNumber,
  removeTestSeries,
  updateTestSeries,
  type TestCoverageScope,
  type TrackerState,
  type WeeklyTest,
  type WeeklyTestKind,
  type WeeklyTestSource,
} from "@/lib/trackerStore";
import { CalendarCheck2, ExternalLink, Link2, Plus, X } from "lucide-react";

interface Props {
  state: TrackerState;
  onUpdate: (state: TrackerState) => void;
}

const kinds: WeeklyTestKind[] = ["mock", "subject", "quiz"];
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

export default function ScheduledTestsSection({ state, onUpdate }: Props) {
  const currentWeek = getWeekNumber(new Date());
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

  useEffect(() => {
    if (!state.testSeries.length) return;
    if (!state.testSeries.some((series) => series.id === selectedSeriesId)) {
      setSelectedSeriesId(state.testSeries[0].id);
    }
  }, [selectedSeriesId, state.testSeries]);

  const selectedSeries =
    state.testSeries.find((series) => series.id === selectedSeriesId) ?? state.testSeries[0] ?? null;
  const editingSeries = state.testSeries.find((series) => series.id === editingSeriesId) ?? null;
  const seriesButtons = useMemo(() => state.testSeries, [state.testSeries]);
  const isQuizOnlySource = source === QUIZ_ONLY_SOURCE;

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
    setNotes("");
  };

  const handleAddTest = () => {
    if (!name.trim()) return;
    const parsedTotalMarks = totalMarks.trim() ? parseFloat(totalMarks) : null;
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
      totalMarks: parsedTotalMarks ?? undefined,
      notes: notes.trim(),
      statusByMember: buildStatusByMember(parsedTotalMarks),
    };
    onUpdate(addWeeklyTest(state, test));
    resetForm();
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Scheduled Tests</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Add a scheduled entry with its series, scope, link, marks, and notes so it stays synced with the rest of the tracker.
        </p>

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
              <select
                value={isQuizOnlySource ? "quiz" : kind}
                onChange={(e) => setKind(e.target.value as WeeklyTestKind)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isQuizOnlySource}
              >
                {kinds.map((item) => (
                  <option key={item} value={item}>
                    {item === "mock" ? "Mock Test" : item === "subject" ? "Subject Test" : "Weekly Quiz"}
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
            <div className="grid gap-3 md:grid-cols-2">
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
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes or syllabus coverage"
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAddTest}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Add
            </button>
            <button onClick={resetForm} className="rounded-lg px-3 py-2 text-sm text-muted-foreground">
              Cancel
            </button>
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
      </div>
    </div>
  );
}

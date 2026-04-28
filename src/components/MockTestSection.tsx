import { useState } from "react";
import { MEMBERS, SUBJECTS, type Member } from "@/lib/gateData";
import {
  type TrackerState,
  addMockTest,
  getCoverageScopeLabel,
  getMockTestDisplayName,
  getMockTestTypeLabel,
  updateMockScore,
  deleteMockTest,
  getHighestScorer,
  type MockTest,
  type TestCoverageScope,
  type MockTestType,
} from "@/lib/trackerStore";
import { ClipboardList, Link2, Plus, Trash2, Trophy } from "lucide-react";

interface Props {
  state: TrackerState;
  member: Member;
  onUpdate: (s: TrackerState) => void;
}

const QUIZ_ONLY_SOURCE = "GateOverflow Quizzes";

export default function MockTestSection({ state, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [testName, setTestName] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [notes, setNotes] = useState("");
  const [testType, setTestType] = useState<MockTestType>("full");
  const [coverageScope, setCoverageScope] = useState<TestCoverageScope>("full");
  const [subjectId, setSubjectId] = useState("");
  const [topicLabel, setTopicLabel] = useState("");
  const [source, setSource] = useState("GO Classes");
  const [editingScore, setEditingScore] = useState<{ testId: string; member: Member } | null>(null);
  const [scoreInput, setScoreInput] = useState("");
  const isQuizOnlySource = source === QUIZ_ONLY_SOURCE;
  const sortedMockTests = [...state.mockTests].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });

  const getMemberBorderColor = (member: Member) => {
    switch (member) {
      case "Bhavesh":
        return "border-person1";
      case "Aryan":
        return "border-amber-500";
      case "Avani":
        return "border-pink-500";
      case "Akshita":
        return "border-emerald-500";
      case "Nayan":
        return "border-violet-500";
    }
  };

  const handleAddTest = () => {
    if (!testName.trim() || !totalMarks.trim()) return;
    const test: MockTest = {
      id: `mock-${Date.now()}`,
      name: testName.trim(),
      subjectId: coverageScope !== "full" ? subjectId || undefined : undefined,
      coverageScope,
      topicLabel: coverageScope === "topic" ? topicLabel.trim() : "",
      source,
      date: new Date().toISOString().split("T")[0],
      type: isQuizOnlySource ? "weekly" : testType,
      totalMarks: parseFloat(totalMarks) || 100,
      notes: notes.trim(),
      scores: Object.fromEntries(MEMBERS.map((member) => [member, null])) as MockTest["scores"],
    };
    onUpdate(addMockTest(state, test));
    setTestName("");
    setTotalMarks("");
    setNotes("");
    setTestType("full");
    setCoverageScope("full");
    setSubjectId("");
    setTopicLabel("");
    setSource("GO Classes");
    setShowAdd(false);
  };

  const handleScoreSubmit = (testId: string, member: Member) => {
    const score = parseFloat(scoreInput);
    if (isNaN(score)) return;
    onUpdate(updateMockScore(state, testId, member, score));
    setEditingScore(null);
    setScoreInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Mock Tests</h2>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Test
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Weekly Tests create synced mock-test entries automatically. Score changes in either section stay aligned.
      </p>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            autoFocus
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Test name (e.g., Mock Test 1 - Made Easy)"
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid gap-3 md:grid-cols-4">
            <select
              value={source}
              onChange={(e) => {
                const nextSource = e.target.value;
                setSource(nextSource);
                if (nextSource === QUIZ_ONLY_SOURCE) {
                  setTestType("weekly");
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
              value={testType}
              onChange={(e) => setTestType(e.target.value as MockTestType)}
              disabled={isQuizOnlySource}
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isQuizOnlySource ? (
                <option value="weekly">Weekly Quiz</option>
              ) : (
                <>
                  <option value="full">Full Length</option>
                  <option value="subject">Subject Wise</option>
                  <option value="weekly">Weekly Quiz</option>
                </>
              )}
            </select>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={coverageScope === "full"}
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">{coverageScope === "topic" ? "Select subject for topic" : "Select subject"}</option>
              {SUBJECTS.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
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
            value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)}
            placeholder="Total marks (e.g., 100)"
            type="number"
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes (optional)"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleAddTest} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium">
              Add
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setTestName("");
                setTotalMarks("");
                setNotes("");
                setTestType("full");
                setCoverageScope("full");
                setSubjectId("");
                setTopicLabel("");
                setSource("GO Classes");
              }}
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sortedMockTests.length === 0 && !showAdd && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No mock tests added yet. Click "Add Test" to get started.
        </div>
      )}

      {sortedMockTests.map((test) => {
        const highest = getHighestScorer(test);
        const allScored = MEMBERS.every((m) => test.scores[m] !== null);
        const isLinkedWeeklyTest = Boolean(test.linkedWeeklyTestId);

        return (
          <div key={test.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{getMockTestDisplayName(test)}</h3>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    test.type === "subject"
                      ? "bg-accent text-accent-foreground"
                      : test.type === "weekly"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {getMockTestTypeLabel(test.type)}
                </span>
                {test.source && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                    {test.source}
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                  {getCoverageScopeLabel(test.coverageScope ?? "full")}
                </span>
                {isLinkedWeeklyTest && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Link2 className="w-3 h-3" />
                    Synced with Weekly Tests
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{test.date}</span>
                <button
                  onClick={() => onUpdate(deleteMockTest(state, test.id))}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                  title={isLinkedWeeklyTest ? "Delete linked weekly + mock test" : "Delete test"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              Out of: <span className="font-semibold text-foreground">{test.totalMarks}</span>
              {test.notes && <> | {test.notes}</>}
            </p>
            {isLinkedWeeklyTest && (
              <p className="text-[11px] text-muted-foreground mb-2">
                Score changes here also update the linked Weekly Test entry.
              </p>
            )}
            {highest && allScored && (
              <div className="flex items-center gap-1 mb-2">
                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-xs font-semibold text-yellow-600">
                  {highest.member} topped with {highest.score}/{test.totalMarks}
                </span>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {MEMBERS.map((m) => {
                const score = test.scores[m];
                const isEditing = editingScore?.testId === test.id && editingScore.member === m;
                const colors = getMemberBorderColor(m);
                const isTop = highest && allScored && highest.member === m;

                return (
                  <div key={m} className={`border-2 ${colors} rounded-lg p-3 text-center ${isTop ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}`}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      {m} {isTop && <Trophy className="w-3 h-3 inline text-yellow-500" />}
                    </p>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <input
                          autoFocus
                          value={scoreInput}
                          onChange={(e) => setScoreInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleScoreSubmit(test.id, m)}
                          onBlur={() => {
                            setEditingScore(null);
                            setScoreInput("");
                          }}
                          placeholder="Score"
                          className="w-full px-2 py-1 text-sm text-center bg-muted rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingScore({ testId: test.id, member: m });
                          setScoreInput(score !== null ? String(score) : "");
                        }}
                        className="text-lg font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {score !== null ? `${score}/${test.totalMarks}` : "-"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

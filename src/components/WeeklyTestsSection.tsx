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
  updateWeeklyTestScore,
  updateWeeklyTestTaken,
  type TestCoverageScope,
  type TrackerState,
  type WeeklyTest,
  type WeeklyTestKind,
  type WeeklyTestSource,
} from "@/lib/trackerStore";
import { extractOrderedPdfLines } from "@/lib/pdfImport";
import {
  BarChart3,
  CalendarCheck2,
  Check,
  ExternalLink,
  FileUp,
  Link2,
  Plus,
  Search,
  Trash2,
  Trophy,
  X,
} from "lucide-react";

interface Props {
  state: TrackerState;
  onUpdate: (state: TrackerState) => void;
}

const kinds: WeeklyTestKind[] = ["mock", "subject", "quiz"];
const QUIZ_ONLY_SOURCE = "GateOverflow Quizzes";

const memberBorder: Record<Member, string> = {
  Bhavesh: "border-person1 text-person1",
};

type PdfImportDraft = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  subjectId: string;
  coverageScope: TestCoverageScope;
  selected: boolean;
};

function splitPdfRow(rawTitle: string) {
  const normalized = rawTitle.replace(/\s+/g, " ").trim();
  const colonIndex = normalized.indexOf(":");

  if (colonIndex !== -1) {
    return {
      title: normalized.slice(0, colonIndex).trim().replace(/[-:]+$/, "").trim(),
      subtitle: normalized.slice(colonIndex + 1).trim(),
    };
  }

  return { title: normalized, subtitle: "" };
}

function buildStatusByMember(totalMarks?: number | null): WeeklyTest["statusByMember"] {
  return Object.fromEntries(
    MEMBERS.map((member) => [
      member,
      {
        taken: false,
        score: null,
        outOf: typeof totalMarks === "number" && Number.isFinite(totalMarks) && totalMarks > 0 ? totalMarks : null,
      },
    ])
  ) as WeeklyTest["statusByMember"];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function inferSubjectIdFromTitle(title: string): string {
  const lower = title.toLowerCase();
  const mappings: Array<[string, string[]]> = [
    ["engg-math", ["engineering mathematics", "engg math", "mathematics", "linear algebra", "calculus", "probability", "statistics", "numerical methods", "differential equations", "set theory", "graph theory", "mathematical logic"]],
    ["discrete-math", ["discrete mathematics", "discrete math", "dm", "combinatorics", "graph theory", "set theory", "logic", "relations", "functions", "lattices"]],
    ["dsa", ["data structures", "algorithm", "algorithms", "dsa", "sorting", "searching", "graphs", "tree", "heap", "hashing", "dynamic programming", "greedy"]],
    ["prog", ["programming in c", "programming", "c programming", "c language", "pointers", "recursion", "functions", "structures"]],
    ["toc", ["theory of computation", "toc", "automata", "regular language", "regular expression", "pda", "turing", "undecidability", "countability"]],
    ["compiler", ["compiler design", "compiler", "lexical", "syntax", "parse", "parsing", "code optimization"]],
    ["os", ["operating system", "operating systems", "os", "process", "thread", "scheduling", "deadlock", "memory management", "virtual memory", "file system"]],
    ["dbms", ["database", "dbms", "sql", "relational algebra", "normalization", "transaction", "indexing", "b+ tree", "b tree"]],
    ["cn", ["computer network", "computer networks", "cn", "tcp/ip", "routing", "subnet", "transport layer", "congestion", "dns", "http"]],
    ["digital-logic", ["digital logic", "dl", "boolean", "k-map", "combinational", "sequential", "flip-flop", "counter", "number system"]],
    ["coa", ["computer organization", "computer architecture", "coa", "pipeline", "cache", "addressing modes", "control unit", "alu"]],
    ["aptitude", ["general aptitude", "aptitude", "analytical reasoning", "verbal", "numerical", "spatial"]],
  ];

  for (const [subjectId, keywords] of mappings) {
    if (keywords.some((keyword) => lower.includes(keyword))) return subjectId;
  }

  const fallback = SUBJECTS.find((subject) => lower.includes(subject.name.toLowerCase()));
  return fallback?.id ?? "";
}

function makePdfDraft(title: string, order: number): PdfImportDraft {
  const { title: baseTitle, subtitle } = splitPdfRow(title);
  const subjectId = inferSubjectIdFromTitle(baseTitle || title);
  return {
    id: `pdf-draft-${order}-${slugify(baseTitle || title) || order}`,
    order,
    title: baseTitle || title,
    subtitle,
    subjectId,
    coverageScope: subjectId ? "subject" : subtitle ? "topic" : "full",
    selected: true,
  };
}

function createImportedWeeklyTest(draft: PdfImportDraft, seriesName: string, week: number, fileName: string, orderIndex: number): WeeklyTest {
  return {
    id: `weekly-test-${Date.now()}-${draft.order}-${orderIndex}`,
    name: draft.title,
    source: seriesName,
    kind: draft.subjectId ? "subject" : "mock",
    subjectId: draft.subjectId || undefined,
    coverageScope: draft.coverageScope,
    topicLabel: "",
    link: "",
    scheduledWeek: week,
    seriesOrder: draft.order,
    notes: [draft.subtitle ? `Subtopics: ${draft.subtitle}` : "", `Imported from ${fileName}`].filter(Boolean).join(" | "),
    statusByMember: buildStatusByMember(),
  };
}

export default function WeeklyTestsSection({ state, onUpdate }: Props) {
  const currentWeek = getWeekNumber(new Date());
  const currentMember = state.currentMember;
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState<WeeklyTestSource>(state.testSeries[0]?.name ?? "GO Classes");
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
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | TestCoverageScope>("all");
  const [completionFilter, setCompletionFilter] = useState<"all" | "done" | "todo">("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [pdfImportBusy, setPdfImportBusy] = useState(false);
  const [pdfImportError, setPdfImportError] = useState("");
  const [pdfImportFileName, setPdfImportFileName] = useState("");
  const [pdfImportDrafts, setPdfImportDrafts] = useState<PdfImportDraft[]>([]);
  const [pdfImportWeek, setPdfImportWeek] = useState(String(currentWeek));
  const [pdfImportFilterSubjectId, setPdfImportFilterSubjectId] = useState("");
  const [pdfImportBulkSubjectId, setPdfImportBulkSubjectId] = useState("");

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
  const subjectTests = useMemo(() => state.weeklyTests.filter((test) => test.kind === "subject"), [state.weeklyTests]);
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
        const topicBlob = [test.topicLabel, test.notes, test.name].join(" ").toLowerCase();
        if (!topicBlob.includes(topicQuery)) return false;
      }
      if (query) {
        const haystack = [test.name, test.source, test.topicLabel, test.notes, getWeeklyTestDisplayName(test)].join(" ").toLowerCase();
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

  const visiblePdfDrafts = useMemo(
    () => pdfImportDrafts.filter((draft) => !pdfImportFilterSubjectId || draft.subjectId === pdfImportFilterSubjectId),
    [pdfImportDrafts, pdfImportFilterSubjectId]
  );

  const pdfImportSelectedCount = useMemo(
    () => pdfImportDrafts.filter((draft) => draft.selected).length,
    [pdfImportDrafts]
  );

  const isQuizOnlySource = source === QUIZ_ONLY_SOURCE;

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

  const handlePdfUpload = async (file: File | null) => {
    if (!file) return;

    setPdfImportBusy(true);
    setPdfImportError("");
    try {
      const lines = await extractOrderedPdfLines(file);
      const drafts = lines
        .map((line, index) => makePdfDraft(line, index))
        .filter((draft) => draft.title.trim().length >= 3);

      setPdfImportDrafts(drafts);
      setPdfImportFileName(file.name);
      setPdfImportWeek(String(currentWeek));
      setPdfImportFilterSubjectId("");
      setPdfImportBulkSubjectId("");
      setShowPdfImport(true);
    } catch (error) {
      setPdfImportError(error instanceof Error ? error.message : "Failed to read the PDF.");
    } finally {
      setPdfImportBusy(false);
    }
  };

  const updatePdfDraft = (draftId: string, updates: Partial<PdfImportDraft>) => {
    setPdfImportDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              ...updates,
              coverageScope:
                typeof updates.subjectId === "string" && updates.subjectId
                  ? "subject"
                  : typeof updates.coverageScope === "string"
                    ? updates.coverageScope
                    : draft.coverageScope,
            }
          : draft
      )
    );
  };

  const applyBulkSubjectToVisible = () => {
    if (!pdfImportBulkSubjectId) return;
    setPdfImportDrafts((current) =>
      current.map((draft) =>
        !pdfImportFilterSubjectId || draft.subjectId === pdfImportFilterSubjectId
          ? { ...draft, subjectId: pdfImportBulkSubjectId, coverageScope: "subject" }
          : draft
      )
    );
  };

  const handleSavePdfImports = () => {
    const selectedDrafts = pdfImportDrafts.filter((draft) => draft.selected && draft.title.trim());
    if (!selectedDrafts.length) return;

    const week = Math.max(1, parseInt(pdfImportWeek, 10) || currentWeek);
    let nextState = state;

    selectedDrafts.forEach((draft, index) => {
      const importedTest = createImportedWeeklyTest(
        draft,
        selectedSeries?.name ?? "Imported PDF",
        week,
        pdfImportFileName || "PDF",
        index
      );
      nextState = addWeeklyTest(nextState, importedTest);
    });

    onUpdate(nextState);
    setPdfImportDrafts([]);
    setPdfImportFileName("");
    setPdfImportError("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarCheck2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Weekly Tests</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        Track weekly tests, preserve imported order from PDFs, and keep scoring simple enough to update fast.
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as "all" | TestCoverageScope)}
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All scopes</option>
            <option value="subject">Subject wise</option>
            <option value="topic">Topic wise</option>
            <option value="full">Full syllabus</option>
          </select>
          <select
            value={completionFilter}
            onChange={(e) => setCompletionFilter(e.target.value as "all" | "done" | "todo")}
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All status</option>
            <option value="done">Completed</option>
            <option value="todo">To do</option>
          </select>
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

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <input
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            placeholder="Topic keyword filter"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Showing tests in the order they were added, with series order preserved for PDF imports.
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

          <button
            onClick={() => setShowPdfImport((current) => !current)}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
          >
            <FileUp className="h-4 w-4" />
            {showPdfImport ? "Hide PDF Import" : "Import PDF"}
          </button>
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

            {showPdfImport && (
              <div className="rounded-lg border border-dashed border-border bg-background p-3 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Import PDF test list</p>
                    <p className="text-xs text-muted-foreground">
                      The extracted rows stay in the same order as the PDF. Tag subjects before saving to weekly tests.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Search className="h-3.5 w-3.5 text-primary" />
                    <span>{pdfImportSelectedCount} selected</span>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                  <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground hover:border-primary/50">
                    <span className="inline-flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-primary" />
                      {pdfImportBusy ? "Reading PDF..." : "Choose PDF file"}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={async (event) => {
                        await handlePdfUpload(event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                      disabled={pdfImportBusy}
                    />
                  </label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Week number
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={pdfImportWeek}
                        onChange={(e) => setPdfImportWeek(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Filter by subject
                      </label>
                      <select
                        value={pdfImportFilterSubjectId}
                        onChange={(e) => setPdfImportFilterSubjectId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">All subjects</option>
                        {SUBJECTS.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Apply one subject to visible rows
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={pdfImportBulkSubjectId}
                          onChange={(e) => setPdfImportBulkSubjectId(e.target.value)}
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Choose subject</option>
                          {SUBJECTS.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={applyBulkSubjectToVisible}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!pdfImportBulkSubjectId}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {pdfImportError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {pdfImportError}
                  </div>
                )}

                {pdfImportFileName && (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Imported file: <span className="font-medium text-foreground">{pdfImportFileName}</span>
                  </div>
                )}

                {pdfImportDrafts.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Preview rows
                      </p>
                      <button
                        onClick={() => {
                          setPdfImportDrafts([]);
                          setPdfImportFileName("");
                          setPdfImportError("");
                        }}
                        className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-80 space-y-2 overflow-auto pr-1">
                      {visiblePdfDrafts.map((draft) => {
                        const subject = SUBJECTS.find((entry) => entry.id === draft.subjectId);
                        return (
                          <div key={draft.id} className="rounded-lg border border-border bg-muted/20 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <label className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={draft.selected}
                                  onChange={(e) => updatePdfDraft(draft.id, { selected: e.target.checked })}
                                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                      #{draft.order + 1}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">{draft.title}</span>
                                  </div>
                                  {draft.subtitle && <p className="mt-1 text-xs text-muted-foreground">{draft.subtitle}</p>}
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {subject?.name ?? "Subject not detected"} · will be added in week {pdfImportWeek || currentWeek}
                                  </p>
                                </div>
                              </label>
                              <div className="grid min-w-[220px] gap-2 sm:grid-cols-2 lg:min-w-[320px]">
                                <select
                                  value={draft.subjectId}
                                  onChange={(e) => updatePdfDraft(draft.id, { subjectId: e.target.value })}
                                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <option value="">Pick subject</option>
                                  {SUBJECTS.map((subjectOption) => (
                                    <option key={subjectOption.id} value={subjectOption.id}>
                                      {subjectOption.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() =>
                                    updatePdfDraft(draft.id, {
                                      subjectId: draft.subjectId,
                                      coverageScope: draft.subjectId ? "subject" : draft.subtitle ? "topic" : "full",
                                    })
                                  }
                                  className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-background"
                                >
                                  {draft.coverageScope === "topic" ? "Topic wise" : draft.coverageScope === "subject" ? "Subject wise" : "Full syllabus"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {visiblePdfDrafts.length} visible rows, ordered exactly as parsed from the PDF.
                      </p>
                      <button
                        onClick={handleSavePdfImports}
                        disabled={!pdfImportSelectedCount || pdfImportBusy}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Save selected rows
                      </button>
                    </div>
                  </div>
                )}
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
          <input
            value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)}
            placeholder="Default out of marks (optional)"
            type="number"
            min={1}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
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
                    <h4 className="text-sm font-semibold text-foreground">{getCoverageScopeLabel(scope as TestCoverageScope)}</h4>
                    <span className="text-xs text-muted-foreground">{scopedTests.length} items</span>
                  </div>

                  <div className="space-y-2">
                    {scopedTests.map((test) => {
                      const status = test.statusByMember[currentMember];
                      const percent =
                        status.taken && typeof status.score === "number" && typeof status.outOf === "number" && status.outOf > 0
                          ? Math.round((status.score / status.outOf) * 100)
                          : null;

                      return (
                        <div
                          key={test.id}
                          className={`rounded-xl border px-4 py-3 transition-colors ${
                            status.taken ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-900/10" : "border-border bg-background"
                          }`}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 space-y-2">
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
                                  {status.taken ? "Completed" : "To do"}
                                </span>
                                {test.link && (
                                  <a
                                    href={test.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                  >
                                    Open <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              {test.topicLabel && (
                                <p className="text-xs text-muted-foreground">Topic: {test.topicLabel}</p>
                              )}
                              {test.notes && <p className="text-xs text-muted-foreground">{test.notes}</p>}
                              {test.coverageScope === "topic" && !test.topicLabel && (
                                <p className="text-xs text-muted-foreground">Topicwise test. Use the imported subtopic details from the PDF notes.</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onUpdate(updateWeeklyTestTaken(state, test.id, currentMember, !status.taken))}
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium ${
                                  status.taken ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {status.taken && <Check className="w-3.5 h-3.5" />}
                                {status.taken ? "Mark not done" : "Mark done"}
                              </button>
                              <button
                                onClick={() => onUpdate(deleteWeeklyTest(state, test.id))}
                                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="Delete weekly test"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                              <p className="font-medium text-foreground">Status</p>
                              <p className="mt-1">{status.taken ? "Completed" : "Pending"}</p>
                            </div>
                            <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                              <p className="font-medium text-foreground">Score</p>
                              <p className="mt-1">
                                {status.taken
                                  ? `${status.score ?? "-"} / ${status.outOf ?? "-"}${percent !== null ? ` (${percent}%)` : ""}`
                                  : "Not entered"}
                              </p>
                            </div>
                            <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                              <p className="font-medium text-foreground">Taken on</p>
                              <p className="mt-1">
                                {status.taken && status.takenAt
                                  ? new Date(status.takenAt).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                    })
                                  : "Not yet"}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mt-3">
                            {MEMBERS.map((member) => {
                              const memberStatus = test.statusByMember[member];
                              return (
                                <div
                                  key={member}
                                  className={`rounded-lg border-2 p-3 text-left transition-colors ${memberBorder[member]} ${
                                    memberStatus.taken ? "bg-muted/50" : "bg-background"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold">{member}</span>
                                    <button
                                      onClick={() => onUpdate(updateWeeklyTestTaken(state, test.id, member, !memberStatus.taken))}
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                                        memberStatus.taken ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {memberStatus.taken && <Check className="w-3.5 h-3.5" />}
                                      {memberStatus.taken ? "Taken" : "Mark done"}
                                    </button>
                                  </div>
                                  <p className="text-xs mt-1">
                                    {memberStatus.taken && memberStatus.takenAt
                                      ? `Taken on ${new Date(memberStatus.takenAt).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                        })}`
                                      : "Not taken yet"}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 mt-3">
                                    <input
                                      value={getDraftValue(test.id, member, "score", memberStatus.score)}
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
                                      className="w-full rounded border border-border bg-muted px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <input
                                      value={getDraftValue(test.id, member, "outOf", memberStatus.outOf)}
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
                                      className="w-full rounded border border-border bg-muted px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                  {memberStatus.taken && typeof memberStatus.score === "number" && typeof memberStatus.outOf === "number" && memberStatus.outOf > 0 && (
                                    <p className="mt-2 text-xs font-medium">
                                      {Math.round((memberStatus.score / memberStatus.outOf) * 100)}%
                                    </p>
                                  )}
                                </div>
                              );
                            })}
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
  );
}

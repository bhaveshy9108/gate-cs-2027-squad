import { SUBJECTS, MEMBERS, type Member, type Topic } from "./gateData";
import { getPyqSubjectById } from "./pyqCatalog";
import { getScheduledTests } from "./testSchedules";

const STORAGE_KEY = "gate-cs-2027-tracker";

export interface ChecklistEntry {
  completed: boolean;
  completedAt?: string; // ISO date
  week?: number;
}

export type ChecklistData = Record<string, ChecklistEntry>;
// key: `${member}|${section}|${subjectId}|${topicId}`

export interface TopicNote {
  text: string;
  links: string[];
}

export type Difficulty = "easy" | "medium" | "hard";
export interface TestSeriesLink {
  id: string;
  name: string;
  url: string;
}

export type TestAnalysisChecklistKey = "reviewed" | "mistakes" | "revised" | "notesUpdated";

export interface TestAnalysisChecklist {
  reviewed: boolean;
  mistakes: boolean;
  revised: boolean;
  notesUpdated: boolean;
}

const DEFAULT_TEST_ANALYSIS_CHECKLIST: TestAnalysisChecklist = {
  reviewed: false,
  mistakes: false,
  revised: false,
  notesUpdated: false,
};

export interface TrackerState {
  checklist: ChecklistData;
  customTopics: Record<string, Topic[]>;
  deletedTopics: Record<string, string[]>;
  weeklyPyqPlan: Record<string, WeeklyPyqPlanItem[]>;
  mockTests: MockTest[];
  weeklyTests: WeeklyTest[];
  studyTimer: StudyTimerState;
  studySessions: StudySession[];
  testSeries: TestSeriesLink[];
  testAnalysisChecklist: Record<string, TestAnalysisChecklist>;
  currentMember: Member;
  lastUpdatedAt?: string;
  topicNotes: Record<string, TopicNote>; // key: `${subjectId}|${topicId}`
  topicDifficulty: Record<string, Difficulty>; // key: `${subjectId}|${topicId}`
}

export interface WeeklyPyqPlanItem {
  subjectId: string;
  topicId: string;
  topicName: string;
  count?: number;
  addedAt: string;
}

export type MockTestType = "subject" | "full" | "weekly";
export type TestCoverageScope = "full" | "subject" | "topic";

export interface MockTest {
  id: string;
  linkedWeeklyTestId?: string;
  subjectId?: string;
  coverageScope?: TestCoverageScope;
  topicLabel?: string;
  source?: string;
  name: string;
  date: string;
  type: MockTestType;
  questionCount?: number;
  totalMarks: number;
  notes: string;
  scores: Record<Member, number | null>;
  updatedAt?: string;
}

export type WeeklyTestSource = string;
export type WeeklyTestKind = "mock" | "subject" | "quiz";

export interface WeeklyTestMemberStatus {
  taken: boolean;
  takenAt?: string;
  score?: number | null;
  outOf?: number | null;
  correctQuestions?: number | null;
  lastTakenAt?: string;
  lastScore?: number | null;
  lastOutOf?: number | null;
  lastCorrectQuestions?: number | null;
}

export interface WeeklyTest {
  id: string;
  linkedMockTestId?: string;
  subjectId?: string;
  coverageScope?: TestCoverageScope;
  topicLabel?: string;
  link?: string;
  name: string;
  source: WeeklyTestSource;
  kind: WeeklyTestKind;
  scheduledWeek: number;
  seriesOrder?: number;
  questionCount?: number;
  totalMarks?: number;
  durationMinutes?: number;
  topics?: string[];
  notes: string;
  statusByMember: Record<Member, WeeklyTestMemberStatus>;
  isActive?: boolean;
  updatedAt?: string;
}

export type StudyTimerStatus = "idle" | "running" | "paused";

export interface StudyTimerState {
  status: StudyTimerStatus;
  member: Member;
  subjectId?: string;
  subjectName?: string;
  startedAt?: string;
  lastStartedAt?: string;
  lastPausedAt?: string;
  breakMs: number;
  effectiveMs: number;
}

export interface StudySession {
  id: string;
  member: Member;
  subjectId?: string;
  subjectName?: string;
  startedAt: string;
  endedAt: string;
  dayKey: string;
  breakMs: number;
  effectiveMs: number;
}

function getKey(member: string, section: string, subjectId: string, topicId: string) {
  return `${member}|${section}|${subjectId}|${topicId}`;
}

function normalizeSeriesName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.replace(/\s+/g, "").toLowerCase() === "madeeasy") return "Made Easy";
  return trimmed;
}

function defaultState(): TrackerState {
  return {
    checklist: {},
    customTopics: {},
    deletedTopics: {},
    weeklyPyqPlan: {},
    mockTests: [],
    weeklyTests: [],
    studyTimer: {
      status: "idle",
      member: "Bhavesh",
      breakMs: 0,
      effectiveMs: 0,
    },
    studySessions: [],
    testSeries: [
      { id: "series-gateoverflow", name: "GateOverflow", url: "" },
      { id: "series-gateoverflow-quizzes", name: "GateOverflow Quizzes", url: "https://gateoverflow.in/view-accesslist?accesslist=36&userid=296917" },
      { id: "series-goclasses", name: "GO Classes", url: "" },
      { id: "series-flts", name: "FLT's", url: "" },
      { id: "series-madeeasy", name: "Made Easy", url: "" },
      { id: "series-zeal", name: "Zeal", url: "" },
    ], 
    testAnalysisChecklist: {},
    currentMember: "Bhavesh",
    lastUpdatedAt: undefined,
    topicNotes: {},
    topicDifficulty: {},
  };
}

function normalizeTestSeries(testSeries: unknown, legacyPlatformLinks?: unknown): TestSeriesLink[] {
  const defaults = defaultState().testSeries;
  const normalizedFromArray = Array.isArray(testSeries)
    ? testSeries
        .map((entry, index) => {
          const record = typeof entry === "object" && entry !== null ? (entry as Partial<TestSeriesLink>) : {};
          const name = typeof record.name === "string" ? normalizeSeriesName(record.name) : "";
          if (!name) return null;
          return {
            id: typeof record.id === "string" && record.id ? record.id : `series-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            name,
            url: typeof record.url === "string" ? record.url : "",
          };
        })
        .filter((entry): entry is TestSeriesLink => Boolean(entry))
    : [];

  if (normalizedFromArray.length > 0) {
    const seen = new Set<string>();
    const deduped = normalizedFromArray.filter((entry) => {
      const key = entry.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (const entry of defaults) {
      if (!deduped.some((item) => item.name.toLowerCase() === entry.name.toLowerCase())) {
        deduped.push(entry);
      }
    }

    return deduped;
  }

  const legacy =
    typeof legacyPlatformLinks === "object" && legacyPlatformLinks !== null
      ? (legacyPlatformLinks as Record<string, unknown>)
      : {};

  return defaults.map((entry) => ({
    ...entry,
    url: typeof legacy[entry.name] === "string" ? (legacy[entry.name] as string) : "",
  }));
}

export function createDefaultState(): TrackerState {
  return seedScheduledTests(defaultState());
}

function normalizeStudyTimer(raw: unknown): StudyTimerState {
  const base = defaultState().studyTimer;
  const parsed = typeof raw === "object" && raw !== null ? (raw as Partial<StudyTimerState>) : {};
  const member = MEMBERS.includes(parsed.member as Member) ? (parsed.member as Member) : base.member;
  const status = parsed.status === "running" || parsed.status === "paused" || parsed.status === "idle" ? parsed.status : "idle";

  return {
    ...base,
    ...parsed,
    member,
    status,
    subjectId: typeof parsed.subjectId === "string" ? parsed.subjectId : undefined,
    subjectName: typeof parsed.subjectName === "string" ? parsed.subjectName : undefined,
    startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : undefined,
    lastStartedAt: typeof parsed.lastStartedAt === "string" ? parsed.lastStartedAt : undefined,
    lastPausedAt: typeof parsed.lastPausedAt === "string" ? parsed.lastPausedAt : undefined,
    breakMs: typeof parsed.breakMs === "number" && Number.isFinite(parsed.breakMs) ? Math.max(0, parsed.breakMs) : 0,
    effectiveMs: typeof parsed.effectiveMs === "number" && Number.isFinite(parsed.effectiveMs) ? Math.max(0, parsed.effectiveMs) : 0,
  };
}

function normalizeStudySessions(raw: unknown): StudySession[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((session, index) => {
      const record = typeof session === "object" && session !== null ? (session as Partial<StudySession>) : {};
      const member = MEMBERS.includes(record.member as Member) ? (record.member as Member) : null;
      const startedAt = typeof record.startedAt === "string" ? record.startedAt : "";
      const endedAt = typeof record.endedAt === "string" ? record.endedAt : "";
      const dayKey =
        typeof record.dayKey === "string" && record.dayKey
          ? record.dayKey
          : endedAt
            ? toLocalDateKey(endedAt)
            : startedAt
              ? toLocalDateKey(startedAt)
              : "";
      const effectiveMs = typeof record.effectiveMs === "number" && Number.isFinite(record.effectiveMs) ? Math.max(0, record.effectiveMs) : 0;

      if (!member || !startedAt || !endedAt || !dayKey) return null;

      return {
        id: typeof record.id === "string" && record.id ? record.id : `study-session-${index}`,
        member,
        subjectId: typeof record.subjectId === "string" ? record.subjectId : undefined,
        subjectName: typeof record.subjectName === "string" ? record.subjectName : undefined,
        startedAt,
        endedAt,
        dayKey,
        breakMs: typeof record.breakMs === "number" && Number.isFinite(record.breakMs) ? Math.max(0, record.breakMs) : 0,
        effectiveMs,
      };
    })
    .filter(Boolean) as StudySession[];
}

function normalizeMockTests(mockTests: unknown): MockTest[] {
  if (!Array.isArray(mockTests)) return [];

  return mockTests.map((test, index) => {
    const record = typeof test === "object" && test !== null ? (test as Partial<MockTest>) : {};
    const rawScores =
      typeof record.scores === "object" && record.scores !== null
        ? (record.scores as Partial<Record<string, number | null>>)
        : {};

    return {
      id: record.id ?? `mock-${index}`,
      linkedWeeklyTestId: typeof record.linkedWeeklyTestId === "string" ? record.linkedWeeklyTestId : undefined,
      subjectId: typeof record.subjectId === "string" ? record.subjectId : undefined,
      coverageScope:
        record.coverageScope === "subject" || record.coverageScope === "topic" || record.coverageScope === "full"
          ? record.coverageScope
          : record.subjectId
            ? "subject"
            : "full",
      topicLabel: typeof record.topicLabel === "string" ? record.topicLabel : "",
      source: typeof record.source === "string" ? record.source : undefined,
      name: record.name ?? `Mock Test ${index + 1}`,
      date: record.date ?? new Date().toISOString().split("T")[0],
      type:
        record.type === "subject" || record.type === "full" || record.type === "weekly"
          ? record.type
          : "full",
      questionCount:
        typeof record.questionCount === "number" && Number.isFinite(record.questionCount) && record.questionCount > 0
          ? Math.floor(record.questionCount)
          : undefined,
      totalMarks: typeof record.totalMarks === "number" ? record.totalMarks : 100,
      notes: typeof record.notes === "string" ? record.notes : "",
      scores: Object.fromEntries(
        MEMBERS.map((member) => [
          member,
          typeof rawScores[member] === "number" ? rawScores[member] : rawScores[member] === null ? null : null,
        ])
      ) as Record<Member, number | null>,
    };
  });
}

function normalizeTestAnalysisChecklist(raw: unknown): Record<string, TestAnalysisChecklist> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([testId, value]) => {
      const entry = value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<TestAnalysisChecklist>) : {};
      return [
        testId,
        {
          ...DEFAULT_TEST_ANALYSIS_CHECKLIST,
          reviewed: Boolean(entry.reviewed),
          mistakes: Boolean(entry.mistakes),
          revised: Boolean(entry.revised),
          notesUpdated: Boolean(entry.notesUpdated),
        },
      ];
    })
  );
}

function normalizeWeeklyTests(weeklyTests: unknown): WeeklyTest[] {
  if (!Array.isArray(weeklyTests)) return [];

  return weeklyTests.map((test, index) => {
    const record = typeof test === "object" && test !== null ? (test as Partial<WeeklyTest>) : {};
    const rawStatus =
      typeof record.statusByMember === "object" && record.statusByMember !== null
        ? (record.statusByMember as Partial<Record<string, WeeklyTestMemberStatus>>)
        : {};

    return {
      id: record.id ?? `weekly-test-${index}`,
      linkedMockTestId: typeof record.linkedMockTestId === "string" ? record.linkedMockTestId : undefined,
      subjectId: typeof record.subjectId === "string" ? record.subjectId : undefined,
      coverageScope:
        record.coverageScope === "subject" || record.coverageScope === "topic" || record.coverageScope === "full"
          ? record.coverageScope
          : record.subjectId
            ? "subject"
            : "full",
      topicLabel: typeof record.topicLabel === "string" ? record.topicLabel : "",
      link: typeof record.link === "string" ? record.link : "",
      name: record.name ?? `Weekly Test ${index + 1}`,
      source:
        typeof record.source === "string" && record.source.trim()
          ? normalizeSeriesName(record.source)
          : "GO Classes",
      kind:
        record.kind === "subject" || record.kind === "quiz" || record.kind === "mock"
          ? record.kind
          : "mock",
      scheduledWeek:
        typeof record.scheduledWeek === "number" && Number.isFinite(record.scheduledWeek)
          ? Math.max(1, Math.floor(record.scheduledWeek))
          : 1,
      seriesOrder:
        typeof record.seriesOrder === "number" && Number.isFinite(record.seriesOrder)
          ? Math.max(0, Math.floor(record.seriesOrder))
          : undefined,
      questionCount:
        typeof record.questionCount === "number" && Number.isFinite(record.questionCount)
          ? Math.max(0, Math.floor(record.questionCount))
          : undefined,
      totalMarks:
        typeof record.totalMarks === "number" && Number.isFinite(record.totalMarks)
          ? Math.max(0, record.totalMarks)
          : undefined,
      durationMinutes:
        typeof record.durationMinutes === "number" && Number.isFinite(record.durationMinutes)
          ? Math.max(0, Math.floor(record.durationMinutes))
          : undefined,
      topics: Array.isArray(record.topics) ? record.topics.filter((topic): topic is string => typeof topic === "string" && topic.trim()) : [],
      notes: typeof record.notes === "string" ? record.notes : "",
      isActive: typeof record.isActive === "boolean" ? record.isActive : true,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
      statusByMember: Object.fromEntries(
        MEMBERS.map((member) => {
          const status = rawStatus[member];
          return [
            member,
            {
              taken: Boolean(status?.taken),
              takenAt: typeof status?.takenAt === "string" ? status.takenAt : undefined,
              score: typeof status?.score === "number" ? status.score : status?.score === null ? null : null,
              outOf: typeof status?.outOf === "number" ? status.outOf : status?.outOf === null ? null : null,
              correctQuestions:
                typeof status?.correctQuestions === "number"
                  ? status.correctQuestions
                  : status?.correctQuestions === null
                    ? null
                    : null,
              lastTakenAt: typeof status?.lastTakenAt === "string" ? status.lastTakenAt : undefined,
              lastScore: typeof status?.lastScore === "number" ? status.lastScore : status?.lastScore === null ? null : null,
              lastOutOf: typeof status?.lastOutOf === "number" ? status.lastOutOf : status?.lastOutOf === null ? null : null,
              lastCorrectQuestions:
                typeof status?.lastCorrectQuestions === "number"
                  ? status.lastCorrectQuestions
                  : status?.lastCorrectQuestions === null
                    ? null
                    : null,
            },
          ];
        }) 
      ) as Record<Member, WeeklyTestMemberStatus>,
    };
  });
}

function restoreKnownLostTestData(state: TrackerState): TrackerState {
  const targetTitle = "GATE CSE 2026 SET 1";
  const fltTitles = new Set(["GATE CSE 2026 SET 1", "GATE CSE 2025 SET 1", "GATE CSE 2026 SET 2"]);
  const targetIsoDate = "2026-05-18T00:00:00.000Z";
  const targetScore = 12.67;
  const targetOutOf = 100;
  const targetCorrectQuestions = 9;

  const patchStatus = (status: WeeklyTestMemberStatus | undefined): WeeklyTestMemberStatus => ({
    ...status,
    taken: true,
    takenAt: targetIsoDate,
    score: targetScore,
    outOf: targetOutOf,
    correctQuestions: targetCorrectQuestions,
    lastTakenAt: targetIsoDate,
    lastScore: targetScore,
    lastOutOf: targetOutOf,
    lastCorrectQuestions: targetCorrectQuestions,
  });

  const nextWeeklyTests = state.weeklyTests.map((test) => {
    if (!fltTitles.has(test.name.trim())) return test;
    const current = test.statusByMember[state.currentMember];
    const shouldRestore =
      !current?.taken ||
      typeof current.score !== "number" ||
      typeof current.outOf !== "number" ||
      typeof current.correctQuestions !== "number" ||
      !current.takenAt;
    const nextTest: WeeklyTest = {
      ...test,
      source: "FLT's",
    };
    if (!shouldRestore) return nextTest;
    return {
      ...nextTest,
      updatedAt: new Date().toISOString(),
      statusByMember: {
        ...test.statusByMember,
        [state.currentMember]: patchStatus(current),
      },
    };
  });

  const nextMockTests = state.mockTests.map((test) => {
    if (!fltTitles.has(test.name.trim())) return test;
    return {
      ...test,
      source: "FLT's",
      totalMarks: targetOutOf,
      scores: {
        ...test.scores,
        [state.currentMember]: targetScore,
      },
    };
  });

  return {
    ...state,
    weeklyTests: nextWeeklyTests,
    mockTests: nextMockTests,
  };
}

export function normalizeTrackerState(raw: unknown): TrackerState {
  const base = defaultState();
  const parsed = typeof raw === "object" && raw !== null ? (raw as Partial<TrackerState>) : {};
  const allowedMembers = new Set<Member>(MEMBERS);
  return restoreKnownLostTestData(seedScheduledTests({
    ...base,
    ...parsed,
    checklist:
      typeof parsed.checklist === "object" && parsed.checklist !== null
        ? Object.fromEntries(
            Object.entries(parsed.checklist).filter(([key]) => {
              const member = key.split("|")[0] as Member;
              return allowedMembers.has(member);
            })
          )
        : base.checklist,
    customTopics:
      typeof parsed.customTopics === "object" && parsed.customTopics !== null
        ? parsed.customTopics
        : base.customTopics,
    deletedTopics:
      typeof parsed.deletedTopics === "object" && parsed.deletedTopics !== null
        ? parsed.deletedTopics
        : base.deletedTopics,
    weeklyPyqPlan:
      typeof parsed.weeklyPyqPlan === "object" && parsed.weeklyPyqPlan !== null
        ? parsed.weeklyPyqPlan
        : base.weeklyPyqPlan,
    mockTests: normalizeMockTests(parsed.mockTests),
    weeklyTests: normalizeWeeklyTests(parsed.weeklyTests),
    studyTimer: normalizeStudyTimer(parsed.studyTimer),
    studySessions: normalizeStudySessions(parsed.studySessions),
    testSeries: normalizeTestSeries(parsed.testSeries, (parsed as { platformLinks?: unknown }).platformLinks),
    testAnalysisChecklist: normalizeTestAnalysisChecklist(parsed.testAnalysisChecklist),
    currentMember: MEMBERS.includes(parsed.currentMember as Member) ? (parsed.currentMember as Member) : MEMBERS[0],
    lastUpdatedAt: typeof parsed.lastUpdatedAt === "string" ? parsed.lastUpdatedAt : base.lastUpdatedAt,
    topicNotes:
      typeof parsed.topicNotes === "object" && parsed.topicNotes !== null ? parsed.topicNotes : base.topicNotes,
    topicDifficulty:
      typeof parsed.topicDifficulty === "object" && parsed.topicDifficulty !== null
        ? parsed.topicDifficulty
        : base.topicDifficulty,
  }));
}

// Notes helpers
export function getTopicNote(state: TrackerState, subjectId: string, topicId: string): TopicNote {
  return state.topicNotes[`${subjectId}|${topicId}`] || { text: "", links: [] };
}

export function setTopicNote(state: TrackerState, subjectId: string, topicId: string, note: TopicNote): TrackerState {
  const key = `${subjectId}|${topicId}`;
  return { ...state, topicNotes: { ...state.topicNotes, [key]: note } };
}

// Difficulty helpers
const DIFFICULTY_CYCLE: (Difficulty | undefined)[] = [undefined, "easy", "medium", "hard"];

export function cycleDifficulty(state: TrackerState, subjectId: string, topicId: string): TrackerState {
  const key = `${subjectId}|${topicId}`;
  const current = state.topicDifficulty[key];
  const idx = DIFFICULTY_CYCLE.indexOf(current);
  const next = DIFFICULTY_CYCLE[(idx + 1) % DIFFICULTY_CYCLE.length];
  const newDiff = { ...state.topicDifficulty };
  if (next) {
    newDiff[key] = next;
  } else {
    delete newDiff[key];
  }
  return { ...state, topicDifficulty: newDiff };
}

export function getTopicDifficulty(state: TrackerState, subjectId: string, topicId: string): Difficulty | undefined {
  return state.topicDifficulty[`${subjectId}|${topicId}`];
}

export function getDifficultyStats(state: TrackerState): Record<Difficulty, number> {
  const stats: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const d of Object.values(state.topicDifficulty)) {
    stats[d]++;
  }
  return stats;
}

function toLocalDateKey(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromLocalDateKey(key: string) {
  const [year, month, day] = key.split("-").map((value) => Number(value));
  return new Date(year, month - 1, day);
}

function splitStudySessionAcrossDays(
  session: {
    member: Member;
    subjectId?: string;
    subjectName?: string;
    startedAt: string;
    endedAt: string;
    breakMs: number;
    effectiveMs: number;
  }
): StudySession[] {
  const start = new Date(session.startedAt);
  const end = new Date(session.endedAt);
  const totalDurationMs = Math.max(0, end.getTime() - start.getTime());
  if (totalDurationMs <= 0) return [];

  const segments: { startedAt: string; endedAt: string; dayKey: string; durationMs: number }[] = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const nextMidnight = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    const segmentEnd = nextMidnight < end ? nextMidnight : end;
    const durationMs = Math.max(0, segmentEnd.getTime() - cursor.getTime());
    if (durationMs > 0) {
      segments.push({
        startedAt: cursor.toISOString(),
        endedAt: segmentEnd.toISOString(),
        dayKey: toLocalDateKey(cursor),
        durationMs,
      });
    }
    cursor = segmentEnd;
  }

  if (segments.length === 0) return [];

  const effectiveRatio = Math.max(0, Math.min(1, session.effectiveMs / totalDurationMs));
  let remainingEffective = Math.max(0, session.effectiveMs);

  return segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    const effectiveMs = isLast ? remainingEffective : Math.max(0, Math.min(remainingEffective, Math.round(segment.durationMs * effectiveRatio)));
    const breakMs = Math.max(0, segment.durationMs - effectiveMs);

    if (!isLast) {
      remainingEffective -= effectiveMs;
    }

    return {
      id: `study-session-${Date.now()}-${index}`,
      member: session.member,
      subjectId: session.subjectId,
      subjectName: session.subjectName,
      startedAt: segment.startedAt,
      endedAt: segment.endedAt,
      dayKey: segment.dayKey,
      breakMs,
      effectiveMs,
    };
  });
}

export function formatStudyDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

export function getCurrentStudyTimerElapsed(state: TrackerState, now = new Date()): number {
  const timer = state.studyTimer;
  if (timer.status !== "running") return timer.effectiveMs;
  if (!timer.lastStartedAt) return timer.effectiveMs;
  return timer.effectiveMs + Math.max(0, now.getTime() - new Date(timer.lastStartedAt).getTime());
}

export function getCurrentStudyTimerBreakElapsed(state: TrackerState, now = new Date()): number {
  const timer = state.studyTimer;
  if (timer.status !== "paused") return timer.breakMs;
  if (!timer.lastPausedAt) return timer.breakMs;
  return timer.breakMs + Math.max(0, now.getTime() - new Date(timer.lastPausedAt).getTime());
}

export function startStudyTimer(state: TrackerState, member: Member, subjectId?: string, subjectName?: string): TrackerState {
  const now = new Date().toISOString();
  return {
    ...state,
    studyTimer: {
      status: "running",
      member,
      subjectId,
      subjectName,
      startedAt: now,
      lastStartedAt: now,
      lastPausedAt: undefined,
      breakMs: 0,
      effectiveMs: 0,
    },
  };
}

export function pauseStudyTimer(state: TrackerState): TrackerState {
  const timer = state.studyTimer;
  if (timer.status !== "running" || !timer.lastStartedAt) return state;
  const now = new Date().toISOString();
  return {
    ...state,
    studyTimer: {
      ...timer,
      status: "paused",
      effectiveMs: timer.effectiveMs + Math.max(0, new Date(now).getTime() - new Date(timer.lastStartedAt).getTime()),
      lastStartedAt: undefined,
      lastPausedAt: now,
    },
  };
}

export function resumeStudyTimer(state: TrackerState): TrackerState {
  const timer = state.studyTimer;
  if (timer.status !== "paused") return state;
  const now = new Date().toISOString();
  return {
    ...state,
    studyTimer: {
      ...timer,
      status: "running",
      breakMs:
        timer.breakMs + (timer.lastPausedAt ? Math.max(0, new Date(now).getTime() - new Date(timer.lastPausedAt).getTime()) : 0),
      lastStartedAt: now,
      lastPausedAt: undefined,
    },
  };
}

export function stopStudyTimer(state: TrackerState): TrackerState {
  const timer = state.studyTimer;
  if (timer.status === "idle") return state;
  const now = new Date().toISOString();
  const runningMs =
    timer.status === "running" && timer.lastStartedAt
      ? Math.max(0, new Date(now).getTime() - new Date(timer.lastStartedAt).getTime())
      : 0;
  const effectiveMs = timer.effectiveMs + runningMs;
  const breakMs =
    timer.breakMs +
    (timer.status === "paused" && timer.lastPausedAt
      ? Math.max(0, new Date(now).getTime() - new Date(timer.lastPausedAt).getTime())
      : 0);

  const nextSessions =
    effectiveMs > 0 && timer.startedAt
      ? [
          ...state.studySessions,
          ...splitStudySessionAcrossDays({
            member: timer.member,
            subjectId: timer.subjectId,
            subjectName: timer.subjectName,
            startedAt: timer.startedAt,
            endedAt: now,
            breakMs,
            effectiveMs,
          }),
        ]
      : state.studySessions;

  return {
    ...state,
    studySessions: nextSessions,
    studyTimer: {
      status: "idle",
      member: timer.member,
      breakMs: 0,
      effectiveMs: 0,
      lastStartedAt: undefined,
      lastPausedAt: undefined,
    },
  };
}

export function resetStudyTimer(state: TrackerState): TrackerState {
  return {
    ...state,
    studyTimer: {
      status: "idle",
      member: state.studyTimer.member,
      breakMs: 0,
      effectiveMs: 0,
      lastStartedAt: undefined,
      lastPausedAt: undefined,
    },
  };
}

export function updateStudyTimerSubject(state: TrackerState, subjectId?: string, subjectName?: string): TrackerState {
  const timer = state.studyTimer;
  if (timer.status === "idle") {
    return {
      ...state,
      studyTimer: {
        ...timer,
        subjectId,
        subjectName,
      },
    };
  }

  return {
    ...state,
    studyTimer: {
      ...timer,
      subjectId,
      subjectName,
    },
  };
}

export function deleteStudySession(state: TrackerState, sessionId: string): TrackerState {
  return {
    ...state,
    studySessions: state.studySessions.filter((session) => session.id !== sessionId),
  };
}

export function updateStudySessionSubject(
  state: TrackerState,
  sessionId: string,
  subjectId?: string,
  subjectName?: string
): TrackerState {
  return {
    ...state,
    studySessions: state.studySessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            subjectId,
            subjectName,
          }
        : session
    ),
  };
}

export interface StudyDaySummary {
  date: string;
  label: string;
  effectiveMs: number;
  breakMs: number;
  totalMs: number;
  sessionCount: number;
}

export function getStudyDaySummaries(state: TrackerState, days = 10): StudyDaySummary[] {
  const today = new Date();
  const buckets = new Map<string, StudyDaySummary>();

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const key = toLocalDateKey(date);
    buckets.set(key, {
      date: key,
      label: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
      effectiveMs: 0,
      breakMs: 0,
      totalMs: 0,
      sessionCount: 0,
    });
  }

  for (const session of state.studySessions) {
    const key = session.dayKey || toLocalDateKey(session.endedAt || session.startedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const totalMs = Math.max(0, new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime());
    bucket.effectiveMs += session.effectiveMs;
    bucket.breakMs += Math.max(0, totalMs - session.effectiveMs);
    bucket.totalMs += totalMs;
    bucket.sessionCount += 1;
  }

  const timer = state.studyTimer;
  if (timer.startedAt && timer.status !== "idle") {
    const liveEnd = timer.status === "paused" ? timer.lastPausedAt ?? undefined : new Date().toISOString();
    const liveEffectiveMs = timer.status === "running" ? getCurrentStudyTimerElapsed(state) : timer.effectiveMs;
    if (liveEnd && liveEffectiveMs > 0) {
      for (
        const segment of splitStudySessionAcrossDays({
          member: timer.member,
          subjectId: timer.subjectId,
          subjectName: timer.subjectName,
          startedAt: timer.startedAt,
          endedAt: liveEnd,
          breakMs: timer.breakMs,
          effectiveMs: liveEffectiveMs,
        })
      ) {
        const bucket = buckets.get(segment.dayKey);
        if (!bucket) continue;
        const totalMs = Math.max(0, new Date(segment.endedAt).getTime() - new Date(segment.startedAt).getTime());
        bucket.effectiveMs += segment.effectiveMs;
        bucket.breakMs += Math.max(0, totalMs - segment.effectiveMs);
        bucket.totalMs += totalMs;
        bucket.sessionCount += 1;
      }
    }
  }

  return Array.from(buckets.values());
}

export function getStudyDailyTotals(state: TrackerState, days = 10): { date: string; label: string; effectiveMs: number }[] {
  const today = new Date();
  const buckets = new Map<string, number>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const key = toLocalDateKey(date);
    buckets.set(key, 0);
  }

  for (const session of state.studySessions) {
    const key = session.dayKey || toLocalDateKey(session.endedAt || session.startedAt);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + session.effectiveMs);
  }

  const timer = state.studyTimer;
  if (timer.startedAt && timer.status !== "idle") {
    const liveEnd = timer.status === "paused" ? timer.lastPausedAt ?? undefined : new Date().toISOString();
    const liveEffectiveMs = timer.status === "running" ? getCurrentStudyTimerElapsed(state) : timer.effectiveMs;
    if (liveEnd && liveEffectiveMs > 0) {
      for (
        const segment of splitStudySessionAcrossDays({
          member: timer.member,
          subjectId: timer.subjectId,
          subjectName: timer.subjectName,
          startedAt: timer.startedAt,
          endedAt: liveEnd,
          breakMs: timer.breakMs,
          effectiveMs: liveEffectiveMs,
        })
      ) {
        if (!buckets.has(segment.dayKey)) continue;
        buckets.set(segment.dayKey, (buckets.get(segment.dayKey) ?? 0) + segment.effectiveMs);
      }
    }
  }

  return Array.from(buckets.entries()).map(([date, effectiveMs]) => {
    const d = fromLocalDateKey(date);
    return {
      date,
      label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      effectiveMs,
    };
  });
}

export function loadState(): TrackerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeTrackerState(JSON.parse(raw));
    }
  } catch {}
  return defaultState();
}

export function saveState(state: TrackerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getWeeklyPyqPlan(state: TrackerState, week: number): WeeklyPyqPlanItem[] {
  return state.weeklyPyqPlan[String(week)] ?? [];
}

export function addWeeklyPyqPlanItem(state: TrackerState, week: number, item: WeeklyPyqPlanItem): TrackerState {
  const key = String(week);
  const current = state.weeklyPyqPlan[key] ?? [];
  if (current.some((entry) => entry.subjectId === item.subjectId && entry.topicId === item.topicId)) {
    return state;
  }
  return {
    ...state,
    weeklyPyqPlan: {
      ...state.weeklyPyqPlan,
      [key]: [...current, item],
    },
  };
}

export function removeWeeklyPyqPlanItem(state: TrackerState, week: number, subjectId: string, topicId: string): TrackerState {
  const key = String(week);
  const current = state.weeklyPyqPlan[key] ?? [];
  const next = current.filter((entry) => !(entry.subjectId === subjectId && entry.topicId === topicId));
  return {
    ...state,
    weeklyPyqPlan: {
      ...state.weeklyPyqPlan,
      [key]: next,
    },
  };
}

export function toggleTopic(
  state: TrackerState,
  member: Member,
  section: string,
  subjectId: string,
  topicId: string
): TrackerState {
  const key = getKey(member, section, subjectId, topicId);
  const existing = state.checklist[key];
  const now = new Date();
  const weekNum = getWeekNumber(now);

  const newChecklist = { ...state.checklist };
  if (existing?.completed) {
    newChecklist[key] = { completed: false };
  } else {
    newChecklist[key] = { completed: true, completedAt: now.toISOString(), week: weekNum };
  }
  return { ...state, checklist: newChecklist };
}

export function isCompleted(
  state: TrackerState,
  member: Member,
  section: string,
  subjectId: string,
  topicId: string
): boolean {
  const key = getKey(member, section, subjectId, topicId);
  return state.checklist[key]?.completed ?? false;
}

export function getCompletionEntry(
  state: TrackerState,
  member: Member,
  section: string,
  subjectId: string,
  topicId: string
): ChecklistEntry | undefined {
  const key = getKey(member, section, subjectId, topicId);
  return state.checklist[key];
}

export function addCustomTopic(state: TrackerState, subjectId: string, topicName: string): TrackerState {
  const existing = state.customTopics[subjectId] || [];
  const newTopic: Topic = {
    id: `custom-${subjectId}-${Date.now()}`,
    name: topicName,
    isCustom: true,
  };
  return {
    ...state,
    customTopics: { ...state.customTopics, [subjectId]: [...existing, newTopic] },
  };
}

export function getAllTopics(state: TrackerState, subjectId: string, section = "study"): Topic[] {
  if (section === "pyq") {
    return getPyqSubjectById(subjectId)?.topics ?? [];
  }

  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const base = subject?.topics || [];
  const deleted = state.deletedTopics?.[subjectId] || [];
  const filteredBase = base.filter((t) => !deleted.includes(t.id));
  const custom = state.customTopics[subjectId] || [];
  return [...filteredBase, ...custom];
}

export function getSubjectProgress(
  state: TrackerState,
  member: Member,
  section: string,
  subjectId: string
): { done: number; total: number } {
  const topics = getAllTopics(state, subjectId, section);
  const done = topics.filter((t) => isCompleted(state, member, section, subjectId, t.id)).length;
  return { done, total: topics.length };
}

export function addMockTest(state: TrackerState, test: MockTest): TrackerState {
  return { ...state, mockTests: [...state.mockTests, test] };
}

export function getSubjectNameById(subjectId?: string): string | null {
  if (!subjectId) return null;
  return SUBJECTS.find((subject) => subject.id === subjectId)?.name ?? null;
}

export function getWeeklyTestDisplayName(test: Pick<WeeklyTest, "name" | "subjectId">): string {
  return getStructuredTestDisplayName({
    name: test.name,
    subjectId: test.subjectId,
    coverageScope: (test as Partial<WeeklyTest>).coverageScope,
    topicLabel: (test as Partial<WeeklyTest>).topicLabel,
  });
}

export function getMockTestDisplayName(test: Pick<MockTest, "name" | "subjectId">): string {
  return getStructuredTestDisplayName({
    name: test.name,
    subjectId: test.subjectId,
    coverageScope: (test as Partial<MockTest>).coverageScope,
    topicLabel: (test as Partial<MockTest>).topicLabel,
  });
}

function getStructuredTestDisplayName(test: {
  name: string;
  subjectId?: string;
  coverageScope?: TestCoverageScope;
  topicLabel?: string;
}): string {
  const subjectName = getSubjectNameById(test.subjectId);
  const topicLabel = test.topicLabel?.trim();
  const normalizedName = test.name.trim().toLowerCase();
  const normalizedSubject = subjectName?.trim().toLowerCase();
  const normalizedTopic = topicLabel?.toLowerCase();
  const alreadyContainsSubject = Boolean(normalizedSubject && normalizedName.includes(normalizedSubject));
  const alreadyContainsTopic = Boolean(normalizedTopic && normalizedName.includes(normalizedTopic));

  if (test.coverageScope === "topic" && topicLabel) {
    if (alreadyContainsSubject || alreadyContainsTopic) return test.name;
    return subjectName ? `${subjectName} | ${topicLabel} | ${test.name}` : `${topicLabel} | ${test.name}`;
  }

  if (test.coverageScope === "subject" && subjectName) {
    if (alreadyContainsSubject) return test.name;
    return `${subjectName} | ${test.name}`;
  }

  return test.name;
}

export function getCoverageScopeLabel(scope: TestCoverageScope): string {
  if (scope === "topic") return "Topic Wise";
  if (scope === "subject") return "Subject Wise";
  return "Full Syllabus";
}

export function addTestSeries(state: TrackerState, name: string, url: string): TrackerState {
  const trimmedName = name.trim();
  if (!trimmedName) return state;
  const exists = state.testSeries.some((entry) => entry.name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) return state;

  const newSeries: TestSeriesLink = {
    id: `series-${Date.now()}-${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: trimmedName,
    url: url.trim(),
  };

  return {
    ...state,
    testSeries: [...state.testSeries, newSeries],
  };
}

export function updateTestSeries(state: TrackerState, seriesId: string, updates: Partial<Pick<TestSeriesLink, "name" | "url">>): TrackerState {
  return {
    ...state,
    testSeries: state.testSeries.map((entry) =>
      entry.id === seriesId
        ? {
            ...entry,
            name: typeof updates.name === "string" && updates.name.trim() ? updates.name.trim() : entry.name,
            url: typeof updates.url === "string" ? updates.url : entry.url,
          }
        : entry
    ),
  };
}

export function removeTestSeries(state: TrackerState, seriesId: string): TrackerState {
  const removed = state.testSeries.find((entry) => entry.id === seriesId);
  if (!removed) return state;

  const fallbackSource = state.testSeries.find((entry) => entry.id !== seriesId)?.name ?? "GO Classes";
  return {
    ...state,
    testSeries: state.testSeries.filter((entry) => entry.id !== seriesId),
    weeklyTests: state.weeklyTests.map((test) =>
      test.source === removed.name ? { ...test, source: fallbackSource } : test
    ),
    mockTests: state.mockTests.map((test) =>
      test.source === removed.name ? { ...test, source: fallbackSource } : test
    ),
  };
}

function getMockTypeFromWeeklyKind(kind: WeeklyTestKind): MockTestType {
  if (kind === "subject") return "subject";
  if (kind === "quiz") return "weekly";
  return "full";
}

export function addWeeklyTest(state: TrackerState, test: WeeklyTest): TrackerState {
  const linkedMockTestId = test.linkedMockTestId ?? `linked-mock-${test.id}`;
  const totalMarks =
    MEMBERS.map((member) => test.statusByMember[member]?.outOf)
      .find((value) => typeof value === "number" && value > 0) ?? 100;

  const linkedMockTest: MockTest = {
    id: linkedMockTestId,
    linkedWeeklyTestId: test.id,
    subjectId: test.subjectId,
    coverageScope: test.coverageScope,
    topicLabel: test.topicLabel,
    source: test.source,
    name: getWeeklyTestDisplayName(test),
    date: new Date().toISOString().split("T")[0],
    type: getMockTypeFromWeeklyKind(test.kind),
    questionCount: test.questionCount,
    totalMarks,
    notes: `${test.source}${test.notes ? ` - ${test.notes}` : ""}`,
    updatedAt: new Date().toISOString(),
    scores: Object.fromEntries(
      MEMBERS.map((member) => [member, typeof test.statusByMember[member]?.score === "number" ? test.statusByMember[member]?.score ?? null : null])
    ) as Record<Member, number | null>,
  };

  return {
    ...state,
    weeklyTests: [...state.weeklyTests, { ...test, linkedMockTestId, isActive: test.isActive ?? true, updatedAt: test.updatedAt ?? new Date().toISOString() }].sort((a, b) => {
      if (a.scheduledWeek !== b.scheduledWeek) return a.scheduledWeek - b.scheduledWeek;
      const aOrder = typeof a.seriesOrder === "number" ? a.seriesOrder : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.seriesOrder === "number" ? b.seriesOrder : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.id.localeCompare(a.id);
    }),
    mockTests: [...state.mockTests, linkedMockTest],
  };
}

export function updateWeeklyTestActive(
  state: TrackerState,
  testId: string,
  isActive: boolean
): TrackerState {
  return {
    ...state,
    weeklyTests: state.weeklyTests.map((test) =>
      test.id === testId ? { ...test, isActive, updatedAt: new Date().toISOString() } : test
    ),
  };
}

function buildSeedStatus(totalMarks = 100): WeeklyTest["statusByMember"] {
  return Object.fromEntries(
    MEMBERS.map((member) => [
      member,
      {
        taken: false,
        score: null,
        outOf: totalMarks,
      },
    ])
  ) as WeeklyTest["statusByMember"];
}

function seedScheduledTests(state: TrackerState): TrackerState {
  const existingIds = new Set(state.weeklyTests.map((test) => test.id));
  let nextState = state;

  for (const seed of getScheduledTests()) {
    if (existingIds.has(seed.id)) continue;
    existingIds.add(seed.id);
    nextState = addWeeklyTest(nextState, {
      id: seed.id,
      name: seed.name,
      source: seed.source,
      kind: seed.coverageScope === "full" ? "mock" : "subject",
      subjectId: seed.subjectId,
      coverageScope: seed.coverageScope,
      topicLabel: "",
      link: "",
      scheduledWeek: seed.scheduledWeek,
      seriesOrder: seed.seriesOrder,
      questionCount: seed.questionCount,
      totalMarks: seed.totalMarks,
      durationMinutes: seed.durationMinutes,
      topics: seed.topics,
      notes: seed.notes,
      statusByMember: buildSeedStatus(seed.totalMarks),
    });
  }

  return nextState;
}

export function deleteWeeklyTest(state: TrackerState, testId: string): TrackerState {
  const linkedMockIds = state.weeklyTests
    .filter((test) => test.id === testId)
    .map((test) => test.linkedMockTestId)
    .filter((value): value is string => Boolean(value));

  return {
    ...state,
    weeklyTests: state.weeklyTests.filter((test) => test.id !== testId),
    mockTests: state.mockTests.filter((test) => !linkedMockIds.includes(test.id)),
  };
}

export function updateWeeklyTestTaken(
  state: TrackerState,
  testId: string,
  member: Member,
  taken: boolean,
  takenAt?: string | null
): TrackerState {
  const nextWeeklyTests = state.weeklyTests.map((test) =>
    test.id === testId
      ? {
          ...test,
          updatedAt: new Date().toISOString(),
          statusByMember: {
            ...test.statusByMember,
            [member]: taken
              ? (() => {
                  const existing = test.statusByMember[member];
                  const restoredTakenAt =
                    typeof takenAt === "string" && takenAt.trim()
                      ? new Date(takenAt).toISOString()
                      : existing?.takenAt ?? existing?.lastTakenAt ?? new Date().toISOString();
                  const restoredScore =
                    typeof existing?.score === "number"
                      ? existing.score
                      : typeof existing?.lastScore === "number"
                        ? existing.lastScore
                        : null;
                  const restoredOutOf =
                    typeof existing?.outOf === "number"
                      ? existing.outOf
                      : typeof existing?.lastOutOf === "number"
                        ? existing.lastOutOf
                        : null;
                  const restoredCorrectQuestions =
                    typeof existing?.correctQuestions === "number"
                      ? existing.correctQuestions
                      : typeof existing?.lastCorrectQuestions === "number"
                        ? existing.lastCorrectQuestions
                        : null;
                  return {
                    ...existing,
                    taken: true,
                    takenAt: restoredTakenAt,
                    score: restoredScore,
                    outOf: restoredOutOf,
                    correctQuestions: restoredCorrectQuestions,
                  };
                })()
              : {
                  ...test.statusByMember[member],
                  lastTakenAt: test.statusByMember[member]?.takenAt ?? test.statusByMember[member]?.lastTakenAt,
                  lastScore:
                    typeof test.statusByMember[member]?.score === "number"
                      ? test.statusByMember[member]?.score
                      : test.statusByMember[member]?.lastScore ?? null,
                  lastOutOf:
                    typeof test.statusByMember[member]?.outOf === "number"
                      ? test.statusByMember[member]?.outOf
                      : test.statusByMember[member]?.lastOutOf ?? null,
                  lastCorrectQuestions:
                    typeof test.statusByMember[member]?.correctQuestions === "number"
                      ? test.statusByMember[member]?.correctQuestions
                      : test.statusByMember[member]?.lastCorrectQuestions ?? null,
                  taken: false,
                  takenAt: undefined,
                  score: null,
                  outOf: null,
                  correctQuestions: null,
                },
          },
        }
      : test
  );

  const nextMockTests = state.mockTests.map((test) =>
    test.linkedWeeklyTestId === testId
      ? {
          ...test,
          updatedAt: new Date().toISOString(),
          scores: {
            ...test.scores,
            [member]: taken ? test.scores[member] ?? 0 : null,
          },
        }
      : test
  );

  return {
    ...state,
    weeklyTests: nextWeeklyTests,
    mockTests: nextMockTests,
  };
}

export function updateWeeklyTestScore(
  state: TrackerState,
  testId: string,
  member: Member,
  score: number | null,
  outOf: number | null,
  correctQuestions: number | null = null
): TrackerState {
  const nextWeeklyTests = state.weeklyTests.map((test) =>
    test.id === testId
      ? {
          ...test,
          updatedAt: new Date().toISOString(),
          statusByMember: {
            ...test.statusByMember,
            [member]: {
              ...test.statusByMember[member],
              taken: true,
              takenAt: test.statusByMember[member]?.takenAt ?? new Date().toISOString(),
              score,
              outOf,
              correctQuestions,
              lastTakenAt: test.statusByMember[member]?.takenAt ?? test.statusByMember[member]?.lastTakenAt,
              lastScore: score ?? test.statusByMember[member]?.lastScore ?? null,
              lastOutOf: outOf ?? test.statusByMember[member]?.lastOutOf ?? null,
              lastCorrectQuestions: correctQuestions ?? test.statusByMember[member]?.lastCorrectQuestions ?? null,
            },
          },
          totalMarks: typeof outOf === "number" && outOf > 0 ? outOf : test.totalMarks,
        }
      : test
  );

  const nextMockTests = state.mockTests.map((test) =>
    test.linkedWeeklyTestId === testId
      ? {
          ...test,
          totalMarks: typeof outOf === "number" && outOf > 0 ? outOf : test.totalMarks,
          source: state.weeklyTests.find((weeklyTest) => weeklyTest.id === testId)?.source ?? test.source,
          updatedAt: new Date().toISOString(),
          scores: {
            ...test.scores,
            [member]: score,
          },
        }
      : test
  );

  return {
    ...state,
    weeklyTests: nextWeeklyTests,
    mockTests: nextMockTests,
  };
}

export function updateWeeklyTestMeta(
  state: TrackerState,
  testId: string,
  updates: Partial<Pick<WeeklyTest, "questionCount" | "totalMarks" | "durationMinutes" | "link">>
): TrackerState {
  const nextTotalMarks =
    typeof updates.totalMarks === "number" && Number.isFinite(updates.totalMarks) && updates.totalMarks > 0
      ? updates.totalMarks
      : updates.totalMarks === null
        ? undefined
        : undefined;
  const nextWeeklyTests = state.weeklyTests.map((test) =>
    test.id === testId
      ? {
          ...test,
          updatedAt: new Date().toISOString(),
          questionCount:
            typeof updates.questionCount === "number" && Number.isFinite(updates.questionCount) && updates.questionCount > 0
              ? Math.floor(updates.questionCount)
              : updates.questionCount === null
                ? undefined
                : test.questionCount,
          totalMarks: nextTotalMarks ?? test.totalMarks,
          durationMinutes:
            typeof updates.durationMinutes === "number" && Number.isFinite(updates.durationMinutes) && updates.durationMinutes > 0
              ? Math.floor(updates.durationMinutes)
              : updates.durationMinutes === null
                ? undefined
                : test.durationMinutes,
          link:
            typeof updates.link === "string"
              ? updates.link.trim()
                ? updates.link.trim()
                : undefined
              : test.link,
          statusByMember:
            typeof nextTotalMarks === "number"
              ? Object.fromEntries(
                  MEMBERS.map((member) => [
                    member,
                    {
                      ...test.statusByMember[member],
                      outOf: nextTotalMarks,
                    },
                  ])
                ) as WeeklyTest["statusByMember"]
              : test.statusByMember,
        }
      : test
  );

  const nextMockTests = state.mockTests.map((test) =>
    test.linkedWeeklyTestId === testId
      ? {
          ...test,
          questionCount: nextWeeklyTests.find((weeklyTest) => weeklyTest.id === testId)?.questionCount ?? test.questionCount,
          totalMarks: nextWeeklyTests.find((weeklyTest) => weeklyTest.id === testId)?.totalMarks ?? test.totalMarks,
        }
      : test
  );

  return {
    ...state,
    weeklyTests: nextWeeklyTests,
    mockTests: nextMockTests,
  };
}

export function updateMockTestMeta(
  state: TrackerState,
  testId: string,
  updates: Partial<Pick<MockTest, "questionCount" | "totalMarks">>
): TrackerState {
  const nextQuestionCount =
    typeof updates.questionCount === "number" && Number.isFinite(updates.questionCount) && updates.questionCount > 0
      ? Math.floor(updates.questionCount)
      : updates.questionCount === null
        ? undefined
        : undefined;
  const nextTotalMarks =
    typeof updates.totalMarks === "number" && Number.isFinite(updates.totalMarks) && updates.totalMarks > 0
      ? Math.floor(updates.totalMarks)
      : updates.totalMarks === null
        ? undefined
        : undefined;

  const nextMockTests = state.mockTests.map((test) =>
    test.id === testId
      ? {
          ...test,
          questionCount: nextQuestionCount ?? test.questionCount,
          totalMarks: nextTotalMarks ?? test.totalMarks,
        }
      : test
  );

  const linkedWeeklyTestId = state.mockTests.find((test) => test.id === testId)?.linkedWeeklyTestId;
  const nextWeeklyTests = linkedWeeklyTestId
    ? state.weeklyTests.map((test) =>
        test.id === linkedWeeklyTestId
          ? {
              ...test,
              questionCount: nextQuestionCount ?? test.questionCount,
              statusByMember:
                typeof nextTotalMarks === "number"
                  ? Object.fromEntries(
                      MEMBERS.map((member) => [
                        member,
                        {
                          ...test.statusByMember[member],
                          outOf: nextTotalMarks,
                        },
                      ])
                    ) as WeeklyTest["statusByMember"]
                  : test.statusByMember,
              totalMarks: nextTotalMarks ?? test.totalMarks,
            }
          : test
      )
    : state.weeklyTests;

  return {
    ...state,
    mockTests: nextMockTests,
    weeklyTests: nextWeeklyTests,
  };
}

export function deleteMockTest(state: TrackerState, testId: string): TrackerState {
  const linkedWeeklyIds = state.mockTests
    .filter((test) => test.id === testId)
    .map((test) => test.linkedWeeklyTestId)
    .filter((value): value is string => Boolean(value));

  return {
    ...state,
    mockTests: state.mockTests.filter((t) => t.id !== testId),
    weeklyTests: state.weeklyTests.filter((test) => !linkedWeeklyIds.includes(test.id)),
  };
}

export function updateMockScore(
  state: TrackerState,
  testId: string,
  member: Member,
  score: number
): TrackerState {
  const nextMockTests = state.mockTests.map((t) =>
    t.id === testId ? { ...t, scores: { ...t.scores, [member]: score } } : t
  );

  const linkedWeekly = state.mockTests.find((test) => test.id === testId)?.linkedWeeklyTestId;
  const nextWeeklyTests = linkedWeekly
    ? state.weeklyTests.map((test) =>
        test.id === linkedWeekly
          ? {
              ...test,
              statusByMember: {
                ...test.statusByMember,
                [member]: {
                  ...test.statusByMember[member],
                  taken: true,
                  takenAt: test.statusByMember[member]?.takenAt ?? new Date().toISOString(),
                  score,
                  outOf:
                    typeof test.statusByMember[member]?.outOf === "number" && (test.statusByMember[member]?.outOf ?? 0) > 0
                      ? test.statusByMember[member]?.outOf ?? null
                      : state.mockTests.find((mock) => mock.id === testId)?.totalMarks ?? null,
                },
              },
            }
          : test
      )
    : state.weeklyTests;

  return {
    ...state,
    mockTests: nextMockTests,
    weeklyTests: nextWeeklyTests,
  };
}

export function getHighestScorer(test: MockTest): { member: Member; score: number } | null {
  let best: { member: Member; score: number } | null = null;
  for (const m of MEMBERS) {
    const s = test.scores[m];
    if (s !== null && (best === null || s > best.score)) {
      best = { member: m, score: s };
    }
  }
  return best;
}

export function getMockTestTypeLabel(type: MockTestType): string {
  if (type === "subject") return "Subject Wise";
  if (type === "weekly") return "Weekly Quiz";
  return "FLT's";
}

export interface TestPerformanceRecord {
  id: string;
  displayName: string;
  name: string;
  type: MockTestType;
  source: WeeklyTestSource | null;
  subjectId?: string;
  coverageScope?: TestCoverageScope;
  topicLabel?: string;
  subjectName: string | null;
  date: string;
  updatedAt?: string;
  totalMarks: number;
  scores: Record<Member, number | null>;
}

export function getTestPerformanceRecords(state: TrackerState): TestPerformanceRecord[] {
  return state.mockTests.map((mockTest) => {
    const linkedWeeklyTest = mockTest.linkedWeeklyTestId
      ? state.weeklyTests.find((weeklyTest) => weeklyTest.id === mockTest.linkedWeeklyTestId)
      : undefined;

    return {
      id: mockTest.id,
      displayName: getMockTestDisplayName(mockTest),
      name: mockTest.name,
      type: mockTest.type,
      source: linkedWeeklyTest?.source ?? mockTest.source ?? null,
      subjectId: mockTest.subjectId,
      coverageScope: mockTest.coverageScope,
      topicLabel: mockTest.topicLabel,
      subjectName: getSubjectNameById(mockTest.subjectId),
      date: mockTest.date,
      updatedAt: mockTest.updatedAt,
      totalMarks: mockTest.totalMarks,
      scores: mockTest.scores,
    };
  });
}

export function getTestAnalysisChecklist(state: TrackerState, testId: string): TestAnalysisChecklist {
  return {
    ...DEFAULT_TEST_ANALYSIS_CHECKLIST,
    ...(state.testAnalysisChecklist[testId] ?? {}),
  };
}

export function isTestAnalysisComplete(state: TrackerState, testId: string): boolean {
  return Object.values(getTestAnalysisChecklist(state, testId)).every(Boolean);
}

export function toggleTestAnalysisChecklistItem(
  state: TrackerState,
  testId: string,
  key: TestAnalysisChecklistKey
): TrackerState {
  const existing = getTestAnalysisChecklist(state, testId);
  return {
    ...state,
    testAnalysisChecklist: {
      ...state.testAnalysisChecklist,
      [testId]: {
        ...existing,
        [key]: !existing[key],
      },
    },
  };
}

export function setTestAnalysisChecklistDone(state: TrackerState, testId: string, done: boolean): TrackerState {
  return {
    ...state,
    testAnalysisChecklist: {
      ...state.testAnalysisChecklist,
      [testId]: done
        ? {
            reviewed: true,
            mistakes: true,
            revised: true,
            notesUpdated: true,
          }
        : {
            reviewed: false,
            mistakes: false,
            revised: false,
            notesUpdated: false,
          },
    },
  };
}

export function getWeekNumber(date: Date): number {
  const start = new Date(2026, 3, 6);
  const diff = date.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1);
}

// Week-wise progress
export interface WeekProgressMockTest {
  id: string;
  name: string;
  date: string;
  source?: string;
  subjectId?: string;
  coverageScope?: TestCoverageScope;
  topicLabel?: string;
  type: MockTestType;
  totalMarks: number;
  scores: Record<Member, number | null>;
}

export interface WeekProgressWeeklyTest {
  id: string;
  name: string;
  subjectId?: string;
  coverageScope?: TestCoverageScope;
  topicLabel?: string;
  link?: string;
  source: WeeklyTestSource;
  kind: WeeklyTestKind;
  scheduledWeek: number;
  memberStatus: Record<Member, WeeklyTestMemberStatus>;
}

export interface WeekProgress {
  week: number;
  items: { member: Member; section: string; subjectName: string; topicName: string; completedAt: string }[];
  mockTests: WeekProgressMockTest[];
  weeklyTests: WeekProgressWeeklyTest[];
}

export function getWeeklyProgress(state: TrackerState): WeekProgress[] {
  const weekMap = new Map<number, { items: WeekProgress["items"]; mockTests: WeekProgressMockTest[]; weeklyTests: WeekProgressWeeklyTest[] }>();

  for (const [key, entry] of Object.entries(state.checklist)) {
    if (!entry.completed || !entry.week) continue;
    const [member, section, subjectId, topicId] = key.split("|");
    const subject = SUBJECTS.find((s) => s.id === subjectId);
    const allTopics = getAllTopics(state, subjectId);
    const topic = allTopics.find((t) => t.id === topicId);

    const data = weekMap.get(entry.week) || { items: [], mockTests: [], weeklyTests: [] };
    data.items.push({
      member: member as Member,
      section,
      subjectName: subject?.name || subjectId,
      topicName: topic?.name || topicId,
      completedAt: entry.completedAt || "",
    });
    weekMap.set(entry.week, data);
  }

  // Add mock tests to their respective weeks
  for (const test of state.mockTests) {
    const hasScore = Object.values(test.scores).some((score) => typeof score === "number");
    if (!hasScore) continue;
    const week = getWeekNumber(new Date(test.date));
    const data = weekMap.get(week) || { items: [], mockTests: [], weeklyTests: [] };
    data.mockTests.push({
      id: test.id,
      name: test.name,
      date: test.date,
      source: test.source,
      subjectId: test.subjectId,
      coverageScope: test.coverageScope,
      topicLabel: test.topicLabel,
      type: test.type || "full",
      totalMarks: test.totalMarks,
      scores: test.scores,
    });
    weekMap.set(week, data);
  }

  for (const test of state.weeklyTests) {
    const hasTakenStatus = Object.values(test.statusByMember).some((status) => status.taken);
    if (!hasTakenStatus) continue;
    const data = weekMap.get(test.scheduledWeek) || { items: [], mockTests: [], weeklyTests: [] };
    data.weeklyTests.push({
      id: test.id,
      name: test.name,
      subjectId: test.subjectId,
      coverageScope: test.coverageScope,
      topicLabel: test.topicLabel,
      link: test.link,
      source: test.source,
      kind: test.kind,
      scheduledWeek: test.scheduledWeek,
      memberStatus: test.statusByMember,
    });
    weekMap.set(test.scheduledWeek, data);
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, data]) => ({ week, items: data.items, mockTests: data.mockTests, weeklyTests: data.weeklyTests }));
}

export interface WeeklyTestMemberAnalysis {
  member: Member;
  testsTaken: number;
  averagePercent: number | null;
  bestPercent: number | null;
}

export function getWeeklyTestAnalysis(state: TrackerState): WeeklyTestMemberAnalysis[] {
  return MEMBERS.map((member) => {
    const percentages = state.weeklyTests
      .map((test) => test.statusByMember[member])
      .filter(
        (status) =>
          status?.taken &&
          typeof status.score === "number" &&
          typeof status.outOf === "number" &&
          status.outOf > 0
      )
      .map((status) => ((status.score ?? 0) / (status.outOf ?? 1)) * 100);

    return {
      member,
      testsTaken: state.weeklyTests.filter((test) => test.statusByMember[member]?.taken).length,
      averagePercent:
        percentages.length > 0 ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length) : null,
      bestPercent: percentages.length > 0 ? Math.round(Math.max(...percentages)) : null,
    };
  });
}

export function getWeekDateRange(week: number): string {
  const start = new Date(2026, 3, 6); // Sunday, April 6, 2026
  const weekStart = new Date(start.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

export function deleteCustomTopic(state: TrackerState, subjectId: string, topicId: string): TrackerState {
  const existing = state.customTopics[subjectId] || [];
  const isCustom = existing.some((t) => t.id === topicId);

  const newChecklist = { ...state.checklist };
  // Remove all checklist entries for this topic across all members/sections
  for (const key of Object.keys(newChecklist)) {
    if (key.includes(`|${subjectId}|${topicId}`)) {
      delete newChecklist[key];
    }
  }

  if (isCustom) {
    return {
      ...state,
      checklist: newChecklist,
      customTopics: { ...state.customTopics, [subjectId]: existing.filter((t) => t.id !== topicId) },
    };
  }

  // Built-in topic: track as deleted
  const deletedList = state.deletedTopics?.[subjectId] || [];
  return {
    ...state,
    checklist: newChecklist,
    deletedTopics: { ...state.deletedTopics, [subjectId]: [...deletedList, topicId] },
  };
}

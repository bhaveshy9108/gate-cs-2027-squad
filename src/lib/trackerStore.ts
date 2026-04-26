import { SUBJECTS, MEMBERS, type Member, type Topic } from "./gateData";

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

export interface TrackerState {
  checklist: ChecklistData;
  customTopics: Record<string, Topic[]>;
  deletedTopics: Record<string, string[]>;
  mockTests: MockTest[];
  weeklyTests: WeeklyTest[];
  currentMember: Member;
  topicNotes: Record<string, TopicNote>; // key: `${subjectId}|${topicId}`
  topicDifficulty: Record<string, Difficulty>; // key: `${subjectId}|${topicId}`
}

export type MockTestType = "subject" | "full" | "weekly";

export interface MockTest {
  id: string;
  name: string;
  date: string;
  type: MockTestType;
  totalMarks: number;
  notes: string;
  scores: Record<Member, number | null>;
}

export type WeeklyTestSource = "GO Classes" | "GateOverflow";
export type WeeklyTestKind = "mock" | "subject" | "quiz";

export interface WeeklyTestMemberStatus {
  taken: boolean;
  takenAt?: string;
  score?: number | null;
  outOf?: number | null;
}

export interface WeeklyTest {
  id: string;
  name: string;
  source: WeeklyTestSource;
  kind: WeeklyTestKind;
  scheduledWeek: number;
  notes: string;
  statusByMember: Record<Member, WeeklyTestMemberStatus>;
}

function getKey(member: string, section: string, subjectId: string, topicId: string) {
  return `${member}|${section}|${subjectId}|${topicId}`;
}

function defaultState(): TrackerState {
  return {
    checklist: {},
    customTopics: {},
    deletedTopics: {},
    mockTests: [],
    weeklyTests: [],
    currentMember: "Bhavesh",
    topicNotes: {},
    topicDifficulty: {},
  };
}

export function createDefaultState(): TrackerState {
  return defaultState();
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
      name: record.name ?? `Mock Test ${index + 1}`,
      date: record.date ?? new Date().toISOString().split("T")[0],
      type:
        record.type === "subject" || record.type === "full" || record.type === "weekly"
          ? record.type
          : "full",
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
      name: record.name ?? `Weekly Test ${index + 1}`,
      source: record.source === "GateOverflow" ? "GateOverflow" : "GO Classes",
      kind:
        record.kind === "subject" || record.kind === "quiz" || record.kind === "mock"
          ? record.kind
          : "mock",
      scheduledWeek:
        typeof record.scheduledWeek === "number" && Number.isFinite(record.scheduledWeek)
          ? Math.max(1, Math.floor(record.scheduledWeek))
          : 1,
      notes: typeof record.notes === "string" ? record.notes : "",
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
            },
          ];
        })
      ) as Record<Member, WeeklyTestMemberStatus>,
    };
  });
}

export function normalizeTrackerState(raw: unknown): TrackerState {
  const base = defaultState();
  const parsed = typeof raw === "object" && raw !== null ? (raw as Partial<TrackerState>) : {};

  return {
    ...base,
    ...parsed,
    checklist:
      typeof parsed.checklist === "object" && parsed.checklist !== null ? parsed.checklist : base.checklist,
    customTopics:
      typeof parsed.customTopics === "object" && parsed.customTopics !== null
        ? parsed.customTopics
        : base.customTopics,
    deletedTopics:
      typeof parsed.deletedTopics === "object" && parsed.deletedTopics !== null
        ? parsed.deletedTopics
        : base.deletedTopics,
    mockTests: normalizeMockTests(parsed.mockTests),
    weeklyTests: normalizeWeeklyTests(parsed.weeklyTests),
    currentMember: MEMBERS.includes(parsed.currentMember as Member) ? (parsed.currentMember as Member) : MEMBERS[0],
    topicNotes:
      typeof parsed.topicNotes === "object" && parsed.topicNotes !== null ? parsed.topicNotes : base.topicNotes,
    topicDifficulty:
      typeof parsed.topicDifficulty === "object" && parsed.topicDifficulty !== null
        ? parsed.topicDifficulty
        : base.topicDifficulty,
  };
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

export function getAllTopics(state: TrackerState, subjectId: string): Topic[] {
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
  const topics = getAllTopics(state, subjectId);
  const done = topics.filter((t) => isCompleted(state, member, section, subjectId, t.id)).length;
  return { done, total: topics.length };
}

export function addMockTest(state: TrackerState, test: MockTest): TrackerState {
  return { ...state, mockTests: [...state.mockTests, test] };
}

export function addWeeklyTest(state: TrackerState, test: WeeklyTest): TrackerState {
  return {
    ...state,
    weeklyTests: [...state.weeklyTests, test].sort((a, b) => a.scheduledWeek - b.scheduledWeek),
  };
}

export function deleteWeeklyTest(state: TrackerState, testId: string): TrackerState {
  return {
    ...state,
    weeklyTests: state.weeklyTests.filter((test) => test.id !== testId),
  };
}

export function updateWeeklyTestTaken(
  state: TrackerState,
  testId: string,
  member: Member,
  taken: boolean
): TrackerState {
  return {
    ...state,
    weeklyTests: state.weeklyTests.map((test) =>
      test.id === testId
        ? {
            ...test,
            statusByMember: {
              ...test.statusByMember,
              [member]: taken
                ? {
                    ...test.statusByMember[member],
                    taken: true,
                    takenAt: test.statusByMember[member]?.takenAt ?? new Date().toISOString(),
                  }
                : { taken: false, score: null, outOf: null },
            },
          }
        : test
    ),
  };
}

export function updateWeeklyTestScore(
  state: TrackerState,
  testId: string,
  member: Member,
  score: number | null,
  outOf: number | null
): TrackerState {
  return {
    ...state,
    weeklyTests: state.weeklyTests.map((test) =>
      test.id === testId
        ? {
            ...test,
            statusByMember: {
              ...test.statusByMember,
              [member]: {
                ...test.statusByMember[member],
                taken: true,
                takenAt: test.statusByMember[member]?.takenAt ?? new Date().toISOString(),
                score,
                outOf,
              },
            },
          }
        : test
    ),
  };
}

export function deleteMockTest(state: TrackerState, testId: string): TrackerState {
  return { ...state, mockTests: state.mockTests.filter((t) => t.id !== testId) };
}

export function updateMockScore(
  state: TrackerState,
  testId: string,
  member: Member,
  score: number
): TrackerState {
  return {
    ...state,
    mockTests: state.mockTests.map((t) =>
      t.id === testId ? { ...t, scores: { ...t.scores, [member]: score } } : t
    ),
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

export function getWeekNumber(date: Date): number {
  const start = new Date(2026, 3, 6);
  const diff = date.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1);
}

// Week-wise progress
export interface WeekProgressMockTest {
  name: string;
  type: MockTestType;
  totalMarks: number;
  scores: Record<Member, number | null>;
}

export interface WeekProgressWeeklyTest {
  name: string;
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
    const week = getWeekNumber(new Date(test.date));
    const data = weekMap.get(week) || { items: [], mockTests: [], weeklyTests: [] };
    data.mockTests.push({
      name: test.name,
      type: test.type || "full",
      totalMarks: test.totalMarks,
      scores: test.scores,
    });
    weekMap.set(week, data);
  }

  for (const test of state.weeklyTests) {
    const data = weekMap.get(test.scheduledWeek) || { items: [], mockTests: [], weeklyTests: [] };
    data.weeklyTests.push({
      name: test.name,
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

import { SUBJECTS, type Member, type Topic } from "./gateData";

const STORAGE_KEY = "gate-cs-2027-tracker";

export interface ChecklistEntry {
  completed: boolean;
  completedAt?: string; // ISO date
  week?: number;
}

export type ChecklistData = Record<string, ChecklistEntry>;
// key: `${member}|${section}|${subjectId}|${topicId}`

export interface TrackerState {
  checklist: ChecklistData;
  customTopics: Record<string, Topic[]>; // subjectId -> extra topics
  deletedTopics: Record<string, string[]>; // subjectId -> deleted topicIds (built-in)
  mockTests: MockTest[];
  currentMember: Member;
}

export interface MockTest {
  id: string;
  name: string;
  date: string;
  totalMarks: number;
  notes: string;
  scores: Record<Member, number | null>;
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
    currentMember: "Bhavesh",
  };
}

export function loadState(): TrackerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
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

// Week-wise progress
export interface WeekProgress {
  week: number;
  items: { member: Member; section: string; subjectName: string; topicName: string; completedAt: string }[];
}

export function getWeeklyProgress(state: TrackerState): WeekProgress[] {
  const weekMap = new Map<number, WeekProgress["items"]>();

  for (const [key, entry] of Object.entries(state.checklist)) {
    if (!entry.completed || !entry.week) continue;
    const [member, section, subjectId, topicId] = key.split("|");
    const subject = SUBJECTS.find((s) => s.id === subjectId);
    const allTopics = getAllTopics(state, subjectId);
    const topic = allTopics.find((t) => t.id === topicId);

    const items = weekMap.get(entry.week) || [];
    items.push({
      member: member as Member,
      section,
      subjectName: subject?.name || subjectId,
      topicName: topic?.name || topicId,
      completedAt: entry.completedAt || "",
    });
    weekMap.set(entry.week, items);
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, items]) => ({ week, items }));
}

function getWeekNumber(date: Date): number {
  const start = new Date(2025, 3, 6); // Sunday, April 6, 2025
  const diff = date.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1);
}

export function getWeekDateRange(week: number): string {
  const start = new Date(2025, 3, 6); // Sunday, April 6, 2025
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

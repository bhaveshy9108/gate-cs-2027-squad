import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  ListTodo,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";

import { MEMBERS, type Member } from "@/lib/gateData";
import {
  addWeeklyPyqPlanItem,
  getAllTopics,
  getCoverageScopeLabel,
  getMockTestDisplayName,
  getMockTestTypeLabel,
  getSubjectProgress,
  getWeekDateRange,
  getWeekNumber,
  getWeeklyProgress,
  getWeeklyPyqPlan,
  getWeeklyTestDisplayName,
  isCompleted,
  removeWeeklyPyqPlanItem,
  toggleTopic,
  type TrackerState,
} from "@/lib/trackerStore";
import { PYQ_SUBJECTS } from "@/lib/pyqCatalog";
import { cn } from "@/lib/utils";

const memberBadge: Record<Member, string> = {
  Bhavesh: "bg-person1/15 text-person1",
};

interface Props {
  state: TrackerState;
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} | ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
}

interface WeeklyPyqPlannerProps {
  state: TrackerState;
  member: Member;
  weekNumber: number;
  onUpdate: (state: TrackerState) => void;
}

export function WeeklyPyqPlanner({ state, member, weekNumber, onUpdate }: WeeklyPyqPlannerProps) {
  const [activeSubjectId, setActiveSubjectId] = useState(PYQ_SUBJECTS[0]?.id ?? "");
  const [topicSearch, setTopicSearch] = useState("");

  const planItems = useMemo(() => getWeeklyPyqPlan(state, weekNumber), [state, weekNumber]);
  const selectedSubject = PYQ_SUBJECTS.find((subject) => subject.id === activeSubjectId) ?? PYQ_SUBJECTS[0];

  const availableTopics = useMemo(() => {
    if (!selectedSubject) return [];
    const selectedSet = new Set(planItems.map((item) => `${item.subjectId}|${item.topicId}`));
    const query = topicSearch.trim().toLowerCase();
    return getAllTopics(state, selectedSubject.id, "pyq").filter((topic) => {
      if (selectedSet.has(`${selectedSubject.id}|${topic.id}`)) return false;
      if (!query) return true;
      return topic.name.toLowerCase().includes(query);
    });
  }, [state, selectedSubject, planItems, topicSearch]);

  const groupedPlan = useMemo(() => {
    const map = new Map<string, typeof planItems>();
    for (const item of planItems) {
      const list = map.get(item.subjectId) ?? [];
      list.push(item);
      map.set(item.subjectId, list);
    }
    return map;
  }, [planItems]);

  const doneCount = planItems.filter((item) => isCompleted(state, member, "pyq", item.subjectId, item.topicId)).length;
  const currentSubjectProgress = selectedSubject ? getSubjectProgress(state, member, "pyq", selectedSubject.id) : { done: 0, total: 0 };

  const addTopic = (subjectId: string, topicId: string, topicName: string, count?: number) => {
    onUpdate((next) =>
      addWeeklyPyqPlanItem(next, weekNumber, {
        subjectId,
        topicId,
        topicName,
        count,
        addedAt: new Date().toISOString(),
      })
    );
  };

  const removeTopic = (subjectId: string, topicId: string) => {
    onUpdate((next) => removeWeeklyPyqPlanItem(next, weekNumber, subjectId, topicId));
  };

  const toggleDone = (subjectId: string, topicId: string) => {
    onUpdate((next) => toggleTopic(next, member, "pyq", subjectId, topicId));
  };

  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-card/95 p-5 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.28)]">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">This week</p>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">PYQ to-do list</h3>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Planned</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{planItems.length}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Done</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{doneCount}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Subject</label>
          <div className="relative mt-2">
            <select
              value={activeSubjectId}
              onChange={(event) => setActiveSubjectId(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-border/70 bg-card px-4 py-3 pr-11 text-sm font-medium text-foreground shadow-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            >
              {PYQ_SUBJECTS.map((subject) => {
                const progress = getSubjectProgress(state, member, "pyq", subject.id);
                return (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({progress.done}/{progress.total})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Selection</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{selectedSubject?.name ?? "Pick a subject"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{selectedSubject?.name ?? "Pick a subject"}</p>
            <p className="text-xs text-muted-foreground">
              {currentSubjectProgress.done}/{currentSubjectProgress.total} topics completed
            </p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {groupedPlan.get(selectedSubject?.id ?? "")?.length ?? 0} selected
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={topicSearch}
            onChange={(event) => setTopicSearch(event.target.value)}
            placeholder="Search topics"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {selectedSubject && availableTopics.length > 0 ? (
            availableTopics.slice(0, 10).map((topic) => (
              <button
                key={topic.id}
                onClick={() => addTopic(selectedSubject.id, topic.id, topic.name, topic.count)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-3 py-2 text-left text-sm text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
              >
                <span className="min-w-0 truncate">{topic.name}</span>
                <Plus className="h-4 w-4 flex-shrink-0 text-primary" />
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 px-3 py-5 text-center text-sm text-muted-foreground">
              No more topics to add for this subject.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {Array.from(groupedPlan.entries()).length > 0 ? (
          Array.from(groupedPlan.entries()).map(([subjectId, items]) => {
            const subject = PYQ_SUBJECTS.find((entry) => entry.id === subjectId);
            return (
              <div key={subjectId} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{subject?.name ?? subjectId}</p>
                    <p className="text-xs text-muted-foreground">{items.length} planned</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {items
                    .slice()
                    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
                    .map((item) => {
                      const complete = isCompleted(state, member, "pyq", item.subjectId, item.topicId);
                      return (
                        <div
                          key={`${item.subjectId}|${item.topicId}`}
                          className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-2"
                        >
                          <button
                            onClick={() => toggleDone(item.subjectId, item.topicId)}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
                              complete ? "border-primary/30 bg-primary text-primary-foreground" : "border-border/70 bg-background text-muted-foreground"
                            )}
                            aria-label={`Mark ${item.topicName} as done`}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={cn("truncate text-sm font-medium", complete ? "text-foreground line-through decoration-primary/70" : "text-foreground")}>
                              {item.topicName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{item.count ?? 0} PYQs</p>
                          </div>
                          <button
                            onClick={() => removeTopic(item.subjectId, item.topicId)}
                            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={`Remove ${item.topicName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
            Add PYQ topics here to build this week&apos;s plan.
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeeklyProgress({ state }: Props) {
  const weeks = [...getWeeklyProgress(state)].sort((a, b) => b.week - a.week);
  const currentWeekLabel = getWeekDateRange(getWeekNumber(new Date()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Week-wise Progress</h2>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Current week: {currentWeekLabel}. Checklist work, mock tests, and taken weekly tests all appear here.
      </p>

      {weeks.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No progress recorded yet. Start checking off topics or marking tests as taken to see weekly activity.
        </div>
      )}

      {weeks.map((wp) => {
        const sortedMockTests = [...wp.mockTests].sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return b.id.localeCompare(a.id);
        });
        const sortedWeeklyTests = [...wp.weeklyTests].sort((a, b) => b.id.localeCompare(a.id));

        const subjectGroups = wp.items.reduce((map, item) => {
          const list = map.get(item.subjectName) ?? [];
          list.push(item);
          map.set(item.subjectName, list);
          return map;
        }, new Map<string, typeof wp.items>());

        const memberCounts = MEMBERS.map((member) => ({
          member,
          count: wp.items.filter((item) => item.member === member).length,
        }))
          .filter((entry) => entry.count > 0)
          .sort((a, b) => b.count - a.count);

        return (
          <div key={wp.week} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-muted/30 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Week {wp.week}</h3>
                  <p className="text-xs text-muted-foreground">
                    {getWeekDateRange(wp.week)} | {wp.items.length} topics completed
                    {wp.mockTests.length > 0 && ` | ${wp.mockTests.length} mock test${wp.mockTests.length > 1 ? "s" : ""}`}
                    {wp.weeklyTests.length > 0 && ` | ${wp.weeklyTests.length} weekly test${wp.weeklyTests.length > 1 ? "s" : ""} scheduled`}
                  </p>
                </div>

                {memberCounts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {memberCounts.map((entry, idx) => (
                      <span
                        key={entry.member}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                          memberBadge[entry.member]
                        )}
                      >
                        {idx === 0 && <Trophy className="h-3 w-3" />}
                        {entry.member}: {entry.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 p-4">
              {Array.from(subjectGroups.entries()).map(([subjectName, items]) => {
                const latest = items[0];
                const completedCount = items.length;
                return (
                  <div key={subjectName} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <p className="min-w-0 truncate text-sm font-semibold text-foreground">{subjectName}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {completedCount} topic{completedCount > 1 ? "s" : ""} completed
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {items.length}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {items
                        .slice()
                        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                        .map((item) => (
                          <div
                            key={`${item.member}-${item.subjectName}-${item.topicName}-${item.completedAt}`}
                            className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {item.topicName}
                                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                  {item.section}
                                </span>
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.member} • {formatTimestamp(item.completedAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}

              {sortedMockTests.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Mock Tests This Week</span>
                  </div>
                  <div className="space-y-2">
                    {sortedMockTests.map((test, idx) => {
                      const scoredMembers = MEMBERS.filter((member) => test.scores[member] !== null);
                      const best =
                        scoredMembers.length > 0
                          ? scoredMembers.reduce((a, b) => ((test.scores[a] ?? 0) >= (test.scores[b] ?? 0) ? a : b))
                          : null;

                      return (
                        <div key={idx} className="rounded-2xl border border-border/70 bg-muted/30 px-3 py-2">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{getMockTestDisplayName(test)}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
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
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                                {test.source}
                              </span>
                            )}
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                              {getCoverageScopeLabel(test.coverageScope ?? "full")}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {MEMBERS.map((member) => {
                              const score = test.scores[member];
                              const isBest = best === member && scoredMembers.length > 1;
                              return (
                                <span
                                  key={member}
                                  className={cn(
                                    "rounded-md px-2 py-0.5 text-[11px] font-medium",
                                    memberBadge[member],
                                    isBest && "ring-1 ring-yellow-400"
                                  )}
                                >
                                  {isBest && <Trophy className="mr-0.5 inline h-3 w-3 text-yellow-500" />}
                                  {member}: {score !== null ? `${score}/${test.totalMarks}` : "-"}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {sortedWeeklyTests.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center gap-1.5">
                    <ListTodo className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Weekly Tests This Week</span>
                  </div>
                  <div className="space-y-2">
                    {sortedWeeklyTests.map((test, idx) => (
                      <div key={idx} className="rounded-2xl border border-border/70 bg-muted/30 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{getWeeklyTestDisplayName(test)}</span>
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">{test.source}</span>
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                            {getCoverageScopeLabel(test.coverageScope ?? "full")}
                          </span>
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-accent text-accent-foreground">
                            {test.kind === "mock" ? "Mock" : test.kind === "subject" ? "Subject" : "Quiz"}
                          </span>
                          {test.link && (
                            <a
                              href={test.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            >
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          {MEMBERS.map((member) => {
                            const status = test.memberStatus[member];
                            const percent =
                              status.taken &&
                              typeof status.score === "number" &&
                              typeof status.outOf === "number" &&
                              status.outOf > 0
                                ? Math.round((status.score / status.outOf) * 100)
                                : null;

                            return (
                              <span
                                key={`${test.name}-${member}`}
                                className={cn("rounded-md px-2 py-1 text-[11px] font-medium", memberBadge[member])}
                              >
                                {member}:{" "}
                                {status.taken
                                  ? `${status.score ?? "-"} / ${status.outOf ?? "-"}${percent !== null ? ` (${percent}%)` : ""}`
                                  : "Pending"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

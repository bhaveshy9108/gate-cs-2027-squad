import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Check, ChevronDown, Plus, Search, Trash2, Target } from "lucide-react";

import { type Member } from "@/lib/gateData";
import {
  addWeeklyPyqPlanItem,
  getAllTopics,
  getSubjectProgress,
  getWeeklyPyqPlan,
  isCompleted,
  removeWeeklyPyqPlanItem,
  toggleTopic,
  type TrackerState,
} from "@/lib/trackerStore";
import { PYQ_SUBJECTS } from "@/lib/pyqCatalog";
import { cn } from "@/lib/utils";

interface Props {
  state: TrackerState;
  member: Member;
  weekNumber: number;
  onUpdate: Dispatch<SetStateAction<TrackerState>>;
}

export default function WeeklyPyqPlanner({ state, member, weekNumber, onUpdate }: Props) {
  const [activeSubjectId, setActiveSubjectId] = useState("");
  const [topicSearch, setTopicSearch] = useState("");

  const planItems = useMemo(() => getWeeklyPyqPlan(state, weekNumber), [state, weekNumber]);
  const selectedSubject = activeSubjectId ? PYQ_SUBJECTS.find((subject) => subject.id === activeSubjectId) ?? null : null;

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

      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Selected topics</p>
              <p className="mt-1 text-sm text-muted-foreground">What you have already lined up for this week.</p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{planItems.length}</div>
          </div>

          <div className="mt-3 space-y-3">
            {Array.from(groupedPlan.entries()).length > 0 ? (
              Array.from(groupedPlan.entries()).map(([subjectId, items]) => {
                const subject = PYQ_SUBJECTS.find((entry) => entry.id === subjectId);
                return (
                  <div key={subjectId} className="rounded-2xl border border-border/70 bg-card/80 p-3">
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
                              className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2"
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
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
                Add PYQ topics here to build this week&apos;s plan.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Choose subject</p>
              <p className="mt-1 text-sm text-muted-foreground">Select one subject to see only its topic list.</p>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Subject</label>
            <div className="relative mt-2">
              <select
                value={activeSubjectId}
                onChange={(event) => {
                  setActiveSubjectId(event.target.value);
                  setTopicSearch("");
                }}
                className="w-full appearance-none rounded-2xl border border-border/70 bg-card px-4 py-3 pr-11 text-sm font-medium text-foreground shadow-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Pick a subject</option>
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

          {!selectedSubject ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border/70 px-3 py-5 text-center text-sm text-muted-foreground">
              Choose a subject first to load its topic list.
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{selectedSubject.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentSubjectProgress.done}/{currentSubjectProgress.total} topics completed
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {groupedPlan.get(selectedSubject.id)?.length ?? 0} selected
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
                {availableTopics.length > 0 ? (
                  availableTopics.slice(0, 10).map((topic) => {
                    const topicCount = (topic as { count?: number }).count;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => addTopic(selectedSubject.id, topic.id, topic.name, topicCount)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-3 py-2 text-left text-sm text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                      >
                        <span className="min-w-0 truncate">{topic.name}</span>
                        <Plus className="h-4 w-4 flex-shrink-0 text-primary" />
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 px-3 py-5 text-center text-sm text-muted-foreground">
                    No more topics to add for this subject.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

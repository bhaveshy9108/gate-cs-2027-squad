import { useEffect, useMemo, useState } from "react";
import { BookMarked, Check, ChevronDown, ChevronRight, FileText, Plus } from "lucide-react";
import { type Member } from "@/lib/gateData";
import {
  addWeeklyPyqPlanItem,
  getSubjectProgress,
  getWeekNumber,
  getWeeklyPyqPlan,
  isCompleted,
  toggleTopic,
  type TrackerState,
} from "@/lib/trackerStore";
import { PYQ_SUBJECTS } from "@/lib/pyqCatalog";
import { cn } from "@/lib/utils";

interface Props {
  state: TrackerState;
  member: Member;
  onUpdate: (s: TrackerState) => void;
  focusSubjectId?: string | null;
  focusTopicId?: string | null;
}

const SECTION = "pyq";

export default function PYQSection({ state, member, onUpdate, focusSubjectId, focusTopicId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(PYQ_SUBJECTS[0]?.id ?? null);
  const currentWeek = getWeekNumber(new Date());
  const weekPlan = useMemo(() => getWeeklyPyqPlan(state, currentWeek), [state, currentWeek]);
  const plannedKeys = useMemo(() => new Set(weekPlan.map((item) => `${item.subjectId}|${item.topicId}`)), [weekPlan]);

  useEffect(() => {
    if (focusSubjectId) {
      setExpanded(focusSubjectId);
    }
  }, [focusSubjectId]);

  const summary = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const subject of PYQ_SUBJECTS) {
      const progress = getSubjectProgress(state, member, SECTION, subject.id);
      done += progress.done;
      total += progress.total;
    }
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [state, member]);

  const addToPlan = (subjectId: string, topicId: string, topicName: string, count?: number) => {
    onUpdate((next) =>
      addWeeklyPyqPlanItem(next, currentWeek, {
        subjectId,
        topicId,
        topicName,
        count,
        addedAt: new Date().toISOString(),
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookMarked className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">PYQs</h2>
        <span className="text-xs text-muted-foreground">for {member}</span>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Book-based Topic Layout</p>
            <p className="text-sm text-muted-foreground">
              Built from your uploaded PYQ books, so the section now follows the actual subject and topic buckets instead
              of the generic study checklist.
            </p>
          </div>
          <div className="rounded-xl bg-primary/5 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your PYQ progress</p>
            <p className="text-2xl font-bold text-primary">{summary.pct}%</p>
            <p className="text-xs text-muted-foreground">
              {summary.done}/{summary.total} topic buckets done
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-sm font-semibold text-foreground">Volume 1</p>
            <p className="text-xs text-muted-foreground mt-1">
              Discrete Mathematics, Engineering Mathematics, and General Aptitude topic groups.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-sm font-semibold text-foreground">Volume 2</p>
            <p className="text-xs text-muted-foreground mt-1">
              Core CS subjects like Algorithms, OS, DBMS, CN, COA, Digital Logic, Compiler, TOC, and C.
            </p>
          </div>
        </div>
      </div>

      {PYQ_SUBJECTS.map((subject) => {
        const progress = getSubjectProgress(state, member, SECTION, subject.id);
        const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
        const isOpen = expanded === subject.id;

        return (
          <div key={subject.id} className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : subject.id)}
              className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-muted-foreground">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{subject.name}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {subject.volume}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {subject.topics.length} topic buckets
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mark each topic bucket when you finish the PYQs from the book for that cluster.
                    </p>
                  </div>
                </div>

                <div className="min-w-[180px] space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {progress.done}/{progress.total} done
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border px-4 py-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {subject.topics.map((topic) => {
                    const checked = isCompleted(state, member, SECTION, subject.id, topic.id);
                    const isFocused = focusSubjectId === subject.id && focusTopicId === topic.id;
                    const planned = plannedKeys.has(`${subject.id}|${topic.id}`);
                    return (
                      <label
                        key={topic.id}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer transition-colors",
                          checked
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-background hover:bg-muted/30",
                          isFocused && "ring-2 ring-primary/25 bg-primary/5"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onUpdate(toggleTopic(state, member, SECTION, subject.id, topic.id))}
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-medium",
                                checked ? "text-muted-foreground line-through" : "text-foreground"
                              )}
                            >
                              {topic.name}
                            </span>
                            {typeof topic.count === "number" && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                ~{topic.count} PYQs
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                addToPlan(subject.id, topic.id, topic.name, topic.count);
                              }}
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition-all",
                                planned
                                  ? "border-primary/30 bg-primary text-primary-foreground"
                                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
                              )}
                              aria-label={planned ? `Already in todo list: ${topic.name}` : `Add ${topic.name} to todo list`}
                              title={planned ? "Already in this week's todo list" : "Add to this week's todo list"}
                            >
                              {planned ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            <span>{checked ? "Completed for this member" : "Pending in the PYQ book"}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

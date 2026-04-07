import { SUBJECTS, type Member } from "@/lib/gateData";
import { type TrackerState, toggleTopic, isCompleted, getAllTopics, getSubjectProgress } from "@/lib/trackerStore";
import { cn } from "@/lib/utils";
import { BookMarked, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  state: TrackerState;
  member: Member;
  onUpdate: (s: TrackerState) => void;
}

const SECTION = "pyq";

export default function PYQSection({ state, member, onUpdate }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleToggle = (subjectId: string, topicId: string) => {
    onUpdate(toggleTopic(state, member, SECTION, subjectId, topicId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <BookMarked className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">PYQs — Topic Wise</h2>
        <span className="text-xs text-muted-foreground ml-1">— {member}</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-sm text-muted-foreground">
          📚 <span className="font-semibold text-foreground">Reference Book:</span>{" "}
          GATE Overflow — Previous Years Questions (All Past Years, Topic-wise)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Go through each topic's PYQs from GateOverflow. Mark them done as you solve topic-wise questions.
        </p>
      </div>

      {SUBJECTS.map((subject) => {
        const topics = getAllTopics(state, subject.id);
        const { done, total } = getSubjectProgress(state, member, SECTION, subject.id);
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const isOpen = expanded === subject.id;

        return (
          <div key={subject.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : subject.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className="font-semibold text-foreground">{subject.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{done}/{total}</span>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-10 text-right">{pct}%</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-1">
                {topics.map((topic) => {
                  const checked = isCompleted(state, member, SECTION, subject.id, topic.id);
                  return (
                    <label
                      key={topic.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                        checked ? "bg-accent/10" : "hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggle(subject.id, topic.id)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className={cn("text-sm", checked ? "line-through text-muted-foreground" : "text-foreground")}>
                        {topic.name} — PYQs
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

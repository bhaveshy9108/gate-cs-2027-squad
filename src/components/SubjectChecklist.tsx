import { useState } from "react";
import { SUBJECTS, type Member } from "@/lib/gateData";
import {
  type TrackerState,
  toggleTopic,
  isCompleted,
  getAllTopics,
  getSubjectProgress,
  addCustomTopic,
} from "@/lib/trackerStore";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, BookOpen } from "lucide-react";

interface Props {
  section: string;
  sectionLabel: string;
  state: TrackerState;
  member: Member;
  onUpdate: (s: TrackerState) => void;
}

export default function SubjectChecklist({ section, sectionLabel, state, member, onUpdate }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingTopic, setAddingTopic] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");

  const handleToggle = (subjectId: string, topicId: string) => {
    onUpdate(toggleTopic(state, member, section, subjectId, topicId));
  };

  const handleAddTopic = (subjectId: string) => {
    if (!newTopicName.trim()) return;
    onUpdate(addCustomTopic(state, subjectId, newTopicName.trim()));
    setNewTopicName("");
    setAddingTopic(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{sectionLabel}</h2>
        <span className="text-xs text-muted-foreground ml-1">— {member}</span>
      </div>

      {SUBJECTS.map((subject) => {
        const topics = getAllTopics(state, subject.id);
        const { done, total } = getSubjectProgress(state, member, section, subject.id);
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const isOpen = expanded === subject.id;

        return (
          <div key={subject.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : subject.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-semibold text-foreground">{subject.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {done}/{total}
                </span>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-10 text-right">{pct}%</span>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-1">
                {topics.map((topic) => {
                  const checked = isCompleted(state, member, section, subject.id, topic.id);
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
                      <span
                        className={cn(
                          "text-sm",
                          checked ? "line-through text-muted-foreground" : "text-foreground"
                        )}
                      >
                        {topic.name}
                      </span>
                      {topic.isCustom && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          Custom
                        </span>
                      )}
                    </label>
                  );
                })}

                {addingTopic === subject.id ? (
                  <div className="flex gap-2 mt-2 pl-3">
                    <input
                      autoFocus
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTopic(subject.id)}
                      placeholder="Topic name..."
                      className="flex-1 px-3 py-1.5 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleAddTopic(subject.id)}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingTopic(null); setNewTopicName(""); }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTopic(subject.id)}
                    className="flex items-center gap-2 mt-2 pl-3 text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Topic
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { SUBJECTS, type Member } from "@/lib/gateData";
import {
  type TrackerState,
  type TopicNote,
  toggleTopic,
  isCompleted,
  getAllTopics,
  getSubjectProgress,
  addCustomTopic,
  deleteCustomTopic,
  getTopicNote,
  setTopicNote,
  getTopicDifficulty,
  cycleDifficulty,
} from "@/lib/trackerStore";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, BookOpen, Trash2, StickyNote } from "lucide-react";
import TopicNotesDialog from "./TopicNotesDialog";

const DIFFICULTY_LABELS: Record<string, { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-accent/20 text-accent-foreground border-accent/30" },
  medium: { label: "Med", className: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:text-yellow-400" },
  hard: { label: "Hard", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

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
  const [notesOpen, setNotesOpen] = useState<{ subjectId: string; topicId: string; topicName: string } | null>(null);
  const [diffFilter, setDiffFilter] = useState<string | null>(null);

  const handleToggle = (subjectId: string, topicId: string) => {
    onUpdate(toggleTopic(state, member, section, subjectId, topicId));
  };

  const handleAddTopic = (subjectId: string) => {
    if (!newTopicName.trim()) return;
    onUpdate(addCustomTopic(state, subjectId, newTopicName.trim()));
    setNewTopicName("");
    setAddingTopic(null);
  };

  const handleDeleteTopic = (subjectId: string, topicId: string) => {
    onUpdate(deleteCustomTopic(state, subjectId, topicId));
  };

  const handleSaveNote = (subjectId: string, topicId: string, note: TopicNote) => {
    onUpdate(setTopicNote(state, subjectId, topicId, note));
  };

  const handleCycleDifficulty = (subjectId: string, topicId: string) => {
    onUpdate(cycleDifficulty(state, subjectId, topicId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{sectionLabel}</h2>
        <span className="text-xs text-muted-foreground ml-1">— {member}</span>
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setDiffFilter(null)}
          className={cn("px-3 py-1 text-xs rounded-full border transition-colors",
            !diffFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"
          )}
        >All</button>
        {Object.entries(DIFFICULTY_LABELS).map(([key, { label, className }]) => (
          <button
            key={key}
            onClick={() => setDiffFilter(diffFilter === key ? null : key)}
            className={cn("px-3 py-1 text-xs rounded-full border transition-colors",
              diffFilter === key ? className + " font-bold" : "bg-card text-muted-foreground border-border hover:border-primary"
            )}
          >{label}</button>
        ))}
      </div>

      {SUBJECTS.map((subject) => {
        const allTopics = getAllTopics(state, subject.id);
        const topics = diffFilter
          ? allTopics.filter((t) => getTopicDifficulty(state, subject.id, t.id) === diffFilter)
          : allTopics;
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
                  const checked = isCompleted(state, member, section, subject.id, topic.id);
                  const diff = getTopicDifficulty(state, subject.id, topic.id);
                  const note = getTopicNote(state, subject.id, topic.id);
                  const hasNotes = note.text || note.links.length > 0;

                  return (
                    <div
                      key={topic.id}
                      className={cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group", checked ? "bg-accent/10" : "hover:bg-muted/50")}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggle(subject.id, topic.id)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary flex-shrink-0"
                        />
                        <span className={cn("text-sm truncate", checked ? "line-through text-muted-foreground" : "text-foreground")}>
                          {topic.name}
                        </span>
                        {topic.isCustom && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium flex-shrink-0">Custom</span>
                        )}
                      </label>

                      {/* Difficulty badge */}
                      <button
                        onClick={() => handleCycleDifficulty(subject.id, topic.id)}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 transition-colors",
                          diff ? DIFFICULTY_LABELS[diff].className : "bg-muted text-muted-foreground border-border hover:border-primary"
                        )}
                        title="Click to set difficulty"
                      >
                        {diff ? DIFFICULTY_LABELS[diff].label : "Tag"}
                      </button>

                      {/* Notes icon */}
                      <button
                        onClick={() => setNotesOpen({ subjectId: subject.id, topicId: topic.id, topicName: topic.name })}
                        className={cn(
                          "flex-shrink-0 transition-opacity",
                          hasNotes ? "text-primary" : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"
                        )}
                        title="Notes & Resources"
                      >
                        <StickyNote className="w-3.5 h-3.5" />
                        {hasNotes && note.links.length > 0 && (
                          <span className="absolute -mt-3 ml-2 text-[8px] bg-primary text-primary-foreground rounded-full w-3 h-3 flex items-center justify-center">
                            {note.links.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteTopic(subject.id, topic.id)}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity flex-shrink-0"
                        title="Delete topic"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                    <button onClick={() => handleAddTopic(subject.id)} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">Add</button>
                    <button onClick={() => { setAddingTopic(null); setNewTopicName(""); }} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
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

      {notesOpen && (
        <TopicNotesDialog
          subjectId={notesOpen.subjectId}
          topicId={notesOpen.topicId}
          topicName={notesOpen.topicName}
          note={getTopicNote(state, notesOpen.subjectId, notesOpen.topicId)}
          onSave={(note) => handleSaveNote(notesOpen.subjectId, notesOpen.topicId, note)}
          onClose={() => setNotesOpen(null)}
        />
      )}
    </div>
  );
}

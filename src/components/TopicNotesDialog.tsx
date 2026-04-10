import { useState } from "react";
import { X, Plus, ExternalLink, Trash2 } from "lucide-react";

interface TopicNote {
  text: string;
  links: string[];
}

interface Props {
  subjectId: string;
  topicId: string;
  topicName: string;
  note: TopicNote;
  onSave: (note: TopicNote) => void;
  onClose: () => void;
}

export default function TopicNotesDialog({ topicName, note, onSave, onClose }: Props) {
  const [text, setText] = useState(note.text);
  const [links, setLinks] = useState<string[]>(note.links);
  const [newLink, setNewLink] = useState("");

  const handleAddLink = () => {
    const url = newLink.trim();
    if (!url) return;
    setLinks((prev) => [...prev, url]);
    setNewLink("");
  };

  const handleRemoveLink = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({ text: text.trim(), links });
    onClose();
  };

  const getLinkIcon = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "🎥";
    if (url.endsWith(".pdf")) return "📄";
    return "🔗";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md mx-4 p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm">Notes — {topicName}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add notes, tips, formulas..."
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none h-24 text-foreground"
        />

        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Resources / Links</p>
          {links.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-1.5 group">
              <span className="text-sm">{getLinkIcon(link)}</span>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs text-primary hover:underline truncate"
              >
                {link}
              </a>
              <button onClick={() => handleRemoveLink(idx)} className="opacity-0 group-hover:opacity-100 text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
              placeholder="https://..."
              className="flex-1 px-3 py-1.5 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
            <button onClick={handleAddLink} className="text-primary hover:text-primary/80">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

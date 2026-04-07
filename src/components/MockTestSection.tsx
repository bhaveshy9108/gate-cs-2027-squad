import { useState } from "react";
import { MEMBERS, type Member } from "@/lib/gateData";
import { type TrackerState, addMockTest, updateMockScore, type MockTest } from "@/lib/trackerStore";
import { ClipboardList, Plus } from "lucide-react";

interface Props {
  state: TrackerState;
  member: Member;
  onUpdate: (s: TrackerState) => void;
}

export default function MockTestSection({ state, onUpdate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [testName, setTestName] = useState("");
  const [editingScore, setEditingScore] = useState<{ testId: string; member: Member } | null>(null);
  const [scoreInput, setScoreInput] = useState("");

  const handleAddTest = () => {
    if (!testName.trim()) return;
    const test: MockTest = {
      id: `mock-${Date.now()}`,
      name: testName.trim(),
      date: new Date().toISOString().split("T")[0],
      scores: { Bhavesh: null, Avani: null, Akshita: null },
    };
    onUpdate(addMockTest(state, test));
    setTestName("");
    setShowAdd(false);
  };

  const handleScoreSubmit = (testId: string, member: Member) => {
    const score = parseFloat(scoreInput);
    if (isNaN(score)) return;
    onUpdate(updateMockScore(state, testId, member, score));
    setEditingScore(null);
    setScoreInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Mock Tests</h2>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Test
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 flex gap-2">
          <input
            autoFocus
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTest()}
            placeholder="Test name (e.g., Mock Test 1 - Made Easy)"
            className="flex-1 px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={handleAddTest} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium">
            Add
          </button>
          <button onClick={() => setShowAdd(false)} className="px-3 py-2 text-sm text-muted-foreground">
            Cancel
          </button>
        </div>
      )}

      {state.mockTests.length === 0 && !showAdd && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No mock tests added yet. Click "Add Test" to get started.
        </div>
      )}

      {state.mockTests.map((test) => (
        <div key={test.id} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">{test.name}</h3>
            <span className="text-xs text-muted-foreground">{test.date}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {MEMBERS.map((m) => {
              const score = test.scores[m];
              const isEditing = editingScore?.testId === test.id && editingScore.member === m;
              const colors = m === "Bhavesh" ? "border-person1" : m === "Avani" ? "border-person2" : "border-person3";

              return (
                <div key={m} className={`border-2 ${colors} rounded-lg p-3 text-center`}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{m}</p>
                  {isEditing ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleScoreSubmit(test.id, m)}
                        placeholder="Score"
                        className="w-full px-2 py-1 text-sm text-center bg-muted rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingScore({ testId: test.id, member: m }); setScoreInput(score !== null ? String(score) : ""); }}
                      className="text-lg font-bold text-foreground hover:text-primary transition-colors"
                    >
                      {score !== null ? score : "—"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

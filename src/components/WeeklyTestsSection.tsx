import { useMemo, useState } from "react";
import { MEMBERS, type Member } from "@/lib/gateData";
import {
  addWeeklyTest,
  deleteWeeklyTest,
  getWeekNumber,
  type TrackerState,
  type WeeklyTest,
  type WeeklyTestKind,
  type WeeklyTestSource,
  updateWeeklyTestTaken,
} from "@/lib/trackerStore";
import { CalendarCheck2, Check, Plus, Trash2 } from "lucide-react";

interface Props {
  state: TrackerState;
  onUpdate: (state: TrackerState) => void;
}

const sources: WeeklyTestSource[] = ["GO Classes", "GateOverflow"];
const kinds: WeeklyTestKind[] = ["mock", "subject", "quiz"];

const memberBorder: Record<Member, string> = {
  Bhavesh: "border-person1 text-person1",
  Aryan: "border-amber-500 text-amber-600",
};

export default function WeeklyTestsSection({ state, onUpdate }: Props) {
  const currentWeek = getWeekNumber(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState<WeeklyTestSource>("GO Classes");
  const [kind, setKind] = useState<WeeklyTestKind>("mock");
  const [scheduledWeek, setScheduledWeek] = useState(String(currentWeek));
  const [notes, setNotes] = useState("");

  const sortedTests = useMemo(
    () => [...state.weeklyTests].sort((a, b) => a.scheduledWeek - b.scheduledWeek || a.name.localeCompare(b.name)),
    [state.weeklyTests]
  );

  const groupedTests = sortedTests.reduce<Record<string, WeeklyTest[]>>((acc, test) => {
    const key = test.scheduledWeek === currentWeek ? `Week ${test.scheduledWeek} (Current)` : `Week ${test.scheduledWeek}`;
    acc[key] = acc[key] || [];
    acc[key].push(test);
    return acc;
  }, {});

  const handleAdd = () => {
    if (!name.trim()) return;

    const test: WeeklyTest = {
      id: `weekly-test-${Date.now()}`,
      name: name.trim(),
      source,
      kind,
      scheduledWeek: Math.max(1, parseInt(scheduledWeek, 10) || currentWeek),
      notes: notes.trim(),
      statusByMember: Object.fromEntries(MEMBERS.map((member) => [member, { taken: false }])) as WeeklyTest["statusByMember"],
    };

    onUpdate(addWeeklyTest(state, test));
    setName("");
    setSource("GO Classes");
    setKind("mock");
    setScheduledWeek(String(currentWeek));
    setNotes("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Weekly Tests</h2>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Weekly Test
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Track which GO Classes and GateOverflow tests should be taken this week, and mark who has completed them.
      </p>

      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test name"
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as WeeklyTestSource)}
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {sources.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as WeeklyTestKind)}
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {kinds.map((value) => (
                <option key={value} value={value}>
                  {value === "mock" ? "Mock Test" : value === "subject" ? "Subject Test" : "Quiz"}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={scheduledWeek}
              onChange={(e) => setScheduledWeek(e.target.value)}
              placeholder="Week number"
              className="px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes or syllabus coverage"
            rows={2}
            className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium">
              Add
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setName("");
                setSource("GO Classes");
                setKind("mock");
                setScheduledWeek(String(currentWeek));
                setNotes("");
              }}
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sortedTests.length === 0 && !showAdd && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No weekly tests planned yet. Add this week's tests to start tracking them.
        </div>
      )}

      {Object.entries(groupedTests).map(([label, tests]) => (
        <div key={label} className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          {tests.map((test) => (
            <div key={test.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-foreground">{test.name}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                      {test.source}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent text-accent-foreground">
                      {test.kind === "mock" ? "Mock" : test.kind === "subject" ? "Subject" : "Quiz"}
                    </span>
                  </div>
                  {test.notes && <p className="text-xs text-muted-foreground mt-1">{test.notes}</p>}
                </div>
                <button
                  onClick={() => onUpdate(deleteWeeklyTest(state, test.id))}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                  title="Delete weekly test"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {MEMBERS.map((member) => {
                  const status = test.statusByMember[member];
                  return (
                    <button
                      key={member}
                      onClick={() => onUpdate(updateWeeklyTestTaken(state, test.id, member, !status.taken))}
                      className={`border-2 rounded-lg p-3 text-left transition-colors ${memberBorder[member]} ${status.taken ? "bg-muted/50" : "bg-background hover:bg-muted/30"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{member}</span>
                        {status.taken && <Check className="w-4 h-4" />}
                      </div>
                      <p className="text-xs mt-1">
                        {status.taken && status.takenAt
                          ? `Taken on ${new Date(status.takenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                          : "Not taken yet"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

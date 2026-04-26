import { SUBJECTS, MEMBERS, type Member } from "@/lib/gateData";
import { type TrackerState, getSubjectProgress, getDifficultyStats } from "@/lib/trackerStore";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const memberColor: Record<Member, string> = {
  Bhavesh: "bg-person1",
  Aryan: "bg-amber-500",
};

const SECTIONS = [
  { key: "study", label: "Study" },
  { key: "revision", label: "Revision" },
  { key: "pyq", label: "PYQs" },
];

interface Props {
  state: TrackerState;
}

export default function OverallDashboard({ state }: Props) {
  const diffStats = getDifficultyStats(state);
  const totalTagged = diffStats.easy + diffStats.medium + diffStats.hard;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Overall Progress</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {MEMBERS.map((m) => {
          let totalDone = 0, totalAll = 0;
          SECTIONS.forEach((sec) => {
            SUBJECTS.forEach((sub) => {
              const p = getSubjectProgress(state, m, sec.key, sub.id);
              totalDone += p.done;
              totalAll += p.total;
            });
          });
          const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
          return (
            <div key={m} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-foreground">{m}</p>
              <p className="text-3xl font-bold text-primary mt-1">{pct}%</p>
              <p className="text-xs text-muted-foreground">{totalDone}/{totalAll} tasks</p>
            </div>
          );
        })}
      </div>

      {/* Difficulty distribution */}
      {totalTagged > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground mb-2">Difficulty Distribution</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-xs text-muted-foreground">Easy: {diffStats.easy}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-muted-foreground">Medium: {diffStats.medium}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-xs text-muted-foreground">Hard: {diffStats.hard}</span>
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2 flex">
            <div className="h-full bg-accent" style={{ width: `${(diffStats.easy / totalTagged) * 100}%` }} />
            <div className="h-full bg-yellow-500" style={{ width: `${(diffStats.medium / totalTagged) * 100}%` }} />
            <div className="h-full bg-destructive" style={{ width: `${(diffStats.hard / totalTagged) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Subject</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">Weightage</th>
              {MEMBERS.map((m) => (
                <th key={m} className="text-center py-2 px-2 text-muted-foreground font-medium" colSpan={3}>
                  {m}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border">
              <th />
              <th />
              {MEMBERS.map((m) =>
                SECTIONS.map((s) => (
                  <th key={`${m}-${s.key}`} className="text-center py-1 px-1 text-[10px] text-muted-foreground">
                    {s.label}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {SUBJECTS.map((sub) => (
              <tr key={sub.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-3 font-medium text-foreground text-xs">{sub.name}</td>
                <td className="text-center py-2 px-2">
                  <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    ~{sub.weightage}m
                  </span>
                </td>
                {MEMBERS.map((m) =>
                  SECTIONS.map((sec) => {
                    const p = getSubjectProgress(state, m, sec.key, sub.id);
                    const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                    return (
                      <td key={`${m}-${sec.key}`} className="text-center py-2 px-1">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", memberColor[m])} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

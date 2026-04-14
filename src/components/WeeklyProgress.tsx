import { MEMBERS, type Member } from "@/lib/gateData";
import { type TrackerState, getWeeklyProgress, getWeekDateRange, getHighestScorer } from "@/lib/trackerStore";
import { CalendarDays, Trophy, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const memberBadge: Record<Member, string> = {
  Bhavesh: "bg-person1/15 text-person1",
  Avani: "bg-person2/15 text-person2",
  Akshita: "bg-person3/15 text-person3",
};

interface Props {
  state: TrackerState;
}

export default function WeeklyProgress({ state }: Props) {
  const weeks = getWeeklyProgress(state);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Week-wise Progress</h2>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Starting from Sunday, 6th April 2026. Auto-syncs with your checklists across all sections.
      </p>

      {weeks.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No progress recorded yet. Start checking off topics to see your weekly activity!
        </div>
      )}

      {weeks.map((wp) => {
        const memberCounts = MEMBERS.map((m) => ({
          member: m,
          count: wp.items.filter((i) => i.member === m).length,
        })).filter((mc) => mc.count > 0).sort((a, b) => b.count - a.count);

        return (
          <div key={wp.week} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Week {wp.week}</h3>
              <p className="text-xs text-muted-foreground">
                {getWeekDateRange(wp.week)} · {wp.items.length} topics completed
                {wp.mockTests.length > 0 && ` · ${wp.mockTests.length} mock test${wp.mockTests.length > 1 ? "s" : ""}`}
              </p>
              {memberCounts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {memberCounts.map((mc, idx) => (
                    <span
                      key={mc.member}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
                        memberBadge[mc.member]
                      )}
                    >
                      {idx === 0 && mc.count > 0 && <Trophy className="w-3 h-3" />}
                      {mc.member}: {mc.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 space-y-3">
              {MEMBERS.map((m) => {
                const memberItems = wp.items.filter((i) => i.member === m).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
                if (memberItems.length === 0) return null;
                return (
                  <div key={m} className="space-y-1">
                    <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded-md", memberBadge[m])}>
                      {m} — {memberItems.length} topics
                    </span>
                    <div className="pl-3 space-y-0.5">
                      {memberItems.map((item, idx) => {
                        const dateStr = item.completedAt
                          ? new Date(item.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
                            " · " +
                            new Date(item.completedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                          : "";
                        return (
                        <p key={idx} className="text-xs text-muted-foreground">
                          <span className="text-foreground font-medium">{item.subjectName}</span> → {item.topicName}{" "}
                          <span className="text-[10px]">({item.section})</span>
                          {dateStr && <span className="text-[10px] ml-1 text-muted-foreground/70">— {dateStr}</span>}
                        </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Mock tests this week */}
              {wp.mockTests.length > 0 && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Mock Tests This Week</span>
                  </div>
                  {wp.mockTests.map((mt, idx) => {
                    const scoredMembers = MEMBERS.filter((m) => mt.scores[m] !== null);
                    const best = scoredMembers.length > 0
                      ? scoredMembers.reduce((a, b) => ((mt.scores[a] ?? 0) >= (mt.scores[b] ?? 0) ? a : b))
                      : null;

                    return (
                      <div key={idx} className="bg-muted/40 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground">{mt.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${mt.type === "subject" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                            {mt.type === "subject" ? "Subject Wise" : "Full Length"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {MEMBERS.map((m) => {
                            const s = mt.scores[m];
                            const isBest = best === m && scoredMembers.length > 1;
                            return (
                              <span
                                key={m}
                                className={cn(
                                  "text-[11px] px-2 py-0.5 rounded-md font-medium",
                                  memberBadge[m],
                                  isBest && "ring-1 ring-yellow-400"
                                )}
                              >
                                {isBest && <Trophy className="w-3 h-3 inline mr-0.5 text-yellow-500" />}
                                {m}: {s !== null ? `${s}/${mt.totalMarks}` : "—"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

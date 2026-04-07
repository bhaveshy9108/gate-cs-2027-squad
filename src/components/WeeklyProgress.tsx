import { MEMBERS, type Member } from "@/lib/gateData";
import { type TrackerState, getWeeklyProgress, getWeekDateRange } from "@/lib/trackerStore";
import { CalendarDays, Trophy } from "lucide-react";
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
        Starting from Monday, 7th April 2025. Auto-syncs with your checklists across all sections.
      </p>

      {weeks.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No progress recorded yet. Start checking off topics to see your weekly activity!
        </div>
      )}

      {weeks.map((wp) => {
        // Compute per-member counts for leaderboard
        const memberCounts = MEMBERS.map((m) => ({
          member: m,
          count: wp.items.filter((i) => i.member === m).length,
        })).filter((mc) => mc.count > 0).sort((a, b) => b.count - a.count);

        const topCount = memberCounts.length > 0 ? memberCounts[0].count : 0;

        return (
          <div key={wp.week} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Week {wp.week}</h3>
              <p className="text-xs text-muted-foreground">{getWeekDateRange(wp.week)} · {wp.items.length} topics completed</p>
              {/* Leaderboard */}
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
            <div className="p-4 space-y-2">
              {MEMBERS.map((m) => {
                const memberItems = wp.items.filter((i) => i.member === m);
                if (memberItems.length === 0) return null;
                return (
                  <div key={m} className="space-y-1">
                    <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded-md", memberBadge[m])}>
                      {m} — {memberItems.length} topics
                    </span>
                    <div className="pl-3 space-y-0.5">
                      {memberItems.map((item, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          <span className="text-foreground font-medium">{item.subjectName}</span> → {item.topicName}{" "}
                          <span className="text-[10px]">({item.section})</span>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { MEMBERS, type Member } from "@/lib/gateData";
import { getCoverageScopeLabel, getMockTestDisplayName, getMockTestTypeLabel, getWeekDateRange, getWeeklyProgress, getWeeklyTestDisplayName, type TrackerState } from "@/lib/trackerStore";
import { CalendarDays, ClipboardList, ExternalLink, ListTodo, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const memberBadge: Record<Member, string> = {
  Bhavesh: "bg-person1/15 text-person1",
  Aryan: "bg-amber-500/15 text-amber-600",
};

interface Props {
  state: TrackerState;
}

export default function WeeklyProgress({ state }: Props) {
  const weeks = [...getWeeklyProgress(state)].sort((a, b) => b.week - a.week);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Week-wise Progress</h2>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Starting from Sunday, 6 April 2026. Checklist work, mock tests, and taken weekly tests all appear here.
      </p>

      {weeks.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          No progress recorded yet. Start checking off topics or marking tests as taken to see weekly activity.
        </div>
      )}

      {weeks.map((wp) => {
        const memberCounts = MEMBERS.map((member) => ({
          member,
          count: wp.items.filter((item) => item.member === member).length,
        }))
          .filter((entry) => entry.count > 0)
          .sort((a, b) => b.count - a.count);

        return (
          <div key={wp.week} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Week {wp.week}</h3>
              <p className="text-xs text-muted-foreground">
                {getWeekDateRange(wp.week)} | {wp.items.length} topics completed
                {wp.mockTests.length > 0 && ` | ${wp.mockTests.length} mock test${wp.mockTests.length > 1 ? "s" : ""}`}
                {wp.weeklyTests.length > 0 && ` | ${wp.weeklyTests.length} weekly test${wp.weeklyTests.length > 1 ? "s" : ""} scheduled`}
              </p>
              {memberCounts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {memberCounts.map((entry, idx) => (
                    <span
                      key={entry.member}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
                        memberBadge[entry.member]
                      )}
                    >
                      {idx === 0 && <Trophy className="w-3 h-3" />}
                      {entry.member}: {entry.count}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              {MEMBERS.map((member) => {
                const memberItems = wp.items
                  .filter((item) => item.member === member)
                  .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

                if (memberItems.length === 0) return null;

                return (
                  <div key={member} className="space-y-1">
                    <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded-md", memberBadge[member])}>
                      {member} - {memberItems.length} topics
                    </span>
                    <div className="pl-3 space-y-0.5">
                      {memberItems.map((item, idx) => {
                        const completedAt = new Date(item.completedAt);
                        const dateStr = item.completedAt
                          ? `${completedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} | ${completedAt.toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}`
                          : "";

                        return (
                          <p key={idx} className="text-xs text-muted-foreground">
                            <span className="text-foreground font-medium">{item.subjectName}</span>
                            {" -> "}
                            {item.topicName}{" "}
                            <span className="text-[10px]">({item.section})</span>
                            {dateStr && <span className="text-[10px] ml-1 text-muted-foreground/70">| {dateStr}</span>}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {wp.mockTests.length > 0 && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Mock Tests This Week</span>
                  </div>
                  {wp.mockTests.map((test, idx) => {
                    const scoredMembers = MEMBERS.filter((member) => test.scores[member] !== null);
                    const best =
                      scoredMembers.length > 0
                        ? scoredMembers.reduce((a, b) => ((test.scores[a] ?? 0) >= (test.scores[b] ?? 0) ? a : b))
                        : null;

                    return (
                      <div key={idx} className="bg-muted/40 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground">{getMockTestDisplayName(test)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${test.type === "subject" ? "bg-accent text-accent-foreground" : test.type === "weekly" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-primary/10 text-primary"}`}>
                            {getMockTestTypeLabel(test.type)}
                          </span>
                          {test.source && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                              {test.source}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                            {getCoverageScopeLabel(test.coverageScope ?? "full")}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {MEMBERS.map((member) => {
                            const score = test.scores[member];
                            const isBest = best === member && scoredMembers.length > 1;
                            return (
                              <span
                                key={member}
                                className={cn(
                                  "text-[11px] px-2 py-0.5 rounded-md font-medium",
                                  memberBadge[member],
                                  isBest && "ring-1 ring-yellow-400"
                                )}
                              >
                                {isBest && <Trophy className="w-3 h-3 inline mr-0.5 text-yellow-500" />}
                                {member}: {score !== null ? `${score}/${test.totalMarks}` : "-"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {wp.weeklyTests.length > 0 && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Weekly Tests This Week</span>
                  </div>
                  {wp.weeklyTests.map((test, idx) => (
                    <div key={idx} className="bg-muted/40 rounded-lg px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground">{getWeeklyTestDisplayName(test)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                          {test.source}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                          {getCoverageScopeLabel(test.coverageScope ?? "full")}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent text-accent-foreground">
                          {test.kind === "mock" ? "Mock" : test.kind === "subject" ? "Subject" : "Quiz"}
                        </span>
                        {test.link && (
                          <a
                            href={test.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {MEMBERS.map((member) => {
                          const status = test.memberStatus[member];
                          const percent =
                            status.taken &&
                            typeof status.score === "number" &&
                            typeof status.outOf === "number" &&
                            status.outOf > 0
                              ? Math.round((status.score / status.outOf) * 100)
                              : null;

                          return (
                            <span key={`${test.name}-${member}`} className={cn("text-[11px] px-2 py-1 rounded-md font-medium", memberBadge[member])}>
                              {member}:{" "}
                              {status.taken
                                ? `${status.score ?? "-"} / ${status.outOf ?? "-"}${percent !== null ? ` (${percent}%)` : ""}`
                                : "Pending"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

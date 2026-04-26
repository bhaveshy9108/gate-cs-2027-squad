import { useMemo } from "react";
import { MEMBERS, type Member } from "@/lib/gateData";
import {
  getTestPerformanceRecords,
  getMockTestTypeLabel,
  type TestPerformanceRecord,
  type TrackerState,
  type WeeklyTestSource,
} from "@/lib/trackerStore";
import { BarChart3, LineChart, Target, Trophy } from "lucide-react";

interface Props {
  state: TrackerState;
}

type MemberSummary = {
  member: Member;
  attempts: number;
  average: number | null;
  best: number | null;
  recentAverage: number | null;
};

function getPercent(score: number | null, totalMarks: number) {
  if (score === null || totalMarks <= 0) return null;
  return Math.round((score / totalMarks) * 100);
}

function getMemberSummaries(records: TestPerformanceRecord[]): MemberSummary[] {
  return MEMBERS.map((member) => {
    const attempts = records
      .map((record) => ({
        record,
        percent: getPercent(record.scores[member], record.totalMarks),
      }))
      .filter((entry) => entry.percent !== null) as { record: TestPerformanceRecord; percent: number }[];

    const sortedRecent = [...attempts].sort(
      (a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime()
    );
    const recent = sortedRecent.slice(0, 5).map((entry) => entry.percent);

    return {
      member,
      attempts: attempts.length,
      average: attempts.length ? Math.round(attempts.reduce((sum, entry) => sum + entry.percent, 0) / attempts.length) : null,
      best: attempts.length ? Math.max(...attempts.map((entry) => entry.percent)) : null,
      recentAverage: recent.length ? Math.round(recent.reduce((sum, percent) => sum + percent, 0) / recent.length) : null,
    };
  });
}

function getTypeBreakdown(records: TestPerformanceRecord[]) {
  return (["full", "subject", "weekly"] as const).map((type) => {
    const typedRecords = records.filter((record) => record.type === type);
    const memberAverages = Object.fromEntries(
      MEMBERS.map((member) => {
        const percents = typedRecords
          .map((record) => getPercent(record.scores[member], record.totalMarks))
          .filter((percent): percent is number => percent !== null);
        return [member, percents.length ? Math.round(percents.reduce((sum, percent) => sum + percent, 0) / percents.length) : null];
      })
    ) as Record<Member, number | null>;

    return {
      type,
      count: typedRecords.length,
      memberAverages,
    };
  });
}

function getSourceBreakdown(records: TestPerformanceRecord[]) {
  const sources = Array.from(
    new Set(records.map((record) => record.source).filter((source): source is WeeklyTestSource => Boolean(source)))
  );

  return sources.map((source) => {
    const sourceRecords = records.filter((record) => record.source === source);
    const memberAverages = Object.fromEntries(
      MEMBERS.map((member) => {
        const percents = sourceRecords
          .map((record) => getPercent(record.scores[member], record.totalMarks))
          .filter((percent): percent is number => percent !== null);
        return [member, percents.length ? Math.round(percents.reduce((sum, percent) => sum + percent, 0) / percents.length) : null];
      })
    ) as Record<Member, number | null>;

    return { source, count: sourceRecords.length, memberAverages };
  });
}

function getSubjectBreakdown(records: TestPerformanceRecord[]) {
  const subjects = Array.from(
    new Map(
      records
        .filter((record) => record.subjectId && record.subjectName)
        .map((record) => [record.subjectId as string, record.subjectName as string])
    ).entries()
  );

  return subjects.map(([subjectId, subjectName]) => {
    const subjectRecords = records.filter((record) => record.subjectId === subjectId);
    const memberAverages = Object.fromEntries(
      MEMBERS.map((member) => {
        const percents = subjectRecords
          .map((record) => getPercent(record.scores[member], record.totalMarks))
          .filter((percent): percent is number => percent !== null);
        return [member, percents.length ? Math.round(percents.reduce((sum, percent) => sum + percent, 0) / percents.length) : null];
      })
    ) as Record<Member, number | null>;

    return { subjectId, subjectName, count: subjectRecords.length, memberAverages };
  });
}

export default function TestAnalysisSection({ state }: Props) {
  const records = useMemo(
    () =>
      getTestPerformanceRecords(state).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [state]
  );
  const memberSummaries = useMemo(() => getMemberSummaries(records), [records]);
  const typeBreakdown = useMemo(() => getTypeBreakdown(records), [records]);
  const sourceBreakdown = useMemo(() => getSourceBreakdown(records), [records]);
  const subjectBreakdown = useMemo(() => getSubjectBreakdown(records), [records]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <LineChart className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Test Analysis</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        A combined view of mock tests and linked weekly tests, with score trends, subject comparisons, and platform performance.
      </p>

      {records.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          Add test scores to unlock analysis, comparisons, and trends here.
        </div>
      )}

      {records.length > 0 && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {memberSummaries.map((summary) => (
              <div key={summary.member} className="rounded-xl border-2 p-4 border-border bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{summary.member}</h3>
                  {summary.best !== null && <Trophy className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Attempts</p>
                    <p className="font-semibold text-foreground">{summary.attempts}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Average</p>
                    <p className="font-semibold text-foreground">{summary.average !== null ? `${summary.average}%` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Best</p>
                    <p className="font-semibold text-foreground">{summary.best !== null ? `${summary.best}%` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Recent 5 Avg</p>
                    <p className="font-semibold text-foreground">{summary.recentAverage !== null ? `${summary.recentAverage}%` : "-"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">By Test Type</h3>
              </div>
              {typeBreakdown.map((entry) => (
                <div key={entry.type} className="rounded-lg bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{getMockTestTypeLabel(entry.type)}</span>
                    <span className="text-xs text-muted-foreground">{entry.count} tests</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {MEMBERS.map((member) => (
                      <div key={member} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{member}:</span>{" "}
                        {entry.memberAverages[member] !== null ? `${entry.memberAverages[member]}% avg` : "-"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">By Platform</h3>
              </div>
              {sourceBreakdown.length === 0 && (
                <p className="text-xs text-muted-foreground">Platform analysis appears as you score linked weekly tests.</p>
              )}
              {sourceBreakdown.map((entry) => (
                <div key={entry.source} className="rounded-lg bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{entry.source}</span>
                    <span className="text-xs text-muted-foreground">{entry.count} tests</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {MEMBERS.map((member) => (
                      <div key={member} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{member}:</span>{" "}
                        {entry.memberAverages[member] !== null ? `${entry.memberAverages[member]}% avg` : "-"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Subject-wise Comparison</h3>
            </div>
            {subjectBreakdown.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Choose subjects on weekly tests or mock tests to unlock subject-wise analysis here.
              </p>
            )}
            {subjectBreakdown.map((entry) => (
              <div key={entry.subjectId} className="rounded-lg bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{entry.subjectName}</span>
                  <span className="text-xs text-muted-foreground">{entry.count} tests</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {MEMBERS.map((member) => (
                    <div key={member} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{member}:</span>{" "}
                      {entry.memberAverages[member] !== null ? `${entry.memberAverages[member]}% avg` : "-"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Recent Test History</h3>
            </div>
            <div className="space-y-2">
              {records.slice(0, 10).map((record) => (
                <div key={record.id} className="rounded-lg bg-muted/40 p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-foreground">{record.displayName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                      {getMockTestTypeLabel(record.type)}
                    </span>
                    {record.source && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent text-accent-foreground">
                        {record.source}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{record.date}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {MEMBERS.map((member) => (
                      <div key={member} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{member}:</span>{" "}
                        {record.scores[member] !== null
                          ? `${record.scores[member]}/${record.totalMarks} (${getPercent(record.scores[member], record.totalMarks)}%)`
                          : "-"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

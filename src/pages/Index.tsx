import { useState, useEffect, useCallback } from "react";
import { type Member } from "@/lib/gateData";
import { loadState, saveState, type TrackerState } from "@/lib/trackerStore";
import { loadCloudState, saveCloudState } from "@/lib/cloudSync";
import { useAuth } from "@/components/AuthProvider";
import MemberSelector from "@/components/MemberSelector";
import SubjectChecklist from "@/components/SubjectChecklist";
import PYQSection from "@/components/PYQSection";
import MockTestSection from "@/components/MockTestSection";
import WeeklyProgress from "@/components/WeeklyProgress";
import OverallDashboard from "@/components/OverallDashboard";
import RevisionSection from "@/components/RevisionSection";
import StreakCalendar from "@/components/StreakCalendar";
import { BookOpen, BookMarked, ClipboardList, CalendarDays, BarChart3, GraduationCap, RefreshCw, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "study", label: "Study", icon: BookOpen },
  { id: "revision", label: "Revision", icon: RefreshCw },
  { id: "pyq", label: "PYQs", icon: BookMarked },
  { id: "mock", label: "Mock Tests", icon: ClipboardList },
  { id: "weekly", label: "Weekly Progress", icon: CalendarDays },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Index() {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<TrackerState>(loadState);
  const [tab, setTab] = useState<TabId>("dashboard");
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const member = state.currentMember;

  // Load cloud state on mount
  useEffect(() => {
    if (!user) return;
    loadCloudState(user.id).then((cloud) => {
      if (cloud) {
        setState((local) => {
          // If local has data and cloud is empty, keep local
          const localHasData = Object.keys(local.checklist).length > 0;
          const cloudHasData = Object.keys(cloud.checklist || {}).length > 0;
          if (localHasData && !cloudHasData) return local;
          return { ...local, ...cloud };
        });
      }
      setCloudLoaded(true);
    });
  }, [user]);

  // Save to cloud + localStorage on state change
  useEffect(() => {
    saveState(state);
    if (user && cloudLoaded) {
      saveCloudState(user.id, state);
    }
  }, [state, user, cloudLoaded]);

  const setMember = (m: Member) => setState((s) => ({ ...s, currentMember: m }));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">GATE CS 2027</h1>
            </div>
            <div className="flex items-center gap-3">
              <MemberSelector current={member} onChange={setMember} />
              <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 -mb-3">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2",
                    tab === t.id
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "dashboard" && (
          <>
            <OverallDashboard state={state} />
            <StreakCalendar state={state} />
          </>
        )}
        {tab === "study" && (
          <SubjectChecklist section="study" sectionLabel="Study Checklist" state={state} member={member} onUpdate={setState} />
        )}
        {tab === "revision" && <RevisionSection state={state} member={member} onUpdate={setState} />}
        {tab === "pyq" && <PYQSection state={state} member={member} onUpdate={setState} />}
        {tab === "mock" && <MockTestSection state={state} member={member} onUpdate={setState} />}
        {tab === "weekly" && <WeeklyProgress state={state} />}
      </main>
    </div>
  );
}

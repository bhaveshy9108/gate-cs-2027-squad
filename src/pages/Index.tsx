import { useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { ArrowRight, BarChart3, BookMarked, BookOpen, CalendarCheck2, CalendarDays, Cloud, Clock3, GraduationCap, LineChart, RefreshCw, Search, Sparkles, Target, X } from "lucide-react";
import { toast } from "sonner";

import { MEMBERS, SUBJECTS, type Member } from "@/lib/gateData";
import {
  createDefaultState,
  getAllTopics,
  getSubjectProgress,
  getWeekDateRange,
  getWeekNumber,
  getWeeklyProgress,
  loadState,
  saveState,
  type TrackerState,
} from "@/lib/trackerStore";
import {
  clearRoomCode,
  generateRoomCode,
  getSavedRoomCode,
  getSavedRoomState,
  hasCloudSync,
  loadCloudState,
  publishRoomState,
  saveCloudState,
  saveRoomCode,
  subscribeToRoom,
} from "@/lib/cloudSync";
import { cn } from "@/lib/utils";
import MemberSelector from "@/components/MemberSelector";
import MockTestSection from "@/components/MockTestSection";
import OverallDashboard from "@/components/OverallDashboard";
import PYQSection from "@/components/PYQSection";
import RevisionSection from "@/components/RevisionSection";
import RoomCodeDialog from "@/components/RoomCodeDialog";
import StreakCalendar from "@/components/StreakCalendar";
import SubjectChecklist from "@/components/SubjectChecklist";
import TestAnalysisSection from "@/components/TestAnalysisSection";
import WeeklyProgress from "@/components/WeeklyProgress";
import WeeklyPyqPlanner from "@/components/WeeklyPyqPlanner";
import WeeklyTestsSection from "@/components/WeeklyTestsSection";
import { PYQ_SUBJECTS } from "@/lib/pyqCatalog";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "study", label: "Study", icon: BookOpen },
  { id: "revision", label: "Revision", icon: RefreshCw },
  { id: "pyq", label: "PYQs", icon: BookMarked },
  { id: "mock", label: "Mock Tests", icon: CalendarCheck2 },
  { id: "weekly-tests", label: "Weekly Tests", icon: CalendarDays },
  { id: "test-analysis", label: "Test Analysis", icon: LineChart },
  { id: "weekly", label: "Weekly Progress", icon: Target },
] as const;

type TabId = (typeof TABS)[number]["id"];

function formatDateLabel(iso: string | null) {
  if (!iso) return "No activity yet";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function getLastActivity(state: TrackerState) {
  let latest: string | null = null;
  for (const entry of Object.values(state.checklist)) {
    if (!entry.completedAt) continue;
    if (!latest || entry.completedAt > latest) {
      latest = entry.completedAt;
    }
  }
  return latest;
}

export default function Index() {
  const [state, setState] = useState<TrackerState>(() => {
    const savedRoomCode = getSavedRoomCode();
    if (savedRoomCode) {
      const roomState = getSavedRoomState(savedRoomCode);
      if (roomState) return roomState;
    }
    return loadState();
  });
  const [tab, setTab] = useState<TabId>("dashboard");
  const [roomCode, setRoomCode] = useState<string | null>(getSavedRoomCode);
  const [cloudReady, setCloudReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTarget, setSearchTarget] = useState<{ section: TabId; subjectId: string; topicId: string } | null>(null);
  const cloudEnabled = hasCloudSync();
  const member = state.currentMember;
  const canPersistRoomRef = useRef(false);

  useEffect(() => {
    if (!roomCode) {
      canPersistRoomRef.current = false;
      setCloudReady(true);
      return;
    }

    setCloudReady(false);
    canPersistRoomRef.current = cloudEnabled;

    loadCloudState(roomCode).then((cloud) => {
      canPersistRoomRef.current = cloudEnabled;
      if (cloud) {
        canPersistRoomRef.current = true;
        setState(cloud);
      } else {
        setState((local) => ({
          ...createDefaultState(),
          currentMember: local.currentMember,
        }));
      }
      setCloudReady(true);
    });

    const channel = subscribeToRoom(roomCode, (newState) => {
      setState(newState);
      saveState(newState);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [roomCode, cloudEnabled]);

  useEffect(() => {
    saveState(state);
  }, [state, roomCode, cloudReady]);

  const handleJoinRoom = (code: string) => {
    saveRoomCode(code);
    setRoomCode(code);
    canPersistRoomRef.current = cloudEnabled;
    setCloudReady(false);
    toast.success(`Joined room ${code}`);
  };

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    saveRoomCode(code);
    setRoomCode(code);
    canPersistRoomRef.current = true;
    setCloudReady(true);
    saveCloudState(code, state, { immediate: true });
    toast.success(`Created room ${code}`);
  };

  const handleDisconnect = () => {
    clearRoomCode();
    setRoomCode(null);
    toast.info(`Disconnected from ${cloudEnabled ? "cloud sync" : "shared workspace"}`);
  };

  const updateState = (updater: SetStateAction<TrackerState>) => {
    canPersistRoomRef.current = Boolean(roomCode) || canPersistRoomRef.current;
    setState((previous) => {
      const nextState =
        typeof updater === "function"
          ? (updater as (prevState: TrackerState) => TrackerState)(previous)
          : updater;
      const stampedState = { ...nextState, lastUpdatedAt: new Date().toISOString() };

      if (roomCode) {
        publishRoomState(roomCode, stampedState);
        if (cloudReady && canPersistRoomRef.current) {
          saveCloudState(roomCode, stampedState, { localAlreadyPublished: true });
        }
      }

      return stampedState;
    });
  };

  const setMember = (m: Member) => updateState((s) => ({ ...s, currentMember: m }));

  const currentWeek = getWeekNumber(new Date());
  const currentWeekRange = getWeekDateRange(currentWeek);
  const weeklyProgress = useMemo(() => getWeeklyProgress(state), [state]);

  const overallProgress = useMemo(() => {
    let done = 0;
    let total = 0;

    for (const sectionId of ["study", "revision", "pyq"] as const) {
      for (const subject of SUBJECTS) {
        const progress = getSubjectProgress(state, member, sectionId, subject.id);
        done += progress.done;
        total += progress.total;
      }
    }

    return {
      done,
      total,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [state, member]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    type SearchResult = {
      id: string;
      section: TabId;
      sectionLabel: string;
      subjectId: string;
      subjectName: string;
      topicId: string;
      topicName: string;
      detail: string;
      score: number;
    };

    const results: SearchResult[] = [];

    const addStudyResults = (section: "study" | "revision") => {
      for (const subject of SUBJECTS) {
        const topics = getAllTopics(state, subject.id, section);
        for (const topic of topics) {
          const note = state.topicNotes[`${subject.id}|${topic.id}`];
          const haystack = [
            subject.name,
            topic.name,
            section,
            note?.text ?? "",
            ...(note?.links ?? []),
          ]
            .join(" ")
            .toLowerCase();

          if (!haystack.includes(query)) continue;

          const topicName = topic.name.toLowerCase();
          const subjectName = subject.name.toLowerCase();
          const score = topicName === query ? 0 : topicName.startsWith(query) ? 1 : subjectName.includes(query) ? 2 : note?.text?.toLowerCase().includes(query) ? 3 : 4;

          results.push({
            id: `${section}:${subject.id}:${topic.id}`,
            section,
            sectionLabel: section === "study" ? "Study" : "Revision",
            subjectId: subject.id,
            subjectName: subject.name,
            topicId: topic.id,
            topicName: topic.name,
            detail: note?.text ? `Note hit · ${note.text.slice(0, 80)}` : `${section === "study" ? "Study" : "Revision"} topic`,
            score,
          });
        }
      }
    };

    addStudyResults("study");
    addStudyResults("revision");

    for (const subject of PYQ_SUBJECTS) {
      for (const topic of subject.topics) {
        const haystack = [subject.name, subject.volume, topic.name].join(" ").toLowerCase();
        if (!haystack.includes(query)) continue;

        const topicName = topic.name.toLowerCase();
        const subjectName = subject.name.toLowerCase();
        results.push({
          id: `pyq:${subject.id}:${topic.id}`,
          section: "pyq",
          sectionLabel: "PYQs",
          subjectId: subject.id,
          subjectName: subject.name,
          topicId: topic.id,
          topicName: topic.name,
          detail: `${subject.volume} · ${topic.count ?? 0} PYQs`,
          score: topicName === query ? 0 : topicName.startsWith(query) ? 1 : subjectName.includes(query) ? 2 : 4,
        });
      }
    }

    return results.sort((a, b) => a.score - b.score || a.subjectName.localeCompare(b.subjectName) || a.topicName.localeCompare(b.topicName)).slice(0, 10);
  }, [searchQuery, state]);

  const activeTab = TABS.find((entry) => entry.id === tab) ?? TABS[0];
  const ActiveIcon = activeTab.icon;

  const openSearchResult = (result: (typeof searchResults)[number]) => {
    setTab(result.section);
    setSearchTarget({
      section: result.section,
      subjectId: result.subjectId,
      topicId: result.topicId,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderActiveContent = () => {
    switch (tab) {
      case "dashboard":
        return (
          <div className="grid gap-5 2xl:grid-cols-[1.15fr_.85fr]">
            <div className="space-y-5">
              <OverallDashboard state={state} onOpenSection={(section) => setTab(section)} />
              <StreakCalendar state={state} />
            </div>
            <div className="space-y-5" />
          </div>
        );
      case "study":
        return (
          <SubjectChecklist
            section="study"
            sectionLabel="Study Checklist"
            state={state}
            member={member}
            onUpdate={updateState}
            focusSubjectId={searchTarget?.section === "study" ? searchTarget.subjectId : null}
            focusTopicId={searchTarget?.section === "study" ? searchTarget.topicId : null}
          />
        );
      case "revision":
        return (
          <RevisionSection
            state={state}
            member={member}
            onUpdate={updateState}
            focusSubjectId={searchTarget?.section === "revision" ? searchTarget.subjectId : null}
            focusTopicId={searchTarget?.section === "revision" ? searchTarget.topicId : null}
          />
        );
      case "pyq":
        return (
          <PYQSection
            state={state}
            member={member}
            onUpdate={updateState}
            focusSubjectId={searchTarget?.section === "pyq" ? searchTarget.subjectId : null}
            focusTopicId={searchTarget?.section === "pyq" ? searchTarget.topicId : null}
          />
        );
      case "mock":
        return <MockTestSection state={state} member={member} onUpdate={updateState} />;
      case "weekly-tests":
        return <WeeklyTestsSection state={state} onUpdate={updateState} />;
      case "test-analysis":
        return <TestAnalysisSection state={state} />;
      case "weekly":
        return <WeeklyProgress state={state} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-secondary/50 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm shadow-primary/10">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  Personal study cockpit
                </p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">GATE CS 2027</h1>
                <p className="text-sm text-muted-foreground">Goal: AIR 10 MTECH CS IIT BOMBAY.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RoomCodeDialog
                roomCode={roomCode}
                cloudEnabled={cloudEnabled}
                onJoin={handleJoinRoom}
                onCreate={handleCreateRoom}
                onDisconnect={handleDisconnect}
              />
              <MemberSelector current={member} onChange={setMember} />
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((entry) => {
              const Icon = entry.icon;
              const active = tab === entry.id;
              return (
                <button
                  key={entry.id}
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200",
                    active
                      ? "border-primary/30 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "border-border/70 bg-card/80 text-muted-foreground hover:-translate-y-0.5 hover:border-primary/30 hover:text-foreground hover:shadow-md"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 lg:py-8">
        {tab !== "dashboard" ? (
          <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/95 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="border-b border-border/70 px-6 py-5 sm:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">Goal</p>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">AIR 10 MTECH CS IIT BOMBAY</h2>
                  <p className="text-sm text-muted-foreground">Current section: {activeTab.label}</p>
                </div>
                <button
                  onClick={() => setTab("dashboard")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <BarChart3 className="h-4 w-4" />
                  Back to dashboard
                </button>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">{renderActiveContent()}</div>
          </section>
        ) : (
        <section className="grid gap-5 2xl:grid-cols-[1.55fr_.9fr]">
          <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/95 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="border-b border-border/70 px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Goal locked
                  </div>
                  <h2 className="whitespace-pre-line text-3xl font-semibold tracking-tight sm:text-4xl">
                    AIR 10{"\n"}MTECH CS IIT BOMBAY
                  </h2>
                  <p className="max-w-3xl whitespace-nowrap text-sm text-muted-foreground sm:text-base">
                    JUST REMAIN CONSISTENT AND YOU WILL RECEIVE EVERYTHING. TRUST YOURSELF, <span style={{ color: "#000" }}>BHAVESH</span>.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    Overall
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">{overallProgress.percent}%</p>
                  <p className="text-xs text-muted-foreground">
                    {overallProgress.done}/{overallProgress.total} tasks completed
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${overallProgress.percent}%` }} />
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    Current week
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">Week {currentWeek}</p>
                  <p className="text-xs text-muted-foreground">{currentWeekRange}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <Cloud className="h-3.5 w-3.5 text-primary" />
                    Sync
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    {roomCode ? (cloudEnabled ? (cloudReady ? "Synced" : "Connecting") : "Local") : "Idle"}
                  </p>
                  <p className="text-xs text-muted-foreground">{roomCode ? roomCode : "No room connected"}</p>
                </div>

              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              {tab !== "dashboard" && (
                <div className="mb-5 rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Current section</p>
                      <div className="mt-1 flex items-center gap-2">
                        <ActiveIcon className="h-4 w-4 text-primary" />
                        <h3 className="text-xl font-semibold">{activeTab.label}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">A focused space for this part of the tracker, wrapped in a calmer shell.</p>
                    </div>
                    <button
                      onClick={() => setTab("dashboard")}
                      className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Back to dashboard
                    </button>
                  </div>
                </div>
              )}

              {renderActiveContent()}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="sticky top-24 rounded-[1.75rem] border border-border/70 bg-card/95 p-5 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">At a glance</p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-primary" />
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Quick search</p>
                    </div>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSearchTarget(null);
                        }}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 relative">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search topics, subjects, or notes"
                      className="w-full rounded-2xl border border-border/70 bg-card px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>

                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {searchQuery.trim() ? (
                      searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => openSearchResult(result)}
                            className="w-full rounded-2xl border border-border/70 bg-card/90 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                                    {result.sectionLabel}
                                  </span>
                                  <span className="truncate text-sm font-semibold text-foreground">{result.subjectName}</span>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{result.topicName}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground">{result.detail}</p>
                              </div>
                              <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 px-4 py-6 text-center">
                          <p className="text-sm font-medium text-foreground">No matching topics</p>
                          <p className="mt-1 text-xs text-muted-foreground">Try a subject like OS, a topic like caching, or a note keyword.</p>
                        </div>
                      )
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 px-4 py-5 text-sm text-muted-foreground">
                        Start typing to search across Study, Revision, and PYQ topics.
                      </div>
                    )}
                  </div>
                </div>

                <WeeklyPyqPlanner state={state} member={member} weekNumber={currentWeek} onUpdate={updateState} />
              </div>
            </div>
          </aside>
        </section>
        )}
      </main>
    </div>
  );
}

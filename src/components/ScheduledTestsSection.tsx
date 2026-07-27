import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2, Plus, X } from "lucide-react";
import {
  addTestSeries,
  removeTestSeries,
  updateTestSeries,
  type TrackerState,
} from "@/lib/trackerStore";

interface Props {
  state: TrackerState;
  onUpdate: (state: TrackerState) => void;
}

export default function ScheduledTestsSection({ state, onUpdate }: Props) {
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [seriesName, setSeriesName] = useState("");
  const [seriesUrl, setSeriesUrl] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState(state.testSeries[0]?.id ?? "");
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);

  useEffect(() => {
    if (!state.testSeries.length) return;
    if (!state.testSeries.some((series) => series.id === selectedSeriesId)) {
      setSelectedSeriesId(state.testSeries[0].id);
    }
  }, [selectedSeriesId, state.testSeries]);

  const selectedSeries =
    state.testSeries.find((series) => series.id === selectedSeriesId) ?? state.testSeries[0] ?? null;
  const editingSeries = state.testSeries.find((series) => series.id === editingSeriesId) ?? null;

  const seriesButtons = useMemo(() => state.testSeries, [state.testSeries]);

  const handleAddSeries = () => {
    if (!seriesName.trim()) return;
    onUpdate(addTestSeries(state, seriesName, seriesUrl));
    setSeriesName("");
    setSeriesUrl("");
    setShowAddSeries(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Platform Test Links</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Add the test series you use, then import PDF lists into the same order they appear in the file.
        </p>

        <div className="flex flex-wrap justify-between gap-2">
          {!showAddSeries ? (
            <button
              onClick={() => setShowAddSeries(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Add Series
            </button>
          ) : (
            <button
              onClick={() => {
                setShowAddSeries(false);
                setSeriesName("");
                setSeriesUrl("");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              <X className="h-4 w-4" />
              Close Series Editor
            </button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Zeal and Made Easy tests are loaded automatically into the synced schedule board.
        </div>

        {showAddSeries && (
          <div className="rounded-lg border border-dashed border-border bg-background p-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
              <input
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="Test series name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={seriesUrl}
                onChange={(e) => setSeriesUrl(e.target.value)}
                placeholder="Test series link"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddSeries}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {selectedSeries && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {seriesButtons.map((series) => (
                  <button
                    key={series.id}
                    onClick={() => setSelectedSeriesId(series.id)}
                    className={
                      series.id === selectedSeries.id
                        ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                        : "rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    }
                  >
                    {series.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {selectedSeries.url && (
                  <a
                    href={selectedSeries.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  onClick={() => setEditingSeriesId((current) => (current === selectedSeries.id ? null : selectedSeries.id))}
                  className="rounded-lg px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
                >
                  {editingSeriesId === selectedSeries.id ? "Close" : "Modify"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/80 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{selectedSeries.name}</span>
                {selectedSeries.url ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Linked
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Link missing
                  </span>
                )}
              </div>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {selectedSeries.url || "No link added yet for this test series."}
              </p>
            </div>

            {editingSeries && editingSeries.id === selectedSeries.id && (
              <div className="rounded-lg border border-dashed border-border bg-background p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modify Test Series</p>
                  <button
                    onClick={() => {
                      onUpdate(removeTestSeries(state, editingSeries.id));
                      const fallback = state.testSeries.find((series) => series.id !== editingSeries.id);
                      setSelectedSeriesId(fallback?.id ?? "");
                      setEditingSeriesId(null);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    title={`Remove ${editingSeries.name}`}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <input
                    value={editingSeries.name}
                    onChange={(e) => onUpdate(updateTestSeries(state, editingSeries.id, { name: e.target.value }))}
                    placeholder="Series name"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    value={editingSeries.url}
                    onChange={(e) => onUpdate(updateTestSeries(state, editingSeries.id, { url: e.target.value }))}
                    placeholder={`Paste ${editingSeries.name} link`}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { Clock3 } from "lucide-react";

export default function ScheduledTestsSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock3 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Scheduled Tests</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        This section is ready for your scheduled-test setup. Tell me what you want to include here next, and I’ll build it in.
      </p>
    </div>
  );
}

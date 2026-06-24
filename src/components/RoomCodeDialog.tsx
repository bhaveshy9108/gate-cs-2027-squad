import { useState } from "react";
import { Cloud, CloudOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RoomCodeDialogProps {
  roomCode: string | null;
  cloudEnabled: boolean;
  onJoin: (code: string) => void;
  onCreate: () => void;
  onDisconnect: () => void;
}

export default function RoomCodeDialog({ roomCode, cloudEnabled, onJoin, onCreate, onDisconnect }: RoomCodeDialogProps) {
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const isConnectedToCloud = Boolean(roomCode && cloudEnabled);
  const isConnectedLocally = Boolean(roomCode && !cloudEnabled);

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      toast.error("Enter a valid room code");
      return;
    }
    onJoin(code);
    setOpen(false);
  };

  const handleCreate = () => {
    onCreate();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-3.5 py-2 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md"
          title={roomCode ? `${cloudEnabled ? "Cloud" : "Local"} workspace: ${roomCode}` : cloudEnabled ? "Cloud Sync" : "Local Workspace"}
        >
          {isConnectedToCloud ? (
            <Cloud className="w-3.5 h-3.5 text-green-500" />
          ) : isConnectedLocally ? (
            <CloudOff className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          {roomCode ? `${cloudEnabled ? "Cloud" : "Local"}: ${roomCode}` : "Sync"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl border-border/70 bg-card/95 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{cloudEnabled ? "Cloud sync" : "Local workspace"}</DialogTitle>
        </DialogHeader>

        {roomCode ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">You are connected to this workspace:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-2xl border border-border/70 bg-muted/60 px-3 py-2 text-center text-lg font-mono font-bold tracking-widest">
                {roomCode}
              </code>
              <button onClick={handleCopy} className="rounded-2xl border border-border/70 p-2 transition-colors hover:bg-muted/60">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {cloudEnabled
                ? "Use this code from any device to open the same tracker data."
                : "Use the same code in another tab or browser profile on this laptop to continue the same tracker data."}
            </p>
            {!cloudEnabled && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                Cross-device sync is currently off. Add Supabase env vars to this app build to use the same room code on different devices.
              </div>
            )}
            <button
              onClick={() => { onDisconnect(); setOpen(false); }}
              className="w-full rounded-2xl border border-destructive/30 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Join existing room</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  maxLength={6}
                  className="flex-1 rounded-2xl border border-border/70 bg-card px-3 py-2 text-center text-sm font-mono tracking-widest uppercase text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleJoin}
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Join
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={handleCreate}
              className="w-full rounded-2xl border border-border/70 bg-card py-2.5 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              {cloudEnabled ? "Create cloud workspace" : "Create new workspace"}
            </button>
            {!cloudEnabled && (
              <p className="text-xs text-muted-foreground">
                This build is running in local-only mode, so rooms will not sync between different devices.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

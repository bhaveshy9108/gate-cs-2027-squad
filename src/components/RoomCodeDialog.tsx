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
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted/50 transition-colors"
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
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-base">{cloudEnabled ? "Cloud Sync" : "Local Workspace"}</DialogTitle>
        </DialogHeader>

        {roomCode ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connected {cloudEnabled ? "cloud" : "local"} workspace:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-center text-lg font-mono font-bold tracking-widest bg-muted px-3 py-2 rounded-lg">
                {roomCode}
              </code>
              <button onClick={handleCopy} className="p-2 hover:bg-muted rounded-lg transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {cloudEnabled
                ? "Use this code from any device to open the same tracker data."
                : "Use the same code in another tab or browser profile on this laptop to continue the same tracker data."}
            </p>
            {!cloudEnabled && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                Cross-device sync is currently off. Add Supabase env vars to this app build to use the same room code on different devices.
              </div>
            )}
            <button
              onClick={() => { onDisconnect(); setOpen(false); }}
              className="w-full py-2 text-sm font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
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
                  className="flex-1 px-3 py-2 text-sm font-mono tracking-widest bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-center uppercase"
                />
                <button
                  onClick={handleJoin}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
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
              className="w-full py-2.5 text-sm font-medium bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
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

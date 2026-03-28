import { useState } from "react";
import type { InstalledApp } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  FolderX,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function formatSize(kb: number): string {
  if (kb === 0) return "—";
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

interface AppRowProps {
  app: InstalledApp;
  onUninstall: (app: InstalledApp) => Promise<{ success: boolean; message: string }>;
  onRemoveEntry: (app: InstalledApp) => Promise<{ success: boolean; message: string }>;
}

export function AppRow({ app, onUninstall, onRemoveEntry }: AppRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<"uninstall" | "remove" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleAction = async (action: "uninstall" | "remove") => {
    setActionLoading(true);
    setActionResult(null);
    const result = action === "uninstall"
      ? await onUninstall(app)
      : await onRemoveEntry(app);
    setActionResult(result);
    setActionLoading(false);
    if (result.success) {
      setTimeout(() => {
        setConfirmDialog(null);
        setActionResult(null);
      }, 1500);
    }
  };

  return (
    <>
      <div
        className={`group border rounded-lg transition-all hover:shadow-sm ${
          app.is_orphan
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-card"
        }`}
      >
        {/* Main row */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Icon */}
          <div className={`flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center ${
            app.is_orphan ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          }`}>
            {app.is_orphan ? <FolderX className="w-4 h-4" /> : <Package className="w-4 h-4" />}
          </div>

          {/* Name + publisher */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{app.name}</span>
              {app.is_orphan && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                  Orphan
                </Badge>
              )}
            </div>
            {app.publisher && (
              <p className="text-xs text-muted-foreground truncate">{app.publisher}</p>
            )}
          </div>

          {/* Version */}
          <div className="hidden sm:block w-24 text-xs text-muted-foreground text-right truncate">
            {app.version || "—"}
          </div>

          {/* Size */}
          <div className="hidden md:block w-20 text-xs text-muted-foreground text-right">
            {formatSize(app.estimated_size_kb)}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {app.is_orphan ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDialog("remove");
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove registry entry</TooltipContent>
              </Tooltip>
            ) : app.uninstall_string ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDialog("uninstall");
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Uninstall</TooltipContent>
              </Tooltip>
            ) : null}
          </div>

          {/* Expand chevron */}
          <div className="text-muted-foreground">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="px-4 pb-3 pt-0 border-t border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-3 text-xs">
              <Detail label="Version" value={app.version} />
              <Detail label="Publisher" value={app.publisher} />
              <Detail label="Install Location" value={app.install_location} />
              <Detail label="Install Date" value={formatDate(app.install_date)} />
              <Detail label="Size" value={formatSize(app.estimated_size_kb)} />
              <Detail label="Registry Key" value={app.registry_key} mono />
            </div>
            <div className="flex gap-2 mt-3">
              {app.uninstall_string && !app.is_orphan && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setConfirmDialog("uninstall")}
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Uninstall
                </Button>
              )}
              {app.is_orphan && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setConfirmDialog("remove")}
                >
                  <FolderX className="w-3 h-3 mr-1.5" />
                  Remove Registry Entry
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmDialog !== null} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog === "uninstall" ? "Uninstall" : "Remove Registry Entry"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog === "uninstall"
                ? `Are you sure you want to uninstall "${app.name}"? This will run the application's uninstaller.`
                : `Are you sure you want to remove the registry entry for "${app.name}"? This only removes the entry from Windows — it does not delete any files.`}
            </DialogDescription>
          </DialogHeader>
          {actionResult && (
            <div className={`text-sm px-3 py-2 rounded-md ${
              actionResult.success
                ? "bg-green-500/10 text-green-600"
                : "bg-destructive/10 text-destructive"
            }`}>
              {actionResult.message}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDialog && handleAction(confirmDialog)}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className={`truncate ${mono ? "font-mono text-[11px]" : ""}`} title={value}>
        {value}
      </span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr || "—";
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${year}-${month}-${day}`;
}

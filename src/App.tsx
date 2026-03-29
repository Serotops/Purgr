import { useEffect, useState, useCallback, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toolbar } from "@/components/Toolbar";
import { SortHeader } from "@/components/SortHeader";
import { AppRow } from "@/components/AppRow";
import { DiskAnalysis } from "@/components/DiskAnalysis";
import { ToastContainer, showToast } from "@/components/Toast";
import { useApps } from "@/hooks/useApps";
import { Titlebar } from "@/components/Titlebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, PackageX, Package, HardDrive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SortField } from "@/types";

type Tab = "apps" | "disk";

function formatSizeKb(kb: number): string {
  if (kb === 0) return "0 KB";
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("apps");
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    apps,
    loading,
    error,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    scan,
    uninstallApp,
    removeRegistryEntry,
    dismissAction,
    bulkRemoveOrphans,
    activeActions,
    stats,
  } = useApps();

  useEffect(() => {
    scan();
  }, [scan]);

  // Reset selection when list changes
  useEffect(() => {
    setSelectedIdx(-1);
  }, [apps.length, search, filterStatus]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (activeTab !== "apps" || apps.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, apps.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      }
    },
    [activeTab, apps.length]
  );

  // Global keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        input?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleBulkRemove = async () => {
    setBulkConfirm(false);
    await bulkRemoveOrphans();
    showToast(`Removed ${stats.orphans} orphan entries`, "success");
  };

  const showingFiltered = stats.filteredCount !== stats.total;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen flex flex-col bg-background" onKeyDown={handleKeyDown} tabIndex={-1}>
        <Titlebar />

        {/* Header */}
        <header className="flex-shrink-0 border-b bg-card/80 backdrop-blur-sm">
          <div className="px-5 pt-3 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
                <TabButton
                  active={activeTab === "apps"}
                  onClick={() => setActiveTab("apps")}
                  icon={<Package className="w-3.5 h-3.5" />}
                >
                  Installed Apps
                </TabButton>
                <TabButton
                  active={activeTab === "disk"}
                  onClick={() => setActiveTab("disk")}
                  icon={<HardDrive className="w-3.5 h-3.5" />}
                >
                  Disk Analysis
                </TabButton>
              </div>

              {/* Total size badge */}
              {activeTab === "apps" && stats.totalSizeKb > 0 && (
                <span className="text-[11px] text-muted-foreground/60 ml-auto">
                  {formatSizeKb(stats.totalSizeKb)} total
                </span>
              )}
            </div>

            {activeTab === "apps" && (
              <Toolbar
                search={search}
                onSearchChange={setSearch}
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
                onRefresh={scan}
                loading={loading}
                stats={stats}
              />
            )}
          </div>
        </header>

        {/* Content */}
        {activeTab === "apps" ? (
          <>
            {apps.length > 0 && (
              <SortHeader
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}
            {stats.orphans > 0 && filterStatus === "orphan" && (
              <div className="flex-shrink-0 border-b px-5 py-2 bg-destructive/5 flex items-center justify-between">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setBulkConfirm(true)}
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Remove All {stats.orphans} Orphan Entries
                </Button>
              </div>
            )}

            {/* Showing X of Y indicator */}
            {showingFiltered && apps.length > 0 && (
              <div className="flex-shrink-0 px-5 py-1 text-[11px] text-muted-foreground/50 border-b">
                Showing {stats.filteredCount} of {stats.total} apps
              </div>
            )}

            <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
              <div className="px-3 py-2 space-y-1">
                {loading && apps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="w-7 h-7 animate-spin mb-3 text-primary" />
                    <p className="text-sm">Scanning Windows registry...</p>
                    <p className="text-xs mt-1 text-muted-foreground/60">This may take a few seconds</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="text-destructive text-sm mb-3">{error}</div>
                    <Button variant="outline" size="sm" onClick={scan}>Retry</Button>
                  </div>
                ) : apps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <PackageX className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">
                      {search || filterStatus !== "all"
                        ? "No apps match your filters"
                        : "No apps found"}
                    </p>
                  </div>
                ) : (
                  apps.map((app, i) => (
                    <AppRow
                      key={app.registry_key}
                      app={app}
                      action={activeActions.get(app.registry_key)}
                      onUninstall={uninstallApp}
                      onRemoveEntry={removeRegistryEntry}
                      onDismiss={dismissAction}
                      selected={selectedIdx === i}
                      searchQuery={search}
                      maxSize={stats.totalSizeKb}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <DiskAnalysis />
        )}

        {/* Footer */}
        <footer className="flex-shrink-0 border-t bg-card/50 px-5 py-1.5 text-[11px] text-muted-foreground/70 flex items-center justify-between">
          <span>
            {loading
              ? "Scanning..."
              : stats.total > 0
              ? `${stats.total} apps \u00b7 ${stats.orphans} orphan${stats.orphans !== 1 ? "s" : ""}`
              : "Ready"}
          </span>
          <span className="text-muted-foreground/40">v0.1.0</span>
        </footer>

        {/* Bulk removal confirmation */}
        <Dialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove All Orphan Entries</DialogTitle>
              <DialogDescription>
                This will remove {stats.orphans} orphan registry entries. These are entries for apps that are no longer installed on your system. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleBulkRemove}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove {stats.orphans} Entries
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ToastContainer />
      </div>
    </TooltipProvider>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export default App;

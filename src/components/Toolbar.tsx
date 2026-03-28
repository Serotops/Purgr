import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Filter } from "lucide-react";
import type { FilterStatus } from "@/types";

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterStatus: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
  onRefresh: () => void;
  loading: boolean;
  stats: { total: number; orphans: number; installed: number };
}

export function Toolbar({
  search,
  onSearchChange,
  filterStatus,
  onFilterChange,
  onRefresh,
  loading,
  stats,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search + Refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search apps by name or publisher..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-9 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Scanning..." : "Refresh"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex gap-1">
          <FilterButton
            active={filterStatus === "all"}
            onClick={() => onFilterChange("all")}
          >
            All
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
              {stats.total}
            </Badge>
          </FilterButton>
          <FilterButton
            active={filterStatus === "installed"}
            onClick={() => onFilterChange("installed")}
          >
            Installed
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
              {stats.installed}
            </Badge>
          </FilterButton>
          <FilterButton
            active={filterStatus === "orphan"}
            onClick={() => onFilterChange("orphan")}
          >
            Orphans
            {stats.orphans > 0 ? (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                {stats.orphans}
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                0
              </Badge>
            )}
          </FilterButton>
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {children}
    </button>
  );
}

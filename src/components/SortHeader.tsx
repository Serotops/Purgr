import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { SortField, SortDirection } from "@/types";

interface SortHeaderProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export function SortHeader({ sortField, sortDirection, onSort }: SortHeaderProps) {
  const handleSort = (field: SortField) => {
    onSort(field);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground border-b">
      <div className="w-9" /> {/* Icon spacer */}
      <SortButton field="name" current={sortField} direction={sortDirection} onClick={handleSort} className="flex-1">
        Name
      </SortButton>
      <SortButton field="publisher" current={sortField} direction={sortDirection} onClick={handleSort} className="hidden sm:flex w-24 justify-end">
        Version
      </SortButton>
      <SortButton field="size" current={sortField} direction={sortDirection} onClick={handleSort} className="hidden md:flex w-20 justify-end">
        Size
      </SortButton>
      <div className="w-7" /> {/* Action spacer */}
      <div className="w-4" /> {/* Chevron spacer */}
    </div>
  );
}

function SortButton({
  field,
  current,
  direction,
  onClick,
  children,
  className = "",
}: {
  field: SortField;
  current: SortField;
  direction: SortDirection;
  onClick: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = current === field;
  return (
    <button
      onClick={() => onClick(field)}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        isActive ? "text-foreground font-medium" : ""
      } ${className}`}
    >
      {children}
      {isActive ? (
        direction === "asc" ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

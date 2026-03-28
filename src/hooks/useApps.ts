import { useState, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { InstalledApp, FilterStatus, SortField, SortDirection } from "@/types";

export function useApps() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<InstalledApp[]>("get_installed_apps");
      setApps(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const uninstallApp = useCallback(async (app: InstalledApp) => {
    try {
      const uninstallCmd = app.quiet_uninstall_string || app.uninstall_string;
      await invoke<string>("uninstall_app", { uninstallString: uninstallCmd });
      return { success: true, message: "Uninstall process launched" };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  }, []);

  const removeRegistryEntry = useCallback(async (app: InstalledApp) => {
    try {
      await invoke<string>("remove_registry_entry", { registryKey: app.registry_key });
      setApps((prev) => prev.filter((a) => a.registry_key !== app.registry_key));
      return { success: true, message: "Registry entry removed" };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  }, []);

  const filteredApps = useMemo(() => {
    let result = apps;

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          app.publisher.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filterStatus === "orphan") {
      result = result.filter((app) => app.is_orphan);
    } else if (filterStatus === "installed") {
      result = result.filter((app) => !app.is_orphan);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "publisher":
          cmp = a.publisher.localeCompare(b.publisher);
          break;
        case "size":
          cmp = a.estimated_size_kb - b.estimated_size_kb;
          break;
        case "status":
          cmp = Number(a.is_orphan) - Number(b.is_orphan);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [apps, search, filterStatus, sortField, sortDirection]);

  const stats = useMemo(() => {
    const total = apps.length;
    const orphans = apps.filter((a) => a.is_orphan).length;
    const installed = total - orphans;
    return { total, orphans, installed };
  }, [apps]);

  return {
    apps: filteredApps,
    allApps: apps,
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
    stats,
  };
}

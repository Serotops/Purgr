import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { DriveInfo, DirEntry } from "@/types";

export function useDiskScan() {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState<DirEntry | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState<"idle" | "shallow" | "deep">("idle");
  const [loadingDrives, setLoadingDrives] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<DirEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");

  // Listen for progressive scan events
  useEffect(() => {
    const unlistenShallow = listen<DirEntry>("scan-shallow", (event) => {
      setScanPhase("deep");
      setCurrentEntry(event.payload);
      setBreadcrumb([event.payload]);
    });

    const unlistenProgress = listen<{ percent: number; message: string }>(
      "scan-progress",
      (event) => {
        setProgress(event.payload.percent);
        setProgressMsg(event.payload.message);
      }
    );

    const unlistenComplete = listen<DirEntry>("scan-complete", (event) => {
      setScanPhase("idle");
      setScanning(false);
      setProgress(100);
      setCurrentEntry(event.payload);
      setBreadcrumb([event.payload]);
    });

    return () => {
      unlistenShallow.then((fn) => fn());
      unlistenProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, []);

  const fetchDrives = useCallback(async () => {
    setLoadingDrives(true);
    try {
      const result = await invoke<DriveInfo[]>("list_drives");
      setDrives(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingDrives(false);
    }
  }, []);

  const scanDrive = useCallback(async (driveLetter: string) => {
    setScanning(true);
    setScanPhase("shallow");
    setError(null);
    setCurrentEntry(null);
    setBreadcrumb([]);
    setSelectedDrive(driveLetter);
    setProgress(0);
    setProgressMsg("");

    try {
      // This triggers the progressive scan — results come via events
      await invoke("scan_drive_progressive", { driveLetter });
    } catch (e) {
      setError(String(e));
      setScanning(false);
      setScanPhase("idle");
    }
  }, []);

  const drillDown = useCallback(async (entry: DirEntry) => {
    if (!entry.is_dir) return;

    // If entry already has children with their own children, just navigate
    const hasDeepChildren = entry.children.some(
      (c) => c.is_dir && c.children.length > 0
    );
    if (hasDeepChildren) {
      setBreadcrumb((prev) => [...prev, entry]);
      setCurrentEntry(entry);
      return;
    }

    // Otherwise scan deeper
    setScanning(true);
    try {
      const result = await invoke<DirEntry>("scan_directory", {
        path: entry.path,
        maxDepth: 3,
      });
      setBreadcrumb((prev) => [...prev, result]);
      setCurrentEntry(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setScanning(false);
    }
  }, []);

  const navigateTo = useCallback(
    (index: number) => {
      setBreadcrumb((prev) => {
        const next = prev.slice(0, index + 1);
        setCurrentEntry(next[next.length - 1] || null);
        return next;
      });
    },
    []
  );

  return {
    drives,
    selectedDrive,
    currentEntry,
    breadcrumb,
    scanning,
    scanPhase,
    loadingDrives,
    error,
    fetchDrives,
    scanDrive,
    drillDown,
    navigateTo,
    progress,
    progressMsg,
  };
}

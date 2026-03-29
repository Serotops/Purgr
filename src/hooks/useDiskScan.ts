import { useState, useCallback, useEffect, useRef } from "react";
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

  // Track which drive is expected — ignore events from stale scans
  const expectedDriveRef = useRef<string | null>(null);

  useEffect(() => {
    const unlistenShallow = listen<DirEntry>("scan-shallow", (event) => {
      // Check if this result matches the drive we're currently waiting for
      const rootName = event.payload.name;
      if (expectedDriveRef.current && !rootName.startsWith(expectedDriveRef.current)) return;
      setScanPhase("deep");
    });

    const unlistenProgress = listen<{ percent: number; message: string }>(
      "scan-progress",
      (event) => {
        // Progress events don't carry drive info, but if we've switched drives
        // the state was already reset, so stale progress just gets overwritten
        setProgress(event.payload.percent);
        setProgressMsg(event.payload.message);
      }
    );

    const unlistenComplete = listen<DirEntry>("scan-complete", (event) => {
      const rootName = event.payload.name;
      if (expectedDriveRef.current && !rootName.startsWith(expectedDriveRef.current)) return;
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
    // Set expected drive so event listeners ignore results from previous scans
    expectedDriveRef.current = driveLetter;

    setScanning(true);
    setScanPhase("shallow");
    setError(null);
    setCurrentEntry(null);
    setBreadcrumb([]);
    setSelectedDrive(driveLetter);
    setProgress(0);
    setProgressMsg("");

    try {
      await invoke("scan_drive_progressive", { driveLetter });
    } catch (e) {
      // Only show error if this drive is still selected
      if (expectedDriveRef.current === driveLetter) {
        setError(String(e));
        setScanning(false);
        setScanPhase("idle");
      }
    }
  }, []);

  const drillDown = useCallback(async (entry: DirEntry) => {
    if (!entry.is_dir) return;

    const addToBreadcrumb = (e: DirEntry) => {
      setBreadcrumb((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.path === e.path) return prev;

        const existingIdx = prev.findIndex((b) => b.path === e.path);
        if (existingIdx >= 0) {
          const trimmed = prev.slice(0, existingIdx + 1);
          trimmed[existingIdx] = e;
          return trimmed;
        }

        return [...prev, e];
      });
      setCurrentEntry(e);
    };

    const hasDeepChildren = entry.children.some(
      (c) => c.is_dir && c.children.length > 0
    );
    if (hasDeepChildren) {
      addToBreadcrumb(entry);
      return;
    }

    setScanning(true);
    try {
      const result = await invoke<DirEntry>("scan_directory", {
        path: entry.path,
        maxDepth: 3,
      });
      addToBreadcrumb(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setScanning(false);
    }
  }, []);

  const navigateTo = useCallback((index: number) => {
    setBreadcrumb((prev) => {
      const next = prev.slice(0, index + 1);
      setCurrentEntry(next[next.length - 1] || null);
      return next;
    });
  }, []);

  const removeEntry = useCallback((deletedPath: string, deletedSize: number) => {
    const removeFromTree = (node: DirEntry): DirEntry => {
      const hadDirectChild = node.children.some((c) => c.path === deletedPath);
      const newChildren = node.children
        .filter((c) => c.path !== deletedPath)
        .map((c) => (c.is_dir ? removeFromTree(c) : c));

      let newSize = node.size;
      if (hadDirectChild) {
        newSize -= deletedSize;
      } else {
        const oldChildTotal = node.children.reduce((s, c) => s + c.size, 0);
        const newChildTotal = newChildren.reduce((s, c) => s + c.size, 0);
        newSize -= oldChildTotal - newChildTotal;
      }

      return { ...node, children: newChildren, size: Math.max(0, newSize) };
    };

    setBreadcrumb((prev) => {
      const updated = prev.map((entry) => removeFromTree(entry));
      const last = updated[updated.length - 1];
      if (last) setCurrentEntry(last);
      return updated;
    });
  }, []);

  const rescanCurrent = useCallback(async () => {
    const current = breadcrumb[breadcrumb.length - 1];
    if (!current?.path) return;

    setScanning(true);
    try {
      const result = await invoke<DirEntry>("scan_directory", {
        path: current.path,
        maxDepth: 3,
      });
      setBreadcrumb((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = result;
        return updated;
      });
      setCurrentEntry(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setScanning(false);
    }
  }, [breadcrumb]);

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
    removeEntry,
    rescanCurrent,
  };
}

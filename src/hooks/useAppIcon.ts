import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

const iconCache = new Map<string, string | null>();
const pendingRequests = new Set<string>();

export function useAppIcon(iconPath: string): string | null {
  const [icon, setIcon] = useState<string | null>(
    iconCache.get(iconPath) ?? null
  );

  useEffect(() => {
    // Already cached
    const cached = iconCache.get(iconPath);
    if (cached !== undefined) {
      if (cached !== icon) setIcon(cached);
      return;
    }

    // Already loading
    if (!iconPath || pendingRequests.has(iconPath)) return;

    pendingRequests.add(iconPath);

    invoke<string | null>("get_app_icon", { iconPath }).then((result) => {
      iconCache.set(iconPath, result);
      pendingRequests.delete(iconPath);
      setIcon(result);
    }).catch(() => {
      iconCache.set(iconPath, null);
      pendingRequests.delete(iconPath);
    });
  }, [iconPath]); // eslint-disable-line react-hooks/exhaustive-deps

  return icon;
}

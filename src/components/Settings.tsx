import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sun, Moon, Monitor, ExternalLink, Shield } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  return (localStorage.getItem("purgr-theme") as Theme) || "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
  localStorage.setItem("purgr-theme", theme);
}

// Apply theme on load (before React renders)
applyTheme(getStoredTheme());

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return { theme, setTheme };
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function SettingsDialog({ open, onOpenChange, theme, onThemeChange }: SettingsDialogProps) {
  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
    { value: "system", label: "System", icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Theme</label>
            <div className="flex gap-1.5">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => onThemeChange(t.value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    theme === t.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* About */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-500/20">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Purgr</p>
                <p className="text-[11px] text-muted-foreground">v0.1.0</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              A modern Windows app manager and disk analyzer. Clean up installed apps, remove orphan registry entries, and visualize disk usage.
            </p>
            <div className="flex flex-col gap-1.5">
              <LinkButton
                label="Source Code"
                href="https://github.com/Serotops/purgr"
              />
              <LinkButton
                label="Report an Issue"
                href="https://github.com/Serotops/purgr/issues"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-3">
              Made by{" "}
              <button
                onClick={() => openUrl("https://github.com/Serotops")}
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                Serotops
              </button>
              {" "}&middot; Built with Tauri + React + Rust
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkButton({ label, href }: { label: string; href: string }) {
  return (
    <button
      onClick={() => openUrl(href)}
      className="flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150"
    >
      {label}
      <ExternalLink className="w-3 h-3" />
    </button>
  );
}

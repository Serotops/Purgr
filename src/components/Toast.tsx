import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
let addToastFn: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "info") {
  addToastFn?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-12 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg shadow-lg border toast-animate-in"
          style={{
            background: "var(--popover)",
            borderColor: toast.type === "success" ? "rgba(34,197,94,0.3)"
              : toast.type === "error" ? "rgba(239,68,68,0.3)"
              : "var(--border)",
          }}
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
          {toast.type === "error" && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          {toast.type === "info" && <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />}
          <span className="text-xs text-foreground max-w-[280px]">{toast.message}</span>
          <button
            className="text-muted-foreground hover:text-foreground ml-1 flex-shrink-0"
            onClick={() => dismiss(toast.id)}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

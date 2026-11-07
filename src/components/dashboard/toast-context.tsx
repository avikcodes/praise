"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastContextType = {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, description }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, description };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast],
  );

  const toast = {
    success: (title: string, description?: string) =>
      addToast({ type: "success", title, description }),
    error: (title: string, description?: string) =>
      addToast({ type: "error", title, description }),
    info: (title: string, description?: string) =>
      addToast({ type: "info", title, description }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 bg-white",
              t.type === "success" && "border-emerald-200 text-ink-900",
              t.type === "error" && "border-rose-200 text-ink-900",
              t.type === "info" && "border-brand-200 text-ink-900",
            )}
          >
            {t.type === "success" && (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            )}
            {t.type === "error" && (
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            {t.type === "info" && (
              <Info size={18} className="text-brand-600 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink-900">{t.title}</p>
              {t.description && (
                <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-ink-400 hover:text-ink-700 p-0.5 rounded transition-colors"
              aria-label="Dismiss toast"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ToastNotification } from "@/components/toast-notification";
import {
  CITYZEN_TOAST_EVENT,
  type ToastEventDetail,
} from "@/lib/toast/events";

type ToastItem = ToastEventDetail & {
  id: string;
};

const MAX_TOASTS = 4;

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastEventDetail>).detail;
      if (!detail?.message?.trim()) return;

      const item: ToastItem = {
        ...detail,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };

      // Add new toasts to the top of the stack
      setToasts((prev) => [item, ...prev].slice(0, MAX_TOASTS));
    };

    window.addEventListener(CITYZEN_TOAST_EVENT, onToast as EventListener);
    return () => {
      window.removeEventListener(CITYZEN_TOAST_EVENT, onToast as EventListener);
    };
  }, []);

  const hasToasts = useMemo(() => toasts.length > 0, [toasts.length]);
  
  // We don't return null early anymore so AnimatePresence can handle the exit 
  // animation of the very last toast.
  
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[130] flex flex-col items-center gap-3 p-4 sm:items-end sm:p-6 sm:right-0 sm:left-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            // Initial mount state
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            // Visible state
            animate={{ opacity: 1, y: 0, scale: 1 }}
            // Exit state
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            // Spring physics for a premium, snappy feel
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              mass: 0.8,
            }}
            className="pointer-events-auto w-full max-w-sm drop-shadow-xl"
          >
            <ToastNotification
              type={toast.type}
              title={toast.title}
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
"use client";

import { useEffect } from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  X 
} from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastNotificationProps {
  type?: ToastType;
  title?: string;
  message: string;
  onClose: () => void;
}

const AUTO_CLOSE_DELAY_MS = 5000;

const toastStyles: Record<ToastType, { icon: React.ElementType; colorClass: string; bgClass: string }> = {
  success: {
    icon: CheckCircle2,
    colorClass: "text-emerald-500 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
  },
  error: {
    icon: AlertCircle,
    colorClass: "text-rose-500 dark:text-rose-400",
    bgClass: "bg-rose-500/10",
  },
  warning: {
    icon: AlertTriangle,
    colorClass: "text-amber-500 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
  },
  info: {
    icon: Info,
    colorClass: "text-blue-500 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
  },
};

export function ToastNotification({ type = "info", title, message, onClose }: ToastNotificationProps) {
  const { icon: Icon, colorClass, bgClass } = toastStyles[type];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [onClose]);

  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl",
        "border border-black/5 bg-white/80 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        "backdrop-blur-xl transition-all",
        // Dark mode styles
        "dark:border-white/10 dark:bg-zinc-900/80 dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
      )}
    >
      {/* Icon Container with subtle glowing background */}
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", bgClass)}>
        <Icon className={cn("h-5 w-5", colorClass)} strokeWidth={2.5} />
      </div>

      {/* Text Content */}
      <div className="flex flex-1 flex-col pt-0.5">
        {title && (
          <h3 className="mb-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
        )}
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {message}
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          "text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-900",
          "dark:hover:bg-white/10 dark:hover:text-zinc-100"
        )}
        aria-label="Close notification"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
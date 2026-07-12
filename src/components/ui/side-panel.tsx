"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accentGradient?: string; // tailwind "from-X to-Y"
  width?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const WIDTH: Record<NonNullable<Props["width"]>, string> = {
  sm: "w-full sm:w-[380px]",
  md: "w-full sm:w-[440px]",
  lg: "w-full sm:w-[520px]",
};

export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  icon,
  accentGradient = "from-primary to-primary",
  width = "md",
  children,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 bg-background border-l flex flex-col shadow-2xl transition-transform duration-300 ease-out",
          WIDTH[width],
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-gradient-to-r from-primary/5 to-primary/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm shrink-0",
                accentGradient
              )}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">{title}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}

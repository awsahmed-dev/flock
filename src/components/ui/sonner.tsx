"use client"

import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle as CircleCheckIcon, Info as InfoIcon, Warning as TriangleAlertIcon, WarningOctagon as OctagonXIcon, CircleNotch as Loader2Icon } from "@phosphor-icons/react/dist/ssr"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  // Sprint 3 FIX-2 (BUG-15): sonner v2 cannot dismiss toasts in a hidden
  // window — its timers pause on document.hidden AND its Toaster processes
  // dismiss events inside requestAnimationFrame, which hidden windows never
  // run (verified on prod: toast.dismiss() fired, data-removed stayed
  // false). Keying the Toaster to the pathname remounts it on every route
  // change: React unmounts the old toast DOM synchronously (no rAF), the
  // fresh Toaster starts empty, and past ToastState events never replay.
  const pathname = usePathname()

  return (
    <Sonner
      key={pathname}
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

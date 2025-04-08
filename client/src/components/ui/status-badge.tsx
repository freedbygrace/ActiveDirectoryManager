import React from "react";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: "connected" | "disconnected" | "success" | "error" | "warning" | "info";
  children: React.ReactNode;
  className?: string;
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const statusStyles = {
    connected: "bg-green-100 text-green-800 before:bg-green-500",
    disconnected: "bg-red-100 text-red-800 before:bg-red-500",
    success: "bg-green-100 text-green-800 before:bg-green-500",
    error: "bg-red-100 text-red-800 before:bg-red-500",
    warning: "bg-amber-100 text-amber-800 before:bg-amber-500",
    info: "bg-blue-100 text-blue-800 before:bg-blue-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium before:mr-1 before:h-2 before:w-2 before:rounded-full before:content-['']",
        statusStyles[status],
        className
      )}
    >
      {children}
    </span>
  );
}

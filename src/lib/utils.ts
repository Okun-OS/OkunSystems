import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: "text-green-400",
    COMPLETED: "text-green-400",
    DONE: "text-green-400",
    IN_PROGRESS: "text-blue-400",
    PLANNING: "text-blue-400",
    SCHEDULED: "text-blue-400",
    PENDING: "text-yellow-400",
    ONBOARDING: "text-yellow-400",
    PAUSED: "text-yellow-400",
    CANCELLED: "text-red-400",
    CLOSED: "text-red-400",
    INACTIVE: "text-gray-400",
    OPEN: "text-orange-400",
    RESOLVED: "text-green-400",
  };
  return statusMap[status] ?? "text-gray-400";
}

export function getPriorityColor(priority: string): string {
  const priorityMap: Record<string, string> = {
    CRITICAL: "text-red-400",
    HIGH: "text-orange-400",
    MEDIUM: "text-yellow-400",
    LOW: "text-green-400",
  };
  return priorityMap[priority] ?? "text-gray-400";
}

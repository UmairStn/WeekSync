import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApiError } from "./api-client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(
  err: unknown,
  defaultMessage = "An error occurred"
): string {
  if (
    err instanceof ApiError &&
    typeof err.data === "object" &&
    err.data !== null
  ) {
    const data = err.data as { detail?: string; message?: string };
    return data.detail || data.message || defaultMessage;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return defaultMessage;
}

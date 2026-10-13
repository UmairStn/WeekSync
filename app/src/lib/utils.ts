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
    const data = err.data as Record<string, unknown>;
    const detail = data["detail"];
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (
        typeof first === "object" &&
        first !== null &&
        "msg" in first &&
        typeof (first as { msg: unknown })["msg"] === "string"
      ) {
        return (first as { msg: string })["msg"];
      }
      if (typeof first === "string" && first.length > 0) {
        return first;
      }
    }
    if (typeof detail === "string" && detail.length > 0) {
      return detail;
    }
    const message = data["message"];
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  if (err instanceof TypeError) {
    return "Network error. Please check your connection and try again.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return defaultMessage;
}

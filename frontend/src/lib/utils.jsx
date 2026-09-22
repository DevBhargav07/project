import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Used by every shadcn component to merge conditional Tailwind classes
// without conflicts (e.g. combining a default "px-4" with an override "px-2").
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

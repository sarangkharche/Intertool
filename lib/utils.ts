import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Display a clean author name — strips domain from email-based authors (Google users) */
export function displayAuthor(author: string): string {
  if (author.includes("@")) {
    return author.split("@")[0];
  }
  return author;
}

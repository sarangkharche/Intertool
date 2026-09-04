import { cn } from "@/lib/utils";

export function TransitionArrow({ className }: { className?: string }) {
  return (
    <span className={cn("t-learn-chevron", className)} aria-hidden="true">
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        className="size-full"
      >
        <path d="M2.5 8h8" />
        <path className="t-learn-arm t-learn-arm-top" d="M7 4.5 10.5 8" />
        <path className="t-learn-arm t-learn-arm-bot" d="M10.5 8 7 11.5" />
      </svg>
    </span>
  );
}

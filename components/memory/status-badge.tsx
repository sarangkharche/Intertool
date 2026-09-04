import type {
  MemoryConfidence,
  MemoryStatus,
  MemoryType,
} from "@/lib/memory-types";
import { cn } from "@/lib/utils";

const typeStyles: Record<MemoryType, string> = {
  warning: "border-warning/30 bg-warning/10 text-warning-foreground",
  decision: "border-primary/25 bg-primary/8 text-primary",
  convention: "border-border bg-muted/50 text-foreground",
  discovery: "border-discovery/25 bg-discovery/10 text-discovery-foreground",
  ownership:
    "border-information/25 bg-information/10 text-information-foreground",
  runbook: "border-border bg-surface text-muted-foreground",
};

export function MemoryTypeBadge({ type }: { type: MemoryType }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        typeStyles[type]
      )}
    >
      {type}
    </span>
  );
}

export function MemoryStatusBadge({ status }: { status: MemoryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        status === "published" && "text-foreground",
        status === "draft" && "text-muted-foreground",
        status === "disputed" && "text-destructive",
        status === "archived" && "text-muted-foreground line-through"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "published" && "bg-success",
          status === "draft" && "bg-muted-foreground/50",
          status === "disputed" && "bg-destructive",
          status === "archived" && "bg-muted-foreground/30"
        )}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

export function ConfidenceBadge({
  confidence,
}: {
  confidence: MemoryConfidence;
}) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
      {confidence}
    </span>
  );
}

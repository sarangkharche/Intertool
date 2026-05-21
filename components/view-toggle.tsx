"use client";

import { LayoutGrid, List } from "lucide-react";
import { usePreferences } from "@/lib/use-preferences";

export function ViewToggle() {
  const [prefs, setPreference] = usePreferences();

  return (
    <div className="inline-flex rounded-md border border-border">
      <button
        onClick={() => setPreference("defaultView", "grid")}
        aria-label="Grid view"
        aria-pressed={prefs.defaultView === "grid"}
        className={`flex h-10 w-10 items-center justify-center rounded-l-md transition-colors duration-100 focus-ring ${
          prefs.defaultView === "grid"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        onClick={() => setPreference("defaultView", "list")}
        aria-label="List view"
        aria-pressed={prefs.defaultView === "list"}
        className={`flex h-10 w-10 items-center justify-center rounded-r-md transition-colors duration-100 focus-ring ${
          prefs.defaultView === "list"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <List className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

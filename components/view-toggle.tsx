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
        className={`flex items-center justify-center rounded-l-md p-1.5 transition-colors duration-100 ${
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
        className={`flex items-center justify-center rounded-r-md p-1.5 transition-colors duration-100 ${
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

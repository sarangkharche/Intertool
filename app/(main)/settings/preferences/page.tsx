"use client";

import { useTheme } from "next-themes";
import { usePreferences, UserPreferences } from "@/lib/use-preferences";
import { Sun, Moon, Monitor, LayoutDashboard, Search } from "lucide-react";

const ACCENT_COLORS: { value: UserPreferences["accentColor"]; label: string; class: string }[] = [
  { value: "blue", label: "Blue", class: "bg-[oklch(0.545_0.195_260)]" },
  { value: "violet", label: "Violet", class: "bg-[oklch(0.55_0.2_290)]" },
  { value: "green", label: "Green", class: "bg-[oklch(0.55_0.17_155)]" },
  { value: "orange", label: "Orange", class: "bg-[oklch(0.65_0.18_55)]" },
  { value: "rose", label: "Rose", class: "bg-[oklch(0.55_0.2_10)]" },
];

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const [prefs, setPreference] = usePreferences();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg text-display">Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize how intertool looks and behaves for you.
        </p>
      </div>

      {/* Appearance */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Appearance</p>
        </div>
        <div className="space-y-5 p-4">
          {/* Theme */}
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Theme</label>
            <div className="inline-flex rounded-md border border-border">
              {[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors duration-100 first:rounded-l-md last:rounded-r-md ${
                    theme === opt.value
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <opt.icon className="h-3 w-3" aria-hidden="true" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Accent color</label>
            <p className="mb-3 text-[11px] text-muted-foreground/60">
              Tints buttons, links, and focus rings.
            </p>
            <div className="flex items-center gap-2.5">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setPreference("accentColor", color.value)}
                  aria-label={color.label}
                  className={`h-6 w-6 rounded-full ${color.class} transition-all duration-100 ${
                    prefs.accentColor === color.value
                      ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                      : "hover:scale-110"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Display */}
      <div className="mt-4 rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Display</p>
        </div>
        <div className="space-y-5 p-4">
          {/* Density */}
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Density</label>
            <p className="mb-3 text-[11px] text-muted-foreground/60">
              Adjusts spacing in skill cards and lists.
            </p>
            <div className="inline-flex rounded-md border border-border">
              {(["compact", "comfortable"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPreference("density", opt)}
                  className={`px-3 py-1.5 text-xs capitalize transition-colors duration-100 first:rounded-l-md last:rounded-r-md ${
                    prefs.density === opt
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Default view */}
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Default view</label>
            <p className="mb-3 text-[11px] text-muted-foreground/60">
              How skills appear on the dashboard.
            </p>
            <div className="inline-flex rounded-md border border-border">
              {(["grid", "list"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPreference("defaultView", opt)}
                  className={`px-3 py-1.5 text-xs capitalize transition-colors duration-100 first:rounded-l-md last:rounded-r-md ${
                    prefs.defaultView === opt
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <div className="mt-4 rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Dashboard</p>
        </div>
        <div className="space-y-5 p-4">
          {/* Default tab */}
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Default tab</label>
            <p className="mb-3 text-[11px] text-muted-foreground/60">
              Which tab opens when you visit the dashboard.
            </p>
            <div className="inline-flex flex-wrap rounded-md border border-border">
              {([
                { value: "all", label: "All" },
                { value: "skill", label: "Skills" },
                { value: "mcp-server", label: "MCP Servers" },
                { value: "agent-tool", label: "Agents" },
                { value: "prompt-template", label: "Prompts" },
                { value: "mine", label: "Yours" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPreference("defaultTab", opt.value)}
                  className={`px-3 py-1.5 text-xs transition-colors duration-100 first:rounded-l-md last:rounded-r-md ${
                    prefs.defaultTab === opt.value
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default sort */}
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Default sort</label>
            <div className="inline-flex rounded-md border border-border">
              {(["newest", "name"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPreference("defaultSort", opt)}
                  className={`px-3 py-1.5 text-xs capitalize transition-colors duration-100 first:rounded-l-md last:rounded-r-md ${
                    prefs.defaultSort === opt
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Items per page */}
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Items per page</label>
            <div className="inline-flex rounded-md border border-border">
              {([12, 24, 48] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPreference("itemsPerPage", opt)}
                  className={`px-3 py-1.5 text-xs transition-colors duration-100 first:rounded-l-md last:rounded-r-md ${
                    prefs.itemsPerPage === opt
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-4 rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Navigation</p>
        </div>
        <div className="space-y-5 p-4">
          <div>
            <label className="mb-2 block text-xs text-muted-foreground">Default landing page</label>
            <p className="mb-3 text-[11px] text-muted-foreground/60">
              Where to go after signing in.
            </p>
            <div className="inline-flex rounded-md border border-border">
              {([
                { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { value: "search", label: "Search", icon: Search },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPreference("landingPage", opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors duration-100 first:rounded-l-md last:rounded-r-md ${
                    prefs.landingPage === opt.value
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <opt.icon className="h-3 w-3" aria-hidden="true" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

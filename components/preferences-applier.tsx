"use client";

import { useEffect } from "react";
import { usePreferences } from "@/lib/use-preferences";

export function PreferencesApplier() {
  const [prefs] = usePreferences();

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.accentColor !== "blue") {
      root.setAttribute("data-accent", prefs.accentColor);
    } else {
      root.removeAttribute("data-accent");
    }
  }, [prefs.accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.density === "compact") {
      root.setAttribute("data-density", "compact");
    } else {
      root.removeAttribute("data-density");
    }
  }, [prefs.density]);

  return null;
}

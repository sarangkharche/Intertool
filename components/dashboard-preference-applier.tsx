"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePreferences } from "@/lib/use-preferences";

export function DashboardPreferenceApplier() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prefs] = usePreferences();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    // Only apply if the URL has no explicit search params (fresh navigation)
    if (searchParams.toString()) return;

    const params = new URLSearchParams();

    if (prefs.defaultTab === "mine") {
      params.set("mine", "true");
    } else if (prefs.defaultTab !== "all") {
      params.set("type", prefs.defaultTab);
    }

    if (prefs.defaultSort !== "newest") {
      params.set("sort", prefs.defaultSort);
    }

    if (prefs.itemsPerPage !== 24) {
      params.set("limit", String(prefs.itemsPerPage));
    }

    const qs = params.toString();
    if (qs) {
      applied.current = true;
      router.replace(`/dashboard?${qs}`);
    }
  }, [prefs, searchParams, router]);

  return null;
}

"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "intertool:publish-draft";
const DEBOUNCE_MS = 1000;

export interface DraftState {
  type: string;
  name: string;
  slug: string;
  description: string;
  readme: string;
  category: string;
  tags: string[];
  compatibility: string[];
  sourceUrl: string;
  sourceFormat: string;
  transport: string;
  savedAt: number;
}

export function useDraftPersistence(
  getState: () => Omit<DraftState, "savedAt">,
  restoreState: (draft: DraftState) => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  // Restore draft on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftState;
      // Only restore if draft has meaningful content and is < 7 days old
      const hasContent = draft.name || draft.readme || draft.description;
      const isRecent = Date.now() - draft.savedAt < 7 * 86_400_000;
      if (hasContent && isRecent) {
        restoreState(draft);
        toast("Draft restored", {
          action: {
            label: "Discard",
            onClick: () => {
              localStorage.removeItem(STORAGE_KEY);
              window.location.reload();
            },
          },
        });
      }
    } catch {
      // Ignore corrupted data
    }
  }, [restoreState]);

  // Debounced save
  const saveDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const state = getState();
        const hasContent = state.name || state.readme || state.description;
        if (hasContent) {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...state, savedAt: Date.now() }),
          );
        }
      } catch {
        // localStorage full or unavailable
      }
    }, DEBOUNCE_MS);
  }, [getState]);

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { saveDraft, clearDraft };
}

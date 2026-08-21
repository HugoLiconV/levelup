'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MEAL_TAGS, type MealTag } from '../lib/levelup';

type MealTagSuggestionsOptions = {
  description: string;
  onSuggested: (tags: MealTag[]) => void;
};

export function useMealTagSuggestions({
  description,
  onSuggested
}: MealTagSuggestionsOptions) {
  const [suggesting, setSuggesting] = useState(false);
  const suggestedForRef = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const firedRef = useRef(false);
  const onSuggestedRef = useRef(onSuggested);

  useEffect(() => {
    onSuggestedRef.current = onSuggested;
  }, [onSuggested]);

  const fireSuggestion = useCallback(async (text: string) => {
    if (text.length < 8 || text === suggestedForRef.current) return;
    firedRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSuggesting(true);
    try {
      const response = await fetch('/api/meal-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
        signal: controller.signal
      });
      if (!response.ok) return;
      const data = (await response.json()) as { tags?: MealTag[] };
      if (controller.signal.aborted) return;
      suggestedForRef.current = text;
      onSuggestedRef.current(
        (data.tags ?? []).filter(item => MEAL_TAGS.includes(item))
      );
    } catch {
      // Network error or aborted request — manual tagging still works.
    } finally {
      if (abortRef.current === controller) setSuggesting(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    firedRef.current = false;
    const text = description.trim();
    if (text.length < 8 || text === suggestedForRef.current) return;
    debounceRef.current = window.setTimeout(() => {
      void fireSuggestion(text);
    }, 900);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [description, fireSuggestion]);

  const requestSuggestion = () => {
    const text = description.trim();
    if (text.length < 8 || firedRef.current || text === suggestedForRef.current)
      return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    void fireSuggestion(text);
  };

  return { suggesting, requestSuggestion };
}

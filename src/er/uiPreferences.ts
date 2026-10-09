"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
export type UiLanguage = "en" | "ur" | "roman";

const PREFERENCE_EVENT = "er-preference-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PREFERENCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PREFERENCE_EVENT, onStoreChange);
  };
}

function getTheme(): Theme {
  return window.localStorage.getItem("er-theme") === "dark" ? "dark" : "light";
}

function getLanguage(): UiLanguage {
  const saved = window.localStorage.getItem("er-language");
  return saved === "ur" || saved === "roman" ? saved : "en";
}

export function useUiPreferences() {
  const theme = useSyncExternalStore<Theme>(subscribe, getTheme, () => "light");
  const language = useSyncExternalStore<UiLanguage>(subscribe, getLanguage, () => "en");

  function changeTheme(next: Theme) {
    window.localStorage.setItem("er-theme", next);
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  }

  function changeLanguage(next: UiLanguage) {
    window.localStorage.setItem("er-language", next);
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  }

  return { theme, language, changeTheme, changeLanguage };
}

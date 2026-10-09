"use client";

import { UI_COPY } from "@/er/uiCopy";
import type { Theme, UiLanguage } from "@/er/uiPreferences";

export type DashboardWindow = "overview" | "patients" | "resources" | "evidence";

type Props = {
  activeWindow: DashboardWindow;
  theme: Theme;
  language: UiLanguage;
  onWindow: (window: DashboardWindow) => void;
  onTheme: (theme: Theme) => void;
  onLanguage: (language: UiLanguage) => void;
  onNewPatient: () => void;
};

const WINDOWS: DashboardWindow[] = ["overview", "patients", "resources", "evidence"];
const LANGUAGE_ORDER: UiLanguage[] = ["en", "ur", "roman"];
const LANGUAGE_LABEL: Record<UiLanguage, string> = { en: "EN", ur: "اردو", roman: "Roman" };

export function DashboardHeader(props: Props) {
  const copy = UI_COPY[props.language];
  const nextLanguage = LANGUAGE_ORDER[(LANGUAGE_ORDER.indexOf(props.language) + 1) % LANGUAGE_ORDER.length];

  return (
    <header className="border-b border-black/10 bg-[#FFEFB4] text-black dark:border-white/10 dark:bg-black dark:text-white">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center gap-3">
          <button type="button" onClick={() => props.onWindow("overview")} className="flex min-w-0 items-center gap-2.5 text-left">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#353A96] text-xs font-bold text-white">ER</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight">ER Command</span>
              <span className="block truncate text-[9px] font-semibold text-black/55 dark:text-white/50">{copy.subtitle}</span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => props.onLanguage(nextLanguage)} className={`min-w-12 rounded-lg border border-black/15 bg-white/40 px-2 py-2 text-[10px] font-bold dark:border-white/15 dark:bg-white/5 ${props.language === "ur" ? "font-urdu" : ""}`} aria-label={`Change language from ${LANGUAGE_LABEL[props.language]}`}>
              {LANGUAGE_LABEL[props.language]}
            </button>
            <button type="button" onClick={() => props.onTheme(props.theme === "light" ? "dark" : "light")} className="grid size-9 place-items-center rounded-lg border border-black/15 bg-white/40 dark:border-white/15 dark:bg-white/5" aria-label={props.theme === "light" ? "Use dark mode" : "Use light mode"}>
              {props.theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            <button type="button" onClick={props.onNewPatient} className="grid size-9 place-items-center rounded-lg bg-black text-base font-bold text-white dark:bg-[#FFEFB4] dark:text-black sm:flex sm:size-auto sm:px-3.5 sm:py-2.5 sm:text-xs" aria-label={copy.newPatient}><span aria-hidden="true">+</span><span className="hidden sm:inline">{copy.newPatient}</span></button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-black/10 py-2 dark:border-white/10" aria-label="Dashboard windows">
          {WINDOWS.map((window) => (
            <button key={window} type="button" onClick={() => props.onWindow(window)} aria-pressed={props.activeWindow === window} className={`min-w-20 flex-1 rounded-lg px-2 py-2 text-[10px] font-bold transition sm:px-3 sm:text-xs ${props.activeWindow === window ? "bg-[#353A96] text-white shadow-sm" : "text-black/55 hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/5"}`}>
              {copy[window]}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
}

function MoonIcon() {
  return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z"/></svg>;
}

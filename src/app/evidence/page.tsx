"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { evidence } from "@/er/evidence";
import { useUiPreferences } from "@/er/uiPreferences";

const COPY = {
  en: {
    back: "Dashboard", eyebrow: "Validated evidence", title: "A safer queue, backed by real visits.", intro: "A transparent comparison using 300 de-identified emergency visits and repeated shift simulations.",
    safety: "Safer than routine triage", safetyBody: "The full rules engine missed fewer urgent patients and identified more level-one cases than recorded nurse triage.", missed: "Urgent cases missed", caught: "Level-one cases caught", under: "Under-triage", over: "Over-triage", codeOnly: "Code-only missed", nurses: "Nurses", ours: "Our engine",
    reading: "Reads notes reliably", readingBody: "The intake parser checks structured clinical fields without inventing missing values.", fields: "Fields checked", correct: "Correctly read", invented: "Invented values",
    signal: "Escalation carries signal", signalBody: "Patients the engine raised to a more urgent level were admitted more often than those it kept at the expert level.", expert: "Expert level", raised: "Raised", kept: "Kept", admitted: "admitted", byLevel: "Admission by our level",
    flow: "Protects urgent patients under pressure", flowBody: "Same arrivals, staffing and four-hour shift. Only the queue policy changes.", urgent: "Urgent wait", minor: "Minor wait", seen: "Patients seen", corridor: "Corridor", first: "First come", smart: "Smart", perHour: "arrivals/hour",
    limit: "Interpretation limit", limitBody: "This is decision support, not an autonomous clinical diagnosis. The replay demonstrates behavior on a licensed dataset; local clinical validation is still required.",
    note: "ESI rates possible heart attack, stroke and GI bleeding as level 2; the Korean experts often rated them 3",
  },
  ur: {
    back: "ڈیش بورڈ", eyebrow: "تصدیق شدہ ثبوت", title: "حقیقی وزٹس سے ثابت، زیادہ محفوظ قطار۔", intro: "تین سو گمنام ایمرجنسی وزٹس اور بار بار شفٹ سمولیشن کا واضح موازنہ۔",
    safety: "معمول کے ٹرائیج سے زیادہ محفوظ", safetyBody: "مکمل رولز انجن نے کم فوری مریض چھوڑے اور نرس ٹرائیج سے زیادہ لیول ون کیس پہچانے۔", missed: "چھوٹے ہوئے فوری کیس", caught: "پہچانے گئے لیول ون", under: "کم ترجیح", over: "زیادہ ترجیح", codeOnly: "صرف کوڈ سے چھوٹے", nurses: "نرسیں", ours: "ہمارا انجن",
    reading: "نوٹس قابل اعتماد طریقے سے پڑھتا ہے", readingBody: "انٹیک پارسر بغیر گمشدہ معلومات گھڑے، طبی فیلڈز چیک کرتا ہے۔", fields: "چیک شدہ فیلڈز", correct: "درست پڑھے", invented: "گھڑی ہوئی ویلیوز",
    signal: "ترجیح میں اضافہ بامعنی ہے", signalBody: "جن مریضوں کی ترجیح بڑھائی گئی، ان کے داخل ہونے کی شرح زیادہ تھی۔", expert: "ماہر لیول", raised: "ترجیح بڑھی", kept: "برقرار", admitted: "داخل", byLevel: "ہمارے لیول کے مطابق داخلہ",
    flow: "دباؤ میں فوری مریضوں کی حفاظت", flowBody: "وہی مریض، عملہ اور چار گھنٹے کی شفٹ؛ صرف قطار کی پالیسی بدلتی ہے۔", urgent: "فوری انتظار", minor: "معمولی انتظار", seen: "دیکھے گئے مریض", corridor: "کوریڈور", first: "پہلے آئیں", smart: "سمارٹ", perHour: "فی گھنٹہ آمد",
    limit: "تشریح کی حد", limitBody: "یہ فیصلہ سازی میں مدد ہے، خودکار طبی تشخیص نہیں۔ مقامی طبی توثیق اب بھی ضروری ہے۔", note: "ESI ممکنہ ہارٹ اٹیک، اسٹروک اور GI بلیڈنگ کو لیول 2 دیتا ہے؛ کوریائی ماہرین نے اکثر انہیں 3 دیا۔",
  },
  roman: {
    back: "Dashboard", eyebrow: "Tasdeeq shuda saboot", title: "Asal visits se sabit, zyada mehfooz queue.", intro: "300 de-identified emergency visits aur repeated shift simulations ka wazeh muqabla.",
    safety: "Routine triage se zyada mehfooz", safetyBody: "Full rules engine ne kam urgent mareez miss kiye aur nurse triage se zyada level-one cases pakray.", missed: "Urgent cases miss", caught: "Level-one cases pakray", under: "Under-triage", over: "Over-triage", codeOnly: "Code-only miss", nurses: "Nurses", ours: "Hamara engine",
    reading: "Notes bharosay se parhta hai", readingBody: "Intake parser missing values banaye baghair clinical fields check karta hai.", fields: "Fields checked", correct: "Sahi parhay", invented: "Banayi hui values",
    signal: "Escalation meaningful hai", signalBody: "Jin mareezon ki urgency barhai gayi un ka admission rate zyada tha.", expert: "Expert level", raised: "Urgency barhi", kept: "Wohi level", admitted: "admitted", byLevel: "Hamare level ke mutabiq admission",
    flow: "Pressure mein urgent mareez mehfooz", flowBody: "Wohi arrivals, staff aur char ghantay ki shift; sirf queue policy badalti hai.", urgent: "Urgent wait", minor: "Minor wait", seen: "Mareez dekhe", corridor: "Corridor", first: "Pehle aaye", smart: "Smart", perHour: "arrivals/hour",
    limit: "Samajhne ki had", limitBody: "Yeh decision support hai, khudkar clinical diagnosis nahi. Local clinical validation abhi bhi zaroori hai.", note: "ESI possible heart attack, stroke aur GI bleeding ko level 2 deta hai; Korean experts ne aksar unhein 3 diya.",
  },
};

export default function EvidencePage() {
  const preferences = useUiPreferences();
  const copy = COPY[preferences.language];

  return (
    <div className={`${preferences.theme === "dark" ? "dark" : ""} ${preferences.language === "ur" ? "font-urdu" : "font-sans"}`} dir={preferences.language === "ur" ? "rtl" : "ltr"}>
      <main className="min-h-screen bg-[#F8F7EF] px-4 py-5 text-black transition-colors dark:bg-black dark:text-white sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <nav className="flex items-center justify-between gap-3" aria-label="Evidence controls">
            <Link href="/" className="rounded-lg border border-black/10 bg-[#FFEFB4] px-3 py-2 text-xs font-bold dark:border-white/10 dark:bg-[#171717]">← {copy.back}</Link>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                {(["en", "ur", "roman"] as const).map((language) => (
                  <button key={language} type="button" onClick={() => preferences.changeLanguage(language)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${preferences.language === language ? "bg-[#353A96] text-white" : "text-slate-500"}`} aria-pressed={preferences.language === language}>
                    {language === "en" ? "EN" : language === "ur" ? "اردو" : "Roman"}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => preferences.changeTheme(preferences.theme === "dark" ? "light" : "dark")} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" aria-label={`Use ${preferences.theme === "dark" ? "light" : "dark"} mode`}>
                {preferences.theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </nav>

          <header className="mt-5 overflow-hidden rounded-3xl bg-[#353A96] p-6 text-white shadow-2xl shadow-[#353A96]/15 dark:border dark:border-white/10 sm:p-9">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#FFEFB4] uppercase">{copy.eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">{copy.intro}</p>
            <div className="mt-7 flex flex-wrap gap-2 text-[10px] font-bold text-slate-300"><span className="rounded-full bg-white/5 px-3 py-1.5">{evidence.visits} real visits</span><span className="rounded-full bg-white/5 px-3 py-1.5">{evidence.reading.fieldsChecked.toLocaleString()} fields</span><span className="rounded-full bg-white/5 px-3 py-1.5">20 simulation runs / shift</span></div>
          </header>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <EvidenceSection number="01" title={copy.safety} body={copy.safetyBody}>
              <Comparison label={copy.missed} left={`${evidence.triage.nurse.urgentMissed}/${evidence.triage.nurse.urgentTotal}`} right={`${evidence.triage.ours.urgentMissed}/${evidence.triage.ours.urgentTotal}`} leftLabel={copy.nurses} rightLabel={copy.ours} />
              <Comparison label={copy.caught} left={`${evidence.level1.nurse}/${evidence.level1.total}`} right={`${evidence.level1.ours}/${evidence.level1.total}`} leftLabel={copy.nurses} rightLabel={copy.ours} />
              <Comparison label={copy.under} left={`${evidence.triage.nurse.under}%`} right={`${evidence.triage.ours.under}%`} leftLabel={copy.nurses} rightLabel={copy.ours} />
              <Comparison label={copy.over} left={`${evidence.triage.nurse.over}%`} right={`${evidence.triage.ours.over}%`} leftLabel={copy.nurses} rightLabel={copy.ours} />
              <p className="mt-3 text-[9px] font-semibold text-slate-400">{copy.codeOnly}: {evidence.triage.codeOnly.urgentMissed}/{evidence.triage.codeOnly.urgentTotal}</p>
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-300">{copy.note}</p>
            </EvidenceSection>

            <EvidenceSection number="02" title={copy.reading} body={copy.readingBody}>
              <div className="grid grid-cols-3 gap-3"><Stat value={evidence.reading.fieldsChecked.toLocaleString()} label={copy.fields} /><Stat value={`${evidence.reading.correct}%`} label={copy.correct} accent /><Stat value={String(evidence.reading.invented)} label={copy.invented} accent /></div>
              <p className="mt-4 text-[10px] leading-relaxed text-slate-400">Missing values remain visible for nurse review; they are never silently filled.</p>
            </EvidenceSection>

            <EvidenceSection number="03" title={copy.signal} body={copy.signalBody}>
              <div className="space-y-4">{evidence.admitted.raised.map((row) => <div key={row.expertLevel}><div className="mb-2 flex items-center justify-between text-[10px] font-bold text-slate-500"><span>{copy.expert} {row.expertLevel}</span><span>{copy.admitted}</span></div><Bar label={copy.raised} value={row.raised} tone="bg-violet-500" /><Bar label={copy.kept} value={row.kept} tone="bg-slate-300 dark:bg-slate-700" /></div>)}</div>
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="mb-3 text-[10px] font-bold text-slate-500">{copy.byLevel}</p>{([1, 2, 3, 4, 5] as const).map((level) => <Bar key={level} label={`L${level}`} value={evidence.admitted.byOurLevel[level] ?? 0} tone="bg-[#353A96]" />)}</div>
            </EvidenceSection>

            <EvidenceSection number="04" title={copy.flow} body={copy.flowBody}>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">{evidence.shifts.map((shift) => <article key={shift.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-bold capitalize">{shift.name}</h3><span className="text-[9px] text-slate-400">{shift.perHour} {copy.perHour}</span></div><p className="mt-3 text-[8px] font-bold text-slate-400 uppercase">{copy.urgent}</p><div className="mt-1 grid grid-cols-2 gap-2"><MiniMetric label={copy.first} value={`${shift.firstCome.urgentWait.avg}m`} /><MiniMetric label={copy.smart} value={`${shift.smart.urgentWait.avg}m`} accent /></div><p className="mt-2 text-[9px] text-slate-400">{copy.minor}: {shift.firstCome.minorWait}m → <strong className="text-[#353A96] dark:text-[#FFEFB4]">{shift.smart.minorWait}m</strong></p><p className="mt-1 text-[9px] text-slate-400">{copy.seen}: {shift.firstCome.seen} → <strong className="text-[#353A96] dark:text-[#FFEFB4]">{shift.smart.seen}</strong></p><p className="mt-1 text-[9px] text-slate-400">{copy.corridor}: {shift.firstCome.corridor} → <strong className="text-[#353A96] dark:text-[#FFEFB4]">{shift.smart.corridor}</strong></p></article>)}</div>
            </EvidenceSection>
          </div>

          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20"><p className="text-[10px] font-bold tracking-[0.16em] text-amber-800 uppercase dark:text-amber-400">{copy.limit}</p><p className="mt-2 max-w-4xl text-xs leading-relaxed text-amber-950 dark:text-amber-200">{copy.limitBody}</p></section>
          <footer className="py-5 text-center text-[9px] text-slate-400">Source: {evidence.source}</footer>
        </div>
      </main>
    </div>
  );
}

function EvidenceSection({ number, title, body, children }: { number: string; title: string; body: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#171717] sm:p-6"><p className="font-mono text-[10px] font-bold text-[#353A96] dark:text-[#FFEFB4]">{number}</p><h2 className="mt-2 text-lg font-bold tracking-tight">{title}</h2><p className="mt-2 min-h-12 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{body}</p><div className="mt-5">{children}</div></section>;
}

function Comparison({ label, left, right, leftLabel, rightLabel }: { label: string; left: string; right: string; leftLabel: string; rightLabel: string }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_70px_70px] items-center gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800"><p className="text-xs font-semibold">{label}</p><div className="text-right"><p className="text-[8px] text-slate-400">{leftLabel}</p><p className="font-mono text-sm font-bold text-slate-500">{left}</p></div><div className="text-right"><p className="text-[8px] text-[#353A96] dark:text-[#FFEFB4]">{rightLabel}</p><p className="font-mono text-sm font-bold text-[#353A96] dark:text-[#FFEFB4]">{right}</p></div></div>;
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return <div className="rounded-xl bg-[#FFEFB4]/50 p-3 dark:bg-black"><p className={`font-mono text-xl font-bold tabular-nums ${accent ? "text-[#353A96] dark:text-[#FFEFB4]" : ""}`}>{value}</p><p className="mt-1 text-[9px] leading-tight text-slate-400">{label}</p></div>;
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="mb-1.5 grid grid-cols-[64px_minmax(0,1fr)_38px] items-center gap-2"><span className="text-[9px] text-slate-500">{label}</span><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(value, 100)}%` }} /></div><span className="text-right font-mono text-[10px] font-bold">{value}%</span></div>;
}

function MiniMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-[8px] text-slate-400">{label}</p><p className={`font-mono text-lg font-bold ${accent ? "text-[#353A96] dark:text-[#FFEFB4]" : "text-slate-600 dark:text-slate-300"}`}>{value}</p></div>;
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>;
}

function MoonIcon() {
  return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20.5 15.1A8.5 8.5 0 0 1 8.9 3.5 8.5 8.5 0 1 0 20.5 15.1Z"/></svg>;
}

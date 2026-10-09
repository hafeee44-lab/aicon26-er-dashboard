"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { evidence } from "@/er/evidence";
import { useUiPreferences } from "@/er/uiPreferences";

const labels = {
  en: ["Back to dashboard", "Same patients. A different wait.", "Replay identical arrivals under two queue policies.", "Arrival order", "Smart order", "Urgent patients waiting", "Waiting", "Doctor", "Done", "Play", "Pause", "Restart", "Peak urgent wait", "minutes", "Urgent cases missed", "Level-one cases caught", "Fields read correctly", "Before", "After", "Sample"],
  ur: ["ڈیش بورڈ پر واپس", "وہی مریض، انتظار مختلف۔", "ایک جیسے مریض دو مختلف ترتیبوں میں دیکھیں۔", "آمد کی ترتیب", "طبی ترجیح", "فوری مریض منتظر", "انتظار", "ڈاکٹر", "مکمل", "چلائیں", "روکیں", "دوبارہ", "طویل فوری انتظار", "منٹ", "چھوٹے ہوئے فوری کیس", "پہچانے گئے لیول ایک", "درست پڑھی گئی معلومات", "پہلے", "بعد", "نمونہ"],
  roman: ["Dashboard par wapas", "Wohi mareez. Kam intezar.", "Aik jaisay mareez do queue tarteebon mein dekhein.", "Arrival order", "Urgency order", "Urgent mareez muntazir", "Intezar", "Doctor", "Mukammal", "Chalayein", "Rokein", "Dobara", "Peak urgent wait", "min", "Miss urgent cases", "Level-one pakray", "Sahi parhi fields", "Pehle", "Baad", "Sample"],
};
const colors = ["#e5484d", "#e98431", "#c29a22", "#359c67", "#4383d9"];
const levels = [1, 2, 3, 4, 2, 1, 3, 5, 2, 4, 1, 3];

export default function EvidencePage() {
  const preferences = useUiPreferences();
  const t = labels[preferences.language];
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!playing || progress >= 100) return;
    let frame = 0;
    let last = 0;
    const step = (now: number) => {
      if (last) setProgress((value) => Math.min(100, value + (now - last) * speed / 360));
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, progress]);
  const stats = [[t[14], `${evidence.triage.nurse.urgentMissed}/${evidence.triage.nurse.urgentTotal}`, `${evidence.triage.ours.urgentMissed}/${evidence.triage.ours.urgentTotal}`, `${evidence.triage.ours.urgentTotal}`], [t[15], `${evidence.level1.nurse}/${evidence.level1.total}`, `${evidence.level1.ours}/${evidence.level1.total}`, `${evidence.level1.total}`], [t[12], `${evidence.shifts[2].firstCome.urgentWait.avg}m`, `${evidence.shifts[2].smart.urgentWait.avg}m`, "20 shifts"], [t[16], `${evidence.reading.fieldsChecked}`, `${evidence.reading.correct}%`, `${evidence.reading.fieldsChecked}`]];
  return <div className={`app-root ${preferences.theme === "dark" ? "dark" : "light"} ${preferences.language === "ur" ? "urdu" : ""}`} dir={preferences.language === "ur" ? "rtl" : "ltr"}>
    <main className="app-main evidence-route">
      <Link href="/" className="evidence-back">← {t[0]}</Link>
      <div className="view-heading"><span className="section-kicker">RACE MODE</span><h1>{t[1]}</h1><p>{t[2]}</p></div>
      <section className="panel race-panel" aria-label="Race mode">
        <div className="race-header"><div><span className="section-kicker">300 visits · same stream</span><h2>41.2 <small>{t[13]}</small> → 2.4 <small>{t[13]}</small></h2><p>{t[12]}</p></div><div className="race-controls"><button type="button" className="primary-button" onClick={() => { if (progress >= 100) setProgress(0); setPlaying(!playing); }} aria-label={playing && progress < 100 ? t[10] : t[9]}>{playing && progress < 100 ? t[10] : t[9]}</button><button type="button" className="secondary-button" onClick={() => { setPlaying(false); setProgress(0); }}>{t[11]}</button><div className="segmented" aria-label="Playback speed">{[1, 2, 4].map((value) => <button key={value} type="button" className={speed === value ? "active" : ""} onClick={() => setSpeed(value)} aria-label={`${value}x`}>{value}×</button>)}</div></div></div>
        <div className="race-lanes">{[0, 1].map((lane) => { const smart = lane === 1; const urgent = progress === 0 ? 12 : Math.max(0, Math.round(12 + progress * (smart ? -0.09 : 0.07))); return <div className="race-lane" key={lane}><div className="race-lane-head"><strong>{smart ? t[4] : t[3]}</strong><span>{t[5]}: <b>{urgent}</b></span></div><div className="race-track"><span className="race-track-line" />{levels.map((level, index) => <i key={index} className="race-dot" style={{ background: colors[level - 1], insetInlineStart: `${Math.min(91, 5 + progress * (smart ? (level <= 2 ? 0.87 : 0.56) : (index < 6 ? 0.8 : 0.42)) + index * 1.3)}%`, top: `${15 + index % 3 * 22}%` }} aria-label={`L${level}`} />)}</div><div className="race-axis"><span>{t[6]}</span><span>{t[7]}</span><span>{t[8]}</span></div></div>; })}</div>
        <div className="race-summary"><span>{t[12]}</span><strong>41.2 <small>{t[13]}</small> <i>→</i> 2.4 <small>{t[13]}</small></strong></div>
      </section>
      <div className="evidence-grid">{stats.map(([title, before, after, sample]) => <article className="panel evidence-card" key={title}><span className="section-kicker">{t[19]}: {sample}</span><h3>{title}</h3><div><span>{t[17]}<strong>{before}</strong></span><span aria-hidden="true">→</span><span>{t[18]}<strong>{after}</strong></span></div></article>)}</div>
      <p className="evidence-footer">Retrospective analysis of 300 de-identified visits (Moon et al. 2019, PLOS ONE, CC BY 4.0). Decision support only; not clinically validated. A clinician makes every final decision.</p>
    </main>
  </div>;
}

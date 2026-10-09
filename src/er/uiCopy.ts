import type { UiLanguage } from "./uiPreferences";

type Copy = {
  subtitle: string;
  overview: string;
  patients: string;
  resources: string;
  evidence: string;
  newPatient: string;
  liveShift: string;
  simulation: string;
  smart: string;
  firstCome: string;
  demoSurge: string;
  realSurge: string;
  reset: string;
  rulesMode: string;
  aiReady: string;
  commandTitle: string;
  commandBody: string;
  waiting: string;
  critical: string;
  longestWait: string;
  bedsFree: string;
  averageWait: string;
  doctorsBusy: string;
  corridor: string;
  boarding: string;
  patientFlow: string;
  patientFlowHint: string;
  all: string;
  withDoctor: string;
  diagnostics: string;
  done: string;
  noPatients: string;
  doctor: string;
  bed: string;
  unassigned: string;
  review: string;
  realCase: string;
  nextAction: string;
  noAlerts: string;
  noAlertsBody: string;
  apply: string;
  nurseBrief: string;
  briefHint: string;
  generateBrief: string;
  refreshBrief: string;
  preparing: string;
  capacity: string;
  capacityHint: string;
  onShift: string;
  available: string;
  backup: string;
  offShift: string;
  intakeTitle: string;
  intakeHint: string;
  nurseNote: string;
  notePlaceholder: string;
  readNote: string;
  reading: string;
  triagePreview: string;
  predictedNeeds: string;
  checkBefore: string;
  admit: string;
  proofTitle: string;
  proofBody: string;
  viewEvidence: string;
};

export const UI_COPY: Record<UiLanguage, Copy> = {
  en: {
    subtitle: "Emergency operations",
    overview: "Overview",
    patients: "Patients",
    resources: "Resources",
    evidence: "Evidence",
    newPatient: "New patient",
    liveShift: "Live shift",
    simulation: "Simulation",
    smart: "Smart order (by urgency)",
    firstCome: "Arrival order",
    demoSurge: "Demo surge",
    realSurge: "Real surge",
    reset: "Reset",
    rulesMode: "Rules mode",
    aiReady: "AI ready",
    commandTitle: "Protect the urgent queue",
    commandBody: "Smart allocation prioritises clinical urgency while keeping every decision visible and auditable.",
    waiting: "Waiting",
    critical: "Critical",
    longestWait: "Longest wait",
    bedsFree: "Beds free",
    averageWait: "Average wait",
    doctorsBusy: "Doctors busy",
    corridor: "Corridor",
    boarding: "Boarding",
    patientFlow: "Patient flow",
    patientFlowHint: "Sorted by urgency, then wait",
    all: "All",
    withDoctor: "With doctor",
    diagnostics: "Tests in progress",
    done: "Waiting for a ward bed",
    noPatients: "No patients in this view",
    doctor: "Doctor",
    bed: "Bed",
    unassigned: "Unassigned",
    review: "Review",
    realCase: "Real case",
    nextAction: "Next action",
    noAlerts: "Operations stable",
    noAlertsBody: "No escalation is recommended right now.",
    apply: "Apply action",
    nurseBrief: "Nurse brief",
    briefHint: "Generated only from rule-based alerts",
    generateBrief: "Generate brief",
    refreshBrief: "Refresh brief",
    preparing: "Preparing…",
    capacity: "Capacity",
    capacityHint: "Beds and clinical team",
    onShift: "on shift",
    available: "Available",
    backup: "Backup",
    offShift: "Off shift",
    intakeTitle: "New patient intake",
    intakeHint: "English, Urdu or Roman Urdu",
    nurseNote: "Nurse note",
    notePlaceholder: "Type or dictate the patient note…",
    readNote: "Read note",
    reading: "Reading…",
    triagePreview: "Triage preview",
    predictedNeeds: "Predicted needs",
    checkBefore: "Check before admitting",
    admit: "Confirm and admit",
    proofTitle: "Evidence from 300 real visits",
    proofBody: "Compare our triage, note reading and smart allocation against nurses and first-come flow.",
    viewEvidence: "View evidence",
  },
  ur: {
    subtitle: "ایمرجنسی آپریشنز",
    overview: "جائزہ",
    patients: "مریض",
    resources: "وسائل",
    evidence: "ثبوت",
    newPatient: "نیا مریض",
    liveShift: "لائیو شفٹ",
    simulation: "سمولیشن",
    smart: "سمارٹ",
    firstCome: "پہلے آئیں",
    demoSurge: "ڈیمو رش",
    realSurge: "حقیقی رش",
    reset: "ری سیٹ",
    rulesMode: "رولز موڈ",
    aiReady: "اے آئی تیار",
    commandTitle: "فوری مریضوں کو ترجیح دیں",
    commandBody: "سمارٹ نظام طبی ضرورت کے مطابق ترتیب دیتا ہے اور ہر فیصلہ واضح رکھتا ہے۔",
    waiting: "انتظار",
    critical: "فوری",
    longestWait: "طویل انتظار",
    bedsFree: "خالی بیڈ",
    averageWait: "اوسط انتظار",
    doctorsBusy: "مصروف ڈاکٹر",
    corridor: "کوریڈور",
    boarding: "بیڈ کے منتظر",
    patientFlow: "مریضوں کی روانی",
    patientFlowHint: "پہلے شدت، پھر انتظار",
    all: "سب",
    withDoctor: "ڈاکٹر کے پاس",
    diagnostics: "ٹیسٹ",
    done: "بیڈ کے منتظر",
    noPatients: "اس حصے میں کوئی مریض نہیں",
    doctor: "ڈاکٹر",
    bed: "بیڈ",
    unassigned: "مقرر نہیں",
    review: "چیک",
    realCase: "حقیقی کیس",
    nextAction: "اگلا قدم",
    noAlerts: "حالات مستحکم ہیں",
    noAlertsBody: "ابھی کسی اضافی اقدام کی ضرورت نہیں۔",
    apply: "اقدام کریں",
    nurseBrief: "نرس بریف",
    briefHint: "صرف رولز کے الرٹس کی بنیاد پر",
    generateBrief: "بریف بنائیں",
    refreshBrief: "دوبارہ بنائیں",
    preparing: "تیار ہو رہا ہے…",
    capacity: "گنجائش",
    capacityHint: "بیڈ اور طبی ٹیم",
    onShift: "شفٹ پر",
    available: "دستیاب",
    backup: "بیک اپ",
    offShift: "آف شفٹ",
    intakeTitle: "نئے مریض کا اندراج",
    intakeHint: "انگریزی، اردو یا رومن اردو",
    nurseNote: "نرس نوٹ",
    notePlaceholder: "مریض کا نوٹ لکھیں یا بولیں…",
    readNote: "نوٹ پڑھیں",
    reading: "پڑھا جا رہا ہے…",
    triagePreview: "ٹرائیج جائزہ",
    predictedNeeds: "ممکنہ ضروریات",
    checkBefore: "داخل کرنے سے پہلے چیک کریں",
    admit: "تصدیق اور داخلہ",
    proofTitle: "تین سو حقیقی وزٹس کا ثبوت",
    proofBody: "ہمارے ٹرائیج، نوٹ ریڈنگ اور سمارٹ نظام کا نرسوں اور پہلے آنے والے نظام سے موازنہ کریں۔",
    viewEvidence: "ثبوت دیکھیں",
  },
  roman: {
    subtitle: "Emergency operations",
    overview: "Khulasa",
    patients: "Mareez",
    resources: "Wasail",
    evidence: "Saboot",
    newPatient: "Naya mareez",
    liveShift: "Live shift",
    simulation: "Simulation",
    smart: "Smart",
    firstCome: "Pehle aaye",
    demoSurge: "Demo rush",
    realSurge: "Asal rush",
    reset: "Reset",
    rulesMode: "Rules mode",
    aiReady: "AI tayyar",
    commandTitle: "Fori mareez ko pehle dekhein",
    commandBody: "Smart nizam zaroorat ke mutabiq tarteeb deta hai aur har faisla wazeh rakhta hai.",
    waiting: "Intezaar",
    critical: "Fori",
    longestWait: "Lamba intezaar",
    bedsFree: "Khali beds",
    averageWait: "Ausat intezaar",
    doctorsBusy: "Masroof doctors",
    corridor: "Corridor",
    boarding: "Bed ka intezaar",
    patientFlow: "Mareezon ka flow",
    patientFlowHint: "Pehle urgency, phir wait",
    all: "Sab",
    withDoctor: "Doctor ke paas",
    diagnostics: "Tests",
    done: "Bed ka intezaar",
    noPatients: "Is view mein koi mareez nahi",
    doctor: "Doctor",
    bed: "Bed",
    unassigned: "Assign nahi",
    review: "Check",
    realCase: "Asal case",
    nextAction: "Agla qadam",
    noAlerts: "Operations stable hain",
    noAlertsBody: "Abhi escalation ki zaroorat nahi.",
    apply: "Action lagayen",
    nurseBrief: "Nurse brief",
    briefHint: "Sirf rules alerts ki bunyaad par",
    generateBrief: "Brief banayen",
    refreshBrief: "Dobara banayen",
    preparing: "Tayyar ho raha hai…",
    capacity: "Gunjaish",
    capacityHint: "Beds aur clinical team",
    onShift: "shift par",
    available: "Dastiyab",
    backup: "Backup",
    offShift: "Off shift",
    intakeTitle: "Naye mareez ka intake",
    intakeHint: "English, Urdu ya Roman Urdu",
    nurseNote: "Nurse note",
    notePlaceholder: "Mareez ka note likhein ya bolain…",
    readNote: "Note parhein",
    reading: "Parh raha hai…",
    triagePreview: "Triage preview",
    predictedNeeds: "Mumkin zarooriyat",
    checkBefore: "Admit se pehle check",
    admit: "Confirm aur admit",
    proofTitle: "300 asal visits ka saboot",
    proofBody: "Hamare triage, note reading aur smart allocation ko nurses aur first-come flow se compare karein.",
    viewEvidence: "Saboot dekhein",
  },
};

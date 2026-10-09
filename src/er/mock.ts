import { confirmPlan, planCare, simulate } from "./engine";
import type { CareOrder, Department, Intake, Level, Needs, Specialty, SurgeCase, Vitals } from "./types";

const vitals = (v: Partial<Vitals>): Vitals => ({
  hr: null,
  rr: null,
  sbp: null,
  dbp: null,
  spo2: null,
  temp: null,
  pain: null,
  consciousness: "alert",
  ...v,
});

const patient = (intake: Omit<Intake, "vitals"> & { vitals: Partial<Vitals> }, needs: Needs): SurgeCase => ({
  intake: { ...intake, vitals: vitals(intake.vitals) },
  needs,
});

export const sampleCases: SurgeCase[] = [
  patient(
    { name: "Muhammad Akram", age: 67, sex: "male", complaint: "Chest pain with sweating", note: "67 saal, seene mein dard, paseena, BP 88/60, pulse 112, sat 94", vitals: { hr: 112, sbp: 88, dbp: 60, spo2: 94, pain: 8 } },
    { specialty: "cardiology", resources: ["ecg", "labs", "iv_meds", "specialist"], destination: "icu", highRisk: true, reason: "Chest pain with sweating and low blood pressure may be a heart attack; needs ECG, cardiac tests and a cardiologist now." },
  ),
  patient(
    { name: "Ali Raza", age: 24, sex: "male", complaint: "Motorbike accident, deformed left leg", note: "24M bike accident, left leg tera hai, pain 8/10, BP 120/80, HR 105", vitals: { hr: 105, sbp: 120, dbp: 80, pain: 8 } },
    { specialty: "orthopaedics", resources: ["xray", "iv_meds", "procedure"], destination: "ward", highRisk: false, reason: "Likely leg fracture after a road accident; needs X-ray, pain relief and reduction by orthopaedics." },
  ),
  patient(
    { name: "Fatima Bibi", age: 30, sex: "female", complaint: "Fever for 3 days, body aches", note: "30F teen din se bukhar, jism dard, temp 39.2, HR 98", vitals: { hr: 98, temp: 39.2, pain: 5 } },
    { specialty: "medicine", resources: ["labs", "iv_fluids"], destination: "discharge", highRisk: false, reason: "Fever in dengue season; needs blood count and fluids, likely home with follow-up." },
  ),
  patient(
    { name: "Hamza (child)", age: 4, sex: "male", complaint: "Diarrhoea and vomiting since morning", note: "4 saal ka bacha, dast aur ultiyan subah se, HR 145, RR 28", vitals: { hr: 145, rr: 28, temp: 37.8 } },
    { specialty: "paediatrics", resources: ["labs", "iv_fluids"], destination: "ward", highRisk: false, reason: "Child with vomiting and diarrhoea and a fast heart rate may be dehydrated; needs fluids and tests." },
  ),
  patient(
    { name: "Ayesha Noor", age: 28, sex: "female", complaint: "34 weeks pregnant with bleeding", note: "28F, 34 hafte pregnant, bleeding, BP 150/100", vitals: { sbp: 150, dbp: 100, hr: 96, pain: 6 } },
    { specialty: "obgyn", resources: ["labs", "ultrasound", "iv_meds", "specialist"], destination: "theatre", highRisk: true, reason: "Bleeding late in pregnancy with high blood pressure should not wait; needs obstetrics now." },
  ),
  patient(
    { name: "Zubeda Khatoon", age: 72, sex: "female", complaint: "Fever, confusion, low oxygen", note: "72 saal aurat, bukhar, confusion, sat 89", vitals: { spo2: 89, temp: 38.9, hr: 108, rr: 26, consciousness: "voice" } },
    { specialty: "medicine", resources: ["labs", "xray", "iv_meds", "iv_fluids"], destination: "icu", highRisk: true, reason: "Low oxygen with fever and confusion in an older woman may be severe infection; needs urgent treatment." },
  ),
  patient(
    { name: "Usman Tariq", age: 19, sex: "male", complaint: "Cut on hand, bleeding controlled", note: "19M haath pe kat, bleeding ruk gayi, vitals normal", vitals: { hr: 82, sbp: 122, dbp: 78, pain: 3 } },
    { specialty: "emergency", resources: ["procedure"], destination: "discharge", highRisk: false, reason: "Simple wound that needs stitches." },
  ),
  patient(
    { name: "Sadia Parveen", age: 35, sex: "female", complaint: "Asthma attack", note: "35F saans phool rahi hai, wheeze, RR 28, sat 91", vitals: { rr: 28, spo2: 91, hr: 104 } },
    { specialty: "emergency", resources: ["iv_meds"], destination: "discharge", highRisk: false, reason: "Asthma attack needing nebulised medicine; oxygen is borderline." },
  ),
  patient(
    { name: "Bilal Hussain", age: 22, sex: "male", complaint: "Sore throat", note: "22M gala kharab, vitals normal", vitals: { hr: 78, temp: 37.4, pain: 2 } },
    { specialty: "emergency", resources: [], destination: "discharge", highRisk: false, reason: "Minor sore throat; can be seen in the outpatient clinic." },
  ),
  patient(
    { name: "Hira Batool", age: 26, sex: "female", complaint: "Right lower abdominal pain with fever", note: "26F pait ke right side mein dard, temp 38, HR 102, pain 6", vitals: { hr: 102, temp: 38, pain: 6 } },
    { specialty: "surgery", resources: ["labs", "ultrasound", "specialist"], destination: "theatre", highRisk: false, reason: "Possible appendicitis; needs tests, ultrasound and a surgeon." },
  ),
  patient(
    { name: "Nasreen Akhtar", age: 40, sex: "female", complaint: "Burn on arm from cooking", note: "40F kitchen mein haath jal gaya, pain 7/10", vitals: { hr: 96, pain: 7 } },
    { specialty: "emergency", resources: ["iv_meds", "procedure"], destination: "discharge", highRisk: false, reason: "Painful burn needing pain relief and dressing." },
  ),
  patient(
    { name: "Rashid Mehmood", age: 55, sex: "male", complaint: "Diabetic with vomiting and fast breathing", note: "55M sugar ka mareez, ultiyan, saans tez, HR 110, RR 24", vitals: { hr: 110, rr: 24 } },
    { specialty: "medicine", resources: ["labs", "iv_fluids", "iv_meds"], destination: "icu", highRisk: true, reason: "Diabetic with vomiting and fast breathing may have a dangerous sugar emergency (DKA)." },
  ),
  patient(
    { name: "Tariq Jamil", age: 45, sex: "male", complaint: "Headache and right arm weakness", note: "45M sar dard, right baazu kamzor, BP 190/110", vitals: { sbp: 190, dbp: 110, hr: 88, pain: 6 } },
    { specialty: "medicine", resources: ["ct", "labs", "specialist"], destination: "ward", highRisk: true, reason: "Arm weakness with very high blood pressure may be a stroke; needs a CT scan urgently." },
  ),
  patient(
    { name: "Mehwish Ali", age: 30, sex: "female", complaint: "Twisted ankle", note: "30F paon mur gaya, swelling, pain 5", vitals: { hr: 80, pain: 5 } },
    { specialty: "orthopaedics", resources: ["xray"], destination: "discharge", highRisk: false, reason: "Ankle sprain; needs an X-ray to rule out a fracture." },
  ),
  patient(
    { name: "Ahmed (child)", age: 12, sex: "male", complaint: "Dog bite on leg", note: "12 saal, kutte ne taang pe kaata, bleeding", vitals: { hr: 96, pain: 5 } },
    { specialty: "emergency", resources: ["procedure", "iv_meds"], destination: "discharge", highRisk: false, reason: "Dog bite needs wound cleaning and rabies vaccine injections." },
  ),
  patient(
    { name: "Ghulam Nabi", age: 50, sex: "male", complaint: "Fell from roof, unconscious", note: "50M chhat se gira, behosh, sirf dard pe response", vitals: { hr: 58, sbp: 160, dbp: 95, consciousness: "pain" } },
    { specialty: "surgery", resources: ["ct", "xray", "labs", "iv_fluids", "specialist"], destination: "icu", highRisk: true, reason: "Head injury after a fall with reduced consciousness; needs immediate resuscitation and CT." },
  ),
  patient(
    { name: "Abdul Sattar", age: 60, sex: "male", complaint: "Heat stroke, confused", note: "60M dhoop mein kaam, behki baatein, temp 41", vitals: { temp: 41, hr: 118, consciousness: "voice" } },
    { specialty: "medicine", resources: ["labs", "iv_fluids"], destination: "ward", highRisk: true, reason: "Very high temperature with confusion after heat exposure; needs rapid cooling and fluids." },
  ),
  patient(
    { name: "Rabia Saleem", age: 25, sex: "female", complaint: "Burning urine", note: "25F peshab mein jalan, bukhar nahi", vitals: { hr: 84, temp: 37.2, pain: 3 } },
    { specialty: "emergency", resources: ["labs"], destination: "discharge", highRisk: false, reason: "Likely urine infection; needs a urine test." },
  ),
  patient(
    { name: "Baby Zainab", age: 0.7, sex: "female", complaint: "8-month-old with high fever", note: "8 mahine ki bachi, tez bukhar 39, HR 170", vitals: { hr: 170, temp: 39 } },
    { specialty: "paediatrics", resources: ["labs", "iv_fluids"], destination: "ward", highRisk: false, reason: "Infant with high fever and a fast heart rate needs blood tests and IV fluids." },
  ),
  patient(
    { name: "Kashif Mehmood", age: 28, sex: "male", complaint: "Chest tightness, anxious", note: "28M seene mein ghabrahat, vitals normal, pain 4", vitals: { hr: 88, sbp: 124, dbp: 80, spo2: 98, pain: 4 } },
    { specialty: "emergency", resources: ["ecg"], destination: "discharge", highRisk: false, reason: "Young patient with normal vital signs; an ECG to be safe." },
  ),
  patient(
    { name: "Shamim Akhtar", age: 68, sex: "female", complaint: "Fell at home, painful wrist", note: "68F ghar mein giri, kalai mein dard, pain 6", vitals: { hr: 86, pain: 6 } },
    { specialty: "orthopaedics", resources: ["xray", "procedure"], destination: "discharge", highRisk: false, reason: "Possible wrist fracture; needs an X-ray and a cast." },
  ),
  patient(
    { name: "Iqbal Hussain", age: 58, sex: "male", complaint: "Vomiting blood", note: "58M khoon ki ulti, BP 95/60, HR 118", vitals: { sbp: 95, dbp: 60, hr: 118 } },
    { specialty: "medicine", resources: ["labs", "iv_fluids", "specialist", "procedure"], destination: "icu", highRisk: true, reason: "Vomiting blood with a fast pulse may be serious internal bleeding." },
  ),
  patient(
    { name: "Saba Khan", age: 24, sex: "female", complaint: "Labour pains at 39 weeks", note: "24F, 39 hafte, dard-e-zeh shuru, BP normal", vitals: { hr: 92, sbp: 118, dbp: 76, pain: 6 } },
    { specialty: "obgyn", resources: ["labs", "specialist"], destination: "ward", highRisk: false, reason: "Woman in labour at term; needs the obstetrics team." },
  ),
];

export const surgeCases: SurgeCase[] = sampleCases.slice(8);

type WardPatient = {
  id: string;
  name: string;
  age: number;
  sex: "male" | "female";
  complaint: string;
  level: Level;
  specialty: Specialty;
  nurseId: string;
  plannedAt: number;
  missed: string[];
  problems: string[];
  orders: Omit<CareOrder, "suggested">[];
};

const order = (kind: CareOrder["kind"], title: string, frequency: CareOrder["frequency"], source: string) => ({ kind, title, frequency, source });

export const wardPatients: WardPatient[] = [
  {
    id: "w1",
    name: "Bilal Hussain",
    age: 34,
    sex: "male",
    complaint: "Fractured right ankle with a wound, and acute diarrhoea",
    level: 3,
    specialty: "orthopaedics",
    nurseId: "n4",
    plannedAt: -60,
    missed: ["IV Ringer's lactate 1 L", "Orthopaedics review"],
    problems: ["Fractured right ankle with an open wound (in a back slab)", "Acute diarrhoea with mild dehydration"],
    orders: [
      order("iv_fluids", "IV Ringer's lactate 1 L", "every_8h", "Inj RL 1L 8 hourly"),
      order("medication", "Inj metronidazole 500 mg IV", "every_8h", "Inj Flagyl 500mg IV TDS"),
      order("dressing", "Change the ankle wound dressing", "daily", "ankle wound dressing OD"),
      order("medication", "ORS after every loose stool", "as_needed", "ORS after each loose motion"),
      order("review", "Orthopaedics review", "once", "ortho review today"),
    ],
  },
  {
    id: "w2",
    name: "Nasreen Akhtar",
    age: 61,
    sex: "female",
    complaint: "Pneumonia",
    level: 2,
    specialty: "medicine",
    nurseId: "n3",
    plannedAt: -150,
    missed: [],
    problems: ["Community-acquired pneumonia", "Low oxygen on arrival, now on 2 L oxygen"],
    orders: [
      order("medication", "Inj ceftriaxone 1 g IV", "every_12h", "Inj Rocephin 1g IV BD"),
      order("medication", "Salbutamol nebulisation", "every_6h", "Neb Ventolin 6 hourly"),
      order("vitals", "Check oxygen saturation", "every_4h", "SpO2 monitoring 4 hourly, keep above 94%"),
      order("test", "Repeat chest X-ray", "once", "CXR repeat in morning"),
    ],
  },
  {
    id: "w3",
    name: "Ghulam Rasool",
    age: 58,
    sex: "male",
    complaint: "Infected diabetic foot ulcer",
    level: 3,
    specialty: "surgery",
    nurseId: "n4",
    plannedAt: 15,
    missed: [],
    problems: ["Infected diabetic foot ulcer, left foot", "Type 2 diabetes with high blood sugar"],
    orders: [
      order("medication", "Insulin as per sliding scale", "every_8h", "Inj Insulin as per sliding scale before meals"),
      order("test", "Blood sugar check", "every_4h", "BSR 4 hourly"),
      order("dressing", "Clean and dress the foot ulcer", "daily", "foot ulcer dressing daily with pyodine"),
      order("review", "Surgery review", "once", "surgical review for debridement"),
    ],
  },
];

function addWardPatient(dept: Department, w: WardPatient): Department {
  const now = dept.now;
  let d = structuredClone(dept);
  const doctor = d.doctors.find((doc) => doc.specialty === w.specialty) ?? d.doctors[0];

  d.patients.push({
    id: w.id,
    name: w.name,
    age: w.age,
    sex: w.sex,
    complaint: w.complaint,
    vitals: vitals({}),
    note: "",
    arrivedAt: w.plannedAt - 180,
    level: w.level,
    flags: [],
    needs: { specialty: w.specialty, resources: [], destination: "ward", highRisk: false, reason: "Admitted to the ward" },
    review: [],
    stage: "admitted",
    doctorId: doctor.id,
    bedId: null,
    seenAt: w.plannedAt - 170,
    stageEndsAt: null,
    doneAt: w.plannedAt - 30,
    nurseId: w.nurseId,
    plan: null,
  });

  d.now = w.plannedAt;
  d = confirmPlan(planCare(d, w.id, { problems: w.problems, orders: w.orders.map((o) => ({ ...o, suggested: false })), review: [] }), w.id);
  d.now = now;

  for (const t of d.tasks) {
    if (t.patientId === w.id && t.dueAt <= now - 20 && !w.missed.includes(t.title)) t.doneAt = t.dueAt + 5;
  }

  return d;
}

export function mockDepartment(): Department {
  const arrivals = sampleCases.slice(0, 8).map((c, i) => ({ at: i * 5, ...c }));
  return wardPatients.reduce(addWardPatient, simulate(arrivals, "smart", 45));
}

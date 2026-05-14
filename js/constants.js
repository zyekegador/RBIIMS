/* ============================================================
   js/constants.js  —  Shared constants (load first)
============================================================ */

/* Default puroks used to SEED a fresh database only.
   At runtime, the live list always comes from db.puroks.
   Rename or add defaults here; they only apply on first load. */
const DEFAULT_PUROKS = ["1", "2", "2A", "2B", "3", "4", "5", "5A", "6", "7"];

const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated", "Live-in"];

const AGE_GROUPS = [
  { label: "Under 5", min: 0, max: 4 },
  { label: "5–9", min: 5, max: 9 },
  { label: "10–14", min: 10, max: 14 },
  { label: "15–19", min: 15, max: 19 },
  { label: "20–24", min: 20, max: 24 },
  { label: "25–29", min: 25, max: 29 },
  { label: "30–34", min: 30, max: 34 },
  { label: "35–39", min: 35, max: 39 },
  { label: "40–44", min: 40, max: 44 },
  { label: "45–49", min: 45, max: 49 },
  { label: "50–54", min: 50, max: 54 },
  { label: "55–59", min: 55, max: 59 },
  { label: "60–64", min: 60, max: 64 },
  { label: "65–69", min: 65, max: 69 },
  { label: "70–74", min: 70, max: 74 },
  { label: "75–79", min: 75, max: 79 },
  { label: "80 and above", min: 80, max: 999 },
];

const INDICATORS = [
  {
    key: "citizenship_filipino",
    label: "Citizenship — Filipino",
    check: (r) => r.citizenship === "Filipino",
  },
  {
    key: "citizenship_foreigner",
    label: "Citizenship — Foreigner",
    check: (r) => r.citizenship === "Foreigner",
  },
  { key: "employed", label: "Employed", check: (r) => r.employed },
  { key: "unemployed", label: "Unemployed", check: (r) => r.unemployed },
  { key: "osc", label: "Out of School Children (OSC)", check: (r) => r.osc },
  { key: "osy", label: "Out of School Youth (OSY)", check: (r) => r.osy },
  { key: "pwd", label: "Persons with Disabilities (PWD)", check: (r) => r.pwd },
  { key: "ofw", label: "Overseas Filipino Workers (OFW)", check: (r) => r.ofw },
  { key: "soloParent", label: "Solo Parents", check: (r) => r.soloParent },
  { key: "student", label: "Student", check: (r) => r.student },
  { key: "ip", label: "Indigenous Peoples (IP)", check: (r) => r.ip },
  {
    key: "fourPs",
    label: "Pantawid Pamilyang Pilipino (4Ps)",
    check: (r) => r.fourPs,
  },
];

const STORAGE_KEY = "rbi_golden_ribbon_v2";

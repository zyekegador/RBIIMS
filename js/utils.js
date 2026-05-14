/* ════════════════════════════════════════════════════════════
   js/utils.js  —  Pure helper functions (no DOM side-effects)
════════════════════════════════════════════════════════════ */

/**
 * Escape HTML special characters to prevent XSS.
 * @param {*} s
 * @returns {string}
 */
function escHtml(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Calculate age in whole years from a "YYYY-MM-DD" string.
 *
 * ROOT-CAUSE FIX: `new Date("YYYY-MM-DD")` treats the string as UTC midnight,
 * which causes an off-by-one-day error in UTC+ timezones (e.g. Philippines
 * is UTC+8, so midnight UTC is already 8 AM local — the date "rolls back"
 * one day, making the birthday appear one day earlier and the age wrong).
 *
 * Solution: split the string and construct the Date with
 * `new Date(year, month-1, day)` which is always local time.
 *
 * @param {string} birthdateStr  e.g. "1990-04-15"
 * @returns {number|string}      Integer age, or '' if input is invalid
 */
function calcAge(birthdateStr) {
  if (!birthdateStr) return "";

  const parts = String(birthdateStr).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => isNaN(n) || n === 0)) return "";

  const [year, month, day] = parts;

  // Local-time date — no timezone shift
  const bd = new Date(year, month - 1, day);
  const today = new Date();

  // Sanity-check: reject future birthdates
  if (bd > today) return 0;

  let age = today.getFullYear() - bd.getFullYear();
  const mDiff = today.getMonth() - bd.getMonth();
  const dDiff = today.getDate() - bd.getDate();

  // Subtract 1 if the birthday hasn't happened yet this calendar year
  if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) age--;

  return Math.max(0, age);
}

/**
 * Derive a resolved age number from a resident record.
 * Prefers the stored `age` field; falls back to calculating from birthdate.
 * @param {Object} r
 * @returns {number}
 */
function resolveAge(r) {
  if (r.age !== undefined && r.age !== "" && !isNaN(Number(r.age))) {
    return Number(r.age);
  }
  const computed = calcAge(r.birthdate);
  return computed === "" ? -1 : Number(computed);
}

/**
 * Generate a short collision-resistant unique ID.
 * @returns {string}
 */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ── Toast notification ──────────────────────────────────── */
let _toastTimer;

/**
 * Display a transient toast notification.
 * @param {string}  msg
 * @param {'success'|'warning'|'danger'} [type='success']
 */
function showToast(msg, type = "success") {
  const el = document.getElementById("toast");
  const msgEl = document.getElementById("toast-msg");
  const iconEl = document.getElementById("toast-icon");

  const styles = {
    success: { bg: "var(--clr-navy)", icon: "#icon-check" },
    warning: { bg: "var(--clr-amber)", icon: "#icon-warning" },
    danger: { bg: "var(--clr-red)", icon: "#icon-warning" },
  };
  const s = styles[type] || styles.success;

  el.style.background = s.bg;
  iconEl.querySelector("use").setAttribute("href", s.icon);
  msgEl.textContent = msg;
  el.classList.add("show");

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
}

/* ── Save-indicator ──────────────────────────────────────── */
let _saveTimer;
function setSaveIndicator(state) {
  const el = document.getElementById("save-indicator");
  if (!el) return;
  const map = {
    saving: { text: "Saving…", cls: "saving" },
    saved: { text: "Saved", cls: "saved" },
    idle: { text: "Saved", cls: "" },
  };
  const s = map[state] || map.idle;
  el.textContent = s.text;
  el.className = `save-indicator ${s.cls}`;
}

/* ── Indicator badge HTML ────────────────────────────────── */
/**
 * Build full indicator badge markup for a resident row.
 * @param {Object} r  Resident record
 * @returns {string}  HTML fragment
 */
function buildIndicatorBadges(r) {
  const age = resolveAge(r);

  const checks = [
    {
      label: "Employed",
      className: "ind-employed",
      active: r.employed,
    },
    {
      label: "Unemployed",
      className: "ind-unemployed",
      active: r.unemployed,
    },
    {
      label: "Senior Citizen",
      className: "ind-senior",
      active: r.seniorCitizen || age >= 60,
    },
    {
      label: "OFW",
      className: "ind-ofw",
      active: r.ofw,
    },
    {
      label: "PWD",
      className: "ind-pwd",
      active: r.pwd,
    },
    {
      label: "Solo Parent",
      className: "ind-solo",
      active: r.soloParent,
    },
    {
      label: "Out-of-School Youth",
      className: "ind-osy",
      active: r.osy,
    },
    {
      label: "Out-of-School Child",
      className: "ind-osc",
      active: r.osc,
    },
    {
      label: "Student",
      className: "ind-student",
      active: r.student,
    },
    {
      label: "Indigenous People",
      className: "ind-ip",
      active: r.ip,
    },
    {
      label: "4Ps Beneficiary",
      className: "ind-4ps",
      active: r.fourPs,
    },
  ];

  const active = checks.filter((c) => c.active);

  if (!active.length) {
    return '<span style="color:var(--gray-300);font-size:11px">—</span>';
  }

  return active
    .map((c) => `<span class="ind-badge ${c.className}">${c.label}</span>`)
    .join("");
}

/* ── Statistics engine ───────────────────────────────────── */
/**
 * Compute a full statistical summary for an array of resident objects.
 * Mirrors the five summary tables from the original Excel file.
 *
 * @param {Object[]} residents
 * @returns {Object}  { total, male, female, households, civil, ageGroups, indicators }
 */ function statsForResidents(residents) {
  const total = residents.length;

  const male = residents.filter((r) => r.gender === "Male").length;

  const female = residents.filter((r) => r.gender === "Female").length;

  /* ── Household Count ─────────────────────────────── */
  const households = residents.filter((r) => r.role === "Head").length;

  /* ── Civil Status Breakdown ─────────────────────── */
  const civil = {};

  CIVIL_STATUSES.forEach((status) => {
    const m = residents.filter(
      (r) => r.civilStatus === status && r.gender === "Male",
    ).length;

    const f = residents.filter(
      (r) => r.civilStatus === status && r.gender === "Female",
    ).length;

    civil[status] = {
      male: m,
      female: f,
      total: m + f,
    };
  });

  /* ── Age Bracket Breakdown ──────────────────────── */
  const ageGroups = AGE_GROUPS.map((group) => {
    const matching = residents.filter((r) => {
      const age = resolveAge(r);

      return age >= group.min && age <= group.max;
    });

    const m = matching.filter((r) => r.gender === "Male").length;

    const f = matching.filter((r) => r.gender === "Female").length;

    return {
      label: group.label,
      male: m,
      female: f,
      total: m + f,
    };
  });

  /* ── Socio-Economic Indicators ──────────────────── */
  const indicators = INDICATORS.map((ind) => {
    const matching = residents.filter((r) => ind.check(r));

    const m = matching.filter((r) => r.gender === "Male").length;

    const f = matching.filter((r) => r.gender === "Female").length;

    return {
      label: ind.label,
      male: m,
      female: f,
      total: m + f,
    };
  });

  /* ── Totals for Indicators ──────────────────────── */
  const indicatorTotals = {
    male: indicators.reduce((sum, i) => sum + i.male, 0),

    female: indicators.reduce((sum, i) => sum + i.female, 0),

    total: indicators.reduce((sum, i) => sum + i.total, 0),
  };

  return {
    total,
    male,
    female,
    households,
    civil,
    ageGroups,
    indicators,
    indicatorTotals,
  };
}

/* ============================================================
   js/storage.js  —  Data persistence layer (localStorage)

   db.puroks  — live list of purok names, persisted to storage
   db.residents — all resident records

   Purok CRUD:
     addPurok(name)     adds a new purok and rebuilds UI
     deletePurok(name)  removes a purok (blocks if residents exist)
============================================================ */

let db = { puroks: [], residents: [], users: [], currentUser: null };

/* ============================================================
   LOAD / SAVE
============================================================ */
function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      db = {
        puroks: Array.isArray(parsed.puroks)
          ? parsed.puroks
          : DEFAULT_PUROKS.slice(),
        residents: Array.isArray(parsed.residents) ? parsed.residents : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
        currentUser: parsed.currentUser || null,
      };
    } else {
      // First run — seed with defaults
      db = {
        puroks: DEFAULT_PUROKS.slice(),
        residents: [],
        users: [],
        currentUser: null,
      };
    }
  } catch (e) {
    console.warn("[RBI] Could not parse stored data — starting fresh.", e);
    db = {
      puroks: DEFAULT_PUROKS.slice(),
      residents: [],
      users: [],
      currentUser: null,
    };
  }
}

function saveDB() {
  setSaveIndicator("saving");
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    showToast("Storage full — export your data to free space.", "danger");
    setSaveIndicator("idle");
    return;
  }
  setTimeout(() => setSaveIndicator("saved"), 500);
  setTimeout(() => setSaveIndicator("idle"), 2200);
  _refreshCounters();
}

/* ============================================================
   RESIDENT CRUD
============================================================ */
function addResident(data) {
  const record = { ...data, id: genId() };
  db.residents.push(record);
  saveDB();
  return record;
}

function updateResident(id, data) {
  const idx = db.residents.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  db.residents[idx] = { ...db.residents[idx], ...data, id };
  saveDB();
  return true;
}

function deleteResident(id) {
  const before = db.residents.length;
  db.residents = db.residents.filter((r) => r.id !== id);
  if (db.residents.length === before) return false;
  saveDB();
  return true;
}

function getResidentsByPurok(purok) {
  return db.residents.filter((r) => r.purok === String(purok));
}

function getResidentById(id) {
  return db.residents.find((r) => r.id === id);
}

/* ============================================================
   PUROK CRUD
============================================================ */

/**
 * Add a new purok.
 * @param {string} name  e.g. "8", "Poblacion", "Upper"
 * @returns {{ ok: boolean, error?: string }}
 */
function addPurok(name) {
  const trimmed = String(name).trim();

  if (!trimmed) {
    return { ok: false, error: "Purok name cannot be empty." };
  }
  if (trimmed.length > 20) {
    return { ok: false, error: "Purok name must be 20 characters or fewer." };
  }
  // Case-insensitive duplicate check
  const exists = db.puroks.some(
    (p) => p.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) {
    return { ok: false, error: `Purok "${trimmed}" already exists.` };
  }

  db.puroks.push(trimmed);
  saveDB();
  buildSidebar(); // refresh nav
  rebuildPurokSelect(); // refresh modal dropdown
  renderPurokManager(); // refresh settings panel
  renderDashboard(); // refresh purok cards
  return { ok: true };
}

/**
 * Delete a purok by name.
 * Blocks deletion if any residents are still assigned to it.
 * @param {string} name
 * @returns {{ ok: boolean, error?: string }}
 */
function deletePurok(name) {
  const residents = getResidentsByPurok(name);
  if (residents.length > 0) {
    return {
      ok: false,
      error: `Cannot delete Purok ${name}. ${residents.length} resident(s) are still assigned. Reassign or delete them first.`,
    };
  }

  db.puroks = db.puroks.filter((p) => p !== name);
  saveDB();

  // If user was viewing the deleted purok, go to dashboard
  if (typeof currentPurok !== "undefined" && currentPurok === name) {
    showPage("dashboard");
  }

  buildSidebar();
  rebuildPurokSelect();
  renderPurokManager();
  renderDashboard();
  return { ok: true };
}

/**
 * Update an existing purok name.
 * Renames the purok and updates all residents assigned to it.
 * @param {string} oldName  Current purok name
 * @param {string} newName  New purok name
 * @returns {{ ok: boolean, error?: string }}
 */
function updatePurok(oldName, newName) {
  const trimmed = String(newName).trim();

  if (!trimmed) {
    return { ok: false, error: "Purok name cannot be empty." };
  }
  if (trimmed.length > 20) {
    return { ok: false, error: "Purok name must be 20 characters or fewer." };
  }

  // Check if new name already exists (case-insensitive), but exclude the old name
  const exists = db.puroks.some(
    (p) => p.toLowerCase() === trimmed.toLowerCase() && p !== oldName,
  );
  if (exists) {
    return { ok: false, error: `Purok "${trimmed}" already exists.` };
  }

  // Find the index of the old purok
  const idx = db.puroks.indexOf(oldName);
  if (idx === -1) {
    return { ok: false, error: `Purok "${oldName}" not found.` };
  }

  // Update the purok name in the array
  db.puroks[idx] = trimmed;

  // Update all residents assigned to this purok
  db.residents.forEach((r) => {
    if (r.purok === oldName) {
      r.purok = trimmed;
    }
  });

  saveDB();
  buildSidebar();
  rebuildPurokSelect();
  renderPurokManager();

  // If currently viewing this purok, update the page
  if (typeof currentPurok !== "undefined" && currentPurok === oldName) {
    currentPurok = trimmed;
    renderPurokTable();
    document.getElementById("purok-page-title").textContent =
      "Purok " + escHtml(trimmed);
    document.getElementById("purok-page-sub").textContent =
      "Residents registry";
  }

  renderDashboard();
  return { ok: true };
}

/* ============================================================
   AUTH / ACCESS CONTROL
============================================================ */

function hashPassword(password) {
  return btoa(String(password));
}

function getUserByEmail(email) {
  if (!email || !db.users) return null;
  return db.users.find(
    (user) => user.email.toLowerCase() === String(email).toLowerCase(),
  );
}

function registerUser(name, email, password) {
  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedPassword = String(password);

  if (!trimmedName) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (!trimmedEmail) {
    return { ok: false, error: "Please enter your email address." };
  }
  if (!trimmedPassword || trimmedPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  if (!db.users) db.users = [];
  if (getUserByEmail(trimmedEmail)) {
    return { ok: false, error: "An account with that email already exists." };
  }

  db.users.push({
    name: trimmedName,
    email: trimmedEmail,
    passwordHash: hashPassword(trimmedPassword),
  });
  db.currentUser = trimmedEmail;
  saveDB();
  return { ok: true };
}

function loginUser(email, password) {
  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedPassword = String(password);

  if (!trimmedEmail || !trimmedPassword) {
    return { ok: false, error: "Email and password are required." };
  }

  const user = getUserByEmail(trimmedEmail);
  if (!user) {
    return { ok: false, error: "No account found for that email." };
  }

  if (user.passwordHash !== hashPassword(trimmedPassword)) {
    return { ok: false, error: "Incorrect password. Please try again." };
  }

  db.currentUser = trimmedEmail;
  saveDB();
  return { ok: true };
}

function logoutUser() {
  db.currentUser = null;
  saveDB();
  if (typeof setCurrentUser === "function") {
    setCurrentUser(null);
  }
  if (typeof showPage === "function") {
    showPage("login");
  }
}

function isAuthenticated() {
  return !!getUserByEmail(db.currentUser);
}

function currentUser() {
  return getUserByEmail(db.currentUser);
}

function refreshAuthState() {
  if (!db.users) db.users = [];
  if (!isAuthenticated()) {
    db.currentUser = null;
    document.body.classList.add("auth-locked");
  } else {
    document.body.classList.remove("auth-locked");
  }
  const user = currentUser();
  const authEl = document.getElementById("auth-user");
  const logoutBtn = document.getElementById("logout-button");
  if (authEl) {
    authEl.textContent = user ? "Logged in as " + user.name : "";
  }
  if (logoutBtn) {
    logoutBtn.style.display = user ? "inline-flex" : "none";
  }
}

/* ============================================================
   UI REFRESH HELPERS
============================================================ */
function _refreshCounters() {
  // Use db.puroks (live), not the static DEFAULT_PUROKS constant
  db.puroks.forEach((p) => {
    const el = document.getElementById("badge-" + p);
    if (el) el.textContent = db.residents.filter((r) => r.purok === p).length;
  });
  _updateSysInfo();
}

function _updateSysInfo() {
  const raw = localStorage.getItem(STORAGE_KEY) || "";
  const sizeEl = document.getElementById("data-size");
  const totalEl = document.getElementById("sys-total");
  const purokEl = document.getElementById("sys-puroks");
  if (sizeEl) sizeEl.textContent = (raw.length / 1024).toFixed(1) + " KB";
  if (totalEl) totalEl.textContent = db.residents.length;
  if (purokEl) purokEl.textContent = db.puroks.length;
}

/* ============================================================
   EXPORT / IMPORT / CLEAR
============================================================ */
function exportData() {
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download:
      "RBI_Golden_Ribbon_Backup_" +
      new Date().toISOString().slice(0, 10) +
      ".json",
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Data exported successfully.");
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!Array.isArray(parsed.residents))
        throw new Error("Invalid RBI file format.");
      const rCount = parsed.residents.length;
      const pCount = Array.isArray(parsed.puroks) ? parsed.puroks.length : 0;
      if (
        !confirm(
          "Import " +
            rCount +
            " resident(s) and " +
            pCount +
            " purok(s)?\n\nThis will overwrite ALL current data and cannot be undone.",
        )
      )
        return;
      db = {
        puroks: Array.isArray(parsed.puroks)
          ? parsed.puroks
          : DEFAULT_PUROKS.slice(),
        residents: parsed.residents,
      };
      saveDB();
      buildSidebar();
      rebuildPurokSelect();
      renderPurokManager();
      renderDashboard();
      showToast(
        "Imported " +
          rCount +
          " records and " +
          pCount +
          " puroks successfully.",
      );
    } catch (err) {
      showToast("Import failed: " + err.message, "danger");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function confirmClearAll() {
  if (
    !confirm(
      "Are you sure you want to permanently delete ALL resident records?\n\nThis cannot be undone.",
    )
  )
    return;
  if (
    !confirm(
      "Final confirmation: all resident data will be erased. Puroks will be kept. Continue?",
    )
  )
    return;
  db.residents = [];
  saveDB();
  renderPurokManager();
  showToast("All resident records cleared.", "warning");
}

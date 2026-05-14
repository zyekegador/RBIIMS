/* ============================================================
   js/app.js  —  Navigation controller & application bootstrap
   Loaded LAST — depends on all other modules.
============================================================ */

/* ============================================================
   SIDEBAR BUILDER  (dynamic — reads db.puroks)
============================================================ */

let currentUserEmail = null;

function isUserLoggedIn() {
  return !!currentUserEmail && !!getUserByEmail(currentUserEmail);
}

function getCurrentUser() {
  return getUserByEmail(currentUserEmail);
}

function updateAuthHeader() {
  const user = getCurrentUser();
  const authEl = document.getElementById("auth-user");
  const logoutBtn = document.getElementById("logout-button");
  if (authEl) {
    authEl.textContent = user ? "Logged in as " + user.name : "";
  }
  if (logoutBtn) {
    logoutBtn.style.display = user ? "inline-flex" : "none";
  }
}

function setCurrentUser(email) {
  currentUserEmail = email || null;
  if (currentUserEmail) {
    db.currentUser = currentUserEmail;
  } else {
    db.currentUser = null;
  }
  saveDB();
  updateAuthHeader();
  document.body.classList.toggle("auth-locked", !isUserLoggedIn());
}

function ensureAuth() {
  if (!isUserLoggedIn()) {
    showPage("login");
    return false;
  }
  return true;
}

/**
 * Rebuild the "Purok Records" section of the sidebar from db.puroks.
 * Called on init, and after every addPurok / deletePurok.
 */
function buildSidebar() {
  const container = document.getElementById("sidebar-puroks");
  if (!container) return;

  if (!db.puroks || db.puroks.length === 0) {
    container.innerHTML =
      '<div style="padding:8px 16px;font-size:11px;color:rgba(255,255,255,0.3);font-style:italic">' +
      "No puroks configured." +
      "</div>";
    return;
  }

  container.innerHTML = db.puroks
    .map(function (p) {
      const count = db.residents.filter(function (r) {
        return r.purok === p;
      }).length;
      return (
        '<button class="nav-item" id="nav-purok-' +
        escHtml(p) +
        '"' +
        ' data-page="purok" data-purok="' +
        escHtml(p) +
        '"' +
        " onclick=\"showPage('purok','" +
        escHtml(p) +
        "')\"" +
        ' aria-label="View Purok ' +
        escHtml(p) +
        '">' +
        '<svg class="icon" aria-hidden="true"><use href="#icon-home"/></svg>' +
        "<span>Purok " +
        escHtml(p) +
        "</span>" +
        '<span class="nav-count" id="badge-' +
        escHtml(p) +
        '">' +
        count +
        "</span>" +
        "</button>"
      );
    })
    .join("");
}

/* ============================================================
   PUROK SELECT REBUILDER  (modal dropdown)
============================================================ */

/**
 * Rebuild the <select id="f-purok"> options from db.puroks.
 * Called by openAddModal() and openEditModal() in modal.js,
 * and after every addPurok / deletePurok.
 */
function rebuildPurokSelect() {
  const sel = document.getElementById("f-purok");
  if (!sel) return;
  const current = sel.value; // preserve selection if editing
  sel.innerHTML =
    '<option value="">Select Purok…</option>' +
    (db.puroks || [])
      .map(function (p) {
        return (
          '<option value="' + escHtml(p) + '">Purok ' + escHtml(p) + "</option>"
        );
      })
      .join("");
  // Restore selection if still valid
  if (current && db.puroks.indexOf(current) !== -1) sel.value = current;
}

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  const result = loginUser(email, password);
  if (!errorEl) return;
  if (result.ok) {
    setCurrentUser(email);
    errorEl.textContent = "";
    errorEl.style.display = "none";
    showPage("dashboard");
    return;
  }
  errorEl.textContent = result.error;
  errorEl.style.display = "block";
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const errorEl = document.getElementById("register-error");
  const result = registerUser(name, email, password);
  if (!errorEl) return;
  if (result.ok) {
    setCurrentUser(email);
    errorEl.textContent = "";
    errorEl.style.display = "none";
    showPage("dashboard");
    return;
  }
  errorEl.textContent = result.error;
  errorEl.style.display = "block";
}

function switchToRegister() {
  showPage("register");
}

function switchToLogin() {
  showPage("login");
}

/* ============================================================
   PUROK MANAGER UI  (settings page panel)
============================================================ */

/**
 * Render the Manage Puroks panel inside the settings page.
 * Shows each purok with its resident count and Edit/Delete action buttons.
 */
function renderPurokManager() {
  const container = document.getElementById("purok-manager-list");
  if (!container) return;

  const puroks = db.puroks || [];

  if (puroks.length === 0) {
    container.innerHTML =
      '<div class="purok-manager-empty">No puroks configured. Add one below.</div>';
    return;
  }

  container.innerHTML = puroks
    .map(function (p) {
      const count = db.residents.filter(function (r) {
        return r.purok === p;
      }).length;
      const hasResidents = count > 0;

      return (
        '<div class="purok-manager-item" id="purok-row-' +
        escHtml(p) +
        '">' +
        '<div class="purok-manager-item-left">' +
        '<div class="purok-manager-badge">' +
        '<svg class="icon" aria-hidden="true"><use href="#icon-home"/></svg>' +
        "</div>" +
        "<div>" +
        '<div class="purok-manager-name" id="purok-name-' +
        escHtml(p) +
        '">' +
        "Purok " +
        escHtml(p) +
        "</div>" +
        '<div class="purok-manager-count">' +
        count +
        " resident" +
        (count !== 1 ? "s" : "") +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="purok-manager-item-right">' +
        '<button class="btn-icon btn-view"' +
        " onclick=\"showPage('purok','" +
        escHtml(p) +
        "')\"" +
        ' title="View Purok ' +
        escHtml(p) +
        '">' +
        '<svg class="icon" aria-hidden="true"><use href="#icon-users"/></svg>' +
        "</button>" +
        '<button class="btn-icon btn-edit" ' +
        ' data-action="edit-purok"' +
        ' data-purok="' +
        escHtml(p) +
        '"' +
        ' title="Edit Purok ' +
        escHtml(p) +
        '">' +
        '<svg class="icon" aria-hidden="true"><use href="#icon-edit"/></svg>' +
        "</button>" +
        '<button class="btn-icon ' +
        (hasResidents ? "btn-ghost purok-delete-blocked" : "btn-delete") +
        '"' +
        ' data-action="delete-purok"' +
        ' data-purok="' +
        escHtml(p) +
        '"' +
        ' title="' +
        (hasResidents
          ? "Reassign " + count + " resident(s) before deleting"
          : "Delete Purok " + escHtml(p)) +
        '">' +
        '<svg class="icon" aria-hidden="true"><use href="#icon-trash"/></svg>' +
        "</button>" +
        "</div>" +
        "</div>"
      );
    })
    .join("");
}

/* ============================================================
   DOCUMENT-LEVEL DELEGATION — Purok Manager actions
   Handles: edit-purok, save-purok-edit, cancel-purok-edit, delete-purok
============================================================ */
document.addEventListener("click", function (e) {
  // Walk up past SVG boundary
  var node = e.target;
  while (node && node !== document.documentElement) {
    if (node.getAttribute && node.getAttribute("data-action")) break;
    node = node.parentNode;
  }
  if (!node || node === document.documentElement) return;

  var action = node.getAttribute("data-action");
  var purokName = node.getAttribute("data-purok");
  if (!action || !purokName) return;

  // ─── EDIT PUROK ─────────────────────────────────────
  if (action === "edit-purok") {
    enablePurokEdit(purokName);
    return;
  }

  // ─── SAVE PUROK EDIT ────────────────────────────────
  if (action === "save-purok-edit") {
    savePurokEdit(purokName);
    return;
  }

  // ─── CANCEL PUROK EDIT ──────────────────────────────
  if (action === "cancel-purok-edit") {
    cancelPurokEdit(purokName);
    return;
  }

  // ─── DELETE PUROK ───────────────────────────────────
  if (action === "delete-purok") {
    const count = db.residents.filter(function (r) {
      return r.purok === purokName;
    }).length;
    if (count > 0) {
      showToast(
        "Cannot delete Purok " +
          purokName +
          " — " +
          count +
          " resident(s) still assigned. Reassign or delete them first.",
        "warning",
      );
      return;
    }

    // Confirm then delete
    if (
      !confirm(
        "Delete Purok " +
          purokName +
          "?\n\nThis removes it from the sidebar and dropdown. No residents are assigned to it.",
      )
    )
      return;

    const result = deletePurok(purokName);
    if (result.ok) {
      showToast("Purok " + purokName + " deleted.");
    } else {
      showToast(result.error, "danger");
    }
    return;
  }
});

/* ============================================================
   PUROK EDIT — Inline editing functions
============================================================ */

/**
 * Enable inline editing for a purok name
 */
function enablePurokEdit(purokName) {
  const row = document.getElementById("purok-row-" + escHtml(purokName));
  if (!row) return;

  // Create edit mode HTML
  const editHtml =
    '<div class="purok-edit-mode" id="purok-edit-' +
    escHtml(purokName) +
    '">' +
    '<div class="purok-manager-item-left">' +
    '<div class="purok-manager-badge">' +
    '<svg class="icon" aria-hidden="true"><use href="#icon-home"/></svg>' +
    "</div>" +
    '<input type="text" class="purok-edit-input" id="purok-edit-input-' +
    escHtml(purokName) +
    '" ' +
    'value="' +
    escHtml(purokName) +
    '" ' +
    'maxlength="20" ' +
    'placeholder="Enter new purok name" />' +
    "</div>" +
    '<div class="purok-manager-item-right">' +
    '<button class="btn-icon btn-primary" data-action="save-purok-edit" data-purok="' +
    escHtml(purokName) +
    '" title="Save changes">' +
    '<svg class="icon" aria-hidden="true"><use href="#icon-check"/></svg>' +
    "</button>" +
    '<button class="btn-icon btn-outline" data-action="cancel-purok-edit" data-purok="' +
    escHtml(purokName) +
    '" title="Cancel editing">' +
    '<svg class="icon" aria-hidden="true"><use href="#icon-close"/></svg>' +
    "</button>" +
    "</div>" +
    "</div>";

  row.innerHTML = editHtml;

  // Focus the input and select all text
  var input = document.getElementById("purok-edit-input-" + escHtml(purokName));
  if (input) {
    input.focus();
    input.select();
    // Allow Enter to save and Escape to cancel
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        savePurokEdit(purokName);
      } else if (e.key === "Escape") {
        cancelPurokEdit(purokName);
      }
    });
  }
}

/**
 * Save the edited purok name
 */
function savePurokEdit(oldName) {
  const input = document.getElementById("purok-edit-input-" + escHtml(oldName));
  if (!input) return;

  const newName = input.value.trim();

  if (!newName) {
    showToast("Purok name cannot be empty.", "warning");
    input.focus();
    return;
  }

  const result = updatePurok(oldName, newName);
  if (result.ok) {
    showToast("Purok renamed successfully: " + oldName + " → " + newName);
  } else {
    showToast(result.error, "danger");
    input.focus();
  }
}

/**
 * Cancel editing and restore the original view
 */
function cancelPurokEdit(purokName) {
  renderPurokManager();
}

/* ============================================================
   ADD PUROK — form handler (called from settings page button)
============================================================ */
function handleAddPurok() {
  const input = document.getElementById("new-purok-input");
  const errEl = document.getElementById("new-purok-error");
  if (!input) return;

  const name = input.value.trim();

  if (!name) {
    if (errEl) {
      errEl.textContent = "Please enter a purok name.";
      errEl.style.display = "block";
    }
    input.focus();
    return;
  }

  const result = addPurok(name);
  if (result.ok) {
    input.value = "";
    if (errEl) errEl.style.display = "none";
    showToast("Purok " + name + " added successfully.");
  } else {
    if (errEl) {
      errEl.textContent = result.error;
      errEl.style.display = "block";
    }
    input.focus();
  }
}

/* ============================================================
   NAVIGATION
============================================================ */
function showPage(page, purokId) {
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.remove("active");
  });
  document.querySelectorAll(".nav-item").forEach(function (n) {
    n.classList.remove("active");
    n.removeAttribute("aria-current");
  });

  if (page !== "login" && page !== "register" && !isUserLoggedIn()) {
    showPage("login");
    return;
  }

  switch (page) {
    case "dashboard":
      _activatePage("page-dashboard");
      _activateNav('[data-page="dashboard"]');
      renderDashboard();
      break;

    case "purok":
      if (!purokId) break;
      // Guard: purok must still exist in db
      if (db.puroks.indexOf(String(purokId)) === -1) {
        showToast("Purok " + purokId + " no longer exists.", "warning");
        showPage("dashboard");
        return;
      }
      currentPurok = String(purokId);
      _activatePage("page-purok");
      _activateNav("#nav-purok-" + currentPurok);
      _setText("purok-page-title", "Purok " + currentPurok);
      _setText(
        "purok-page-sub",
        "Residents registry — Purok " +
          currentPurok +
          ", Barangay Golden Ribbon",
      );
      _setText(
        "purok-table-title",
        "Purok " + currentPurok + " — Resident Records",
      );
      _setText(
        "purok-table-sub",
        "All registered inhabitants of Purok " + currentPurok,
      );
      _resetVal("purok-search", "");
      _resetVal("purok-filter-gender", "");
      _resetVal("purok-filter-civil", "");
      _resetVal("purok-filter-indicator", "");
      switchTab("residents");
      renderPurokTable();
      break;

    case "search":
      _activatePage("page-search");
      _activateNav('[data-page="search"]');
      _resetVal("global-search-input", "");
      const area = document.getElementById("search-results-area");
      if (area) {
        area.innerHTML =
          '<div class="empty-state">' +
          '<svg class="empty-icon" aria-hidden="true"><use href="#icon-search"/></svg>' +
          '<p class="empty-title">Enter a name to begin searching</p>' +
          '<p class="empty-sub">Results will appear here</p>' +
          "</div>";
      }
      setTimeout(function () {
        const inp = document.getElementById("global-search-input");
        if (inp) inp.focus();
      }, 180);
      break;

    case "settings":
      _activatePage("page-settings");
      _activateNav('[data-page="settings"]');
      renderPurokManager();
      _updateSysInfo();
      break;

    case "login":
      if (isUserLoggedIn()) {
        showPage("dashboard");
        return;
      }
      _activatePage("page-login");
      document.body.classList.add("auth-locked");
      break;

    case "register":
      if (isUserLoggedIn()) {
        showPage("dashboard");
        return;
      }
      _activatePage("page-register");
      document.body.classList.add("auth-locked");
      break;
  }
}

/* ============================================================
   HELPERS
============================================================ */
function _activatePage(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}
function _activateNav(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add("active");
    el.setAttribute("aria-current", "page");
  }
}
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function _resetVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// Allow Enter key on purok cards
document.addEventListener("keydown", function (e) {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.classList.contains("purok-card")
  ) {
    e.preventDefault();
    e.target.click();
  }
});

// Allow Enter in add-purok input
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && e.target.id === "new-purok-input") {
    e.preventDefault();
    handleAddPurok();
  }
});

/* ============================================================
   BOOTSTRAP
============================================================ */
(function init() {
  loadDB();
  buildSidebar(); // dynamic sidebar from db.puroks
  rebuildPurokSelect(); // dynamic modal dropdown

  currentUserEmail =
    db.currentUser && getUserByEmail(db.currentUser) ? db.currentUser : null;
  updateAuthHeader();
  document.body.classList.toggle("auth-locked", !isUserLoggedIn());

  if (isUserLoggedIn()) {
    showPage("dashboard");
    renderDashboard();
    _updateSysInfo();
  } else if (!db.users || db.users.length === 0) {
    showPage("register");
  } else {
    showPage("login");
  }

  document
    .getElementById("login-form")
    ?.addEventListener("submit", handleLogin);
  document
    .getElementById("register-form")
    ?.addEventListener("submit", handleRegister);

  console.info(
    "[RBI] System initialised. Puroks:",
    db.puroks.length,
    "| Residents:",
    db.residents.length,
  );
})();

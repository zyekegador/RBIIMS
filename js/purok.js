/* ============================================================
   js/purok.js  —  Purok residents table + summary panels

   FIX: Event delegation is on `document` (not tbody).
   We use a manual while-loop walk instead of closest() because
   closest() stops at SVG element boundaries in some browsers,
   meaning clicks on <svg><use> inside a button return null.
   No DOMContentLoaded wrapper — scripts load at bottom of body.
============================================================ */

let currentPurok = "1";

/* ============================================================
   DOCUMENT-LEVEL EVENT DELEGATION
   Handles edit/delete for both the purok table and search results.
============================================================ */
document.addEventListener("click", function (e) {
  // Manual walk — crosses SVG boundary where closest() may fail
  var node = e.target;
  while (node && node !== document.documentElement) {
    if (node.getAttribute && node.getAttribute("data-action")) break;
    node = node.parentNode;
  }
  if (!node || node === document.documentElement) return;

  var action = node.getAttribute("data-action");
  var id = node.getAttribute("data-id");
  if (!action || !id) return;

  if (action === "edit") openEditModal(id);
  if (action === "delete") openDeleteModal(id);
  if (action === "search-edit") {
    var purok = node.getAttribute("data-purok");
    showPage("purok", purok);
    setTimeout(function () {
      openEditModal(id);
    }, 280);
  }
});

/* ============================================================
   TAB SWITCHING
============================================================ */
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(function (b) {
    var on = b.id === "tab-btn-" + tab;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on);
  });
  document.querySelectorAll(".tab-panel").forEach(function (p) {
    p.classList.toggle("active", p.id === "tab-" + tab);
  });
  if (tab === "summary") renderPurokSummary();
}

/* ============================================================
   RENDER RESIDENTS TABLE
============================================================ */
function renderPurokTable(filtered) {
  var tbody = document.getElementById("purok-tbody");
  if (!tbody) return;

  var all = getResidentsByPurok(currentPurok);
  var residents = typeof filtered !== "undefined" ? filtered : all;

  // Group by household
  var groups = {};
  residents.forEach(function (r) {
    var key = String(r.household || 0);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  // Sort within each household: Head first, then alphabetical
  Object.keys(groups).forEach(function (k) {
    groups[k].sort(function (a, b) {
      if (a.role === "Head" && b.role !== "Head") return -1;
      if (b.role === "Head" && a.role !== "Head") return 1;
      return (a.lastName || "").localeCompare(b.lastName || "");
    });
  });

  // Sort household keys numerically
  var hhKeys = Object.keys(groups).sort(function (a, b) {
    return Number(a) - Number(b);
  });

  var html = "";
  var rowNum = 0;

  if (hhKeys.length === 0) {
    html =
      '<tr><td colspan="14">' +
      '<div class="empty-state">' +
      '<svg class="empty-icon" aria-hidden="true"><use href="#icon-users"/></svg>' +
      '<p class="empty-title">No residents recorded for Purok ' +
      escHtml(currentPurok) +
      "</p>" +
      '<p class="empty-sub">Click \u201cAdd Resident\u201d to begin data entry.</p>' +
      "</div>" +
      "</td></tr>";
  }

  hhKeys.forEach(function (hhk) {
    var divLabel =
      hhk === "0" ? "No Household Assigned" : "Household No. " + hhk;
    html +=
      '<tr class="row-hh-divider"><td colspan="14">' +
      escHtml(divLabel) +
      "</td></tr>";

    groups[hhk].forEach(function (r) {
      rowNum++;
      var isHead = r.role === "Head";
      var age = resolveAge(r);
      var ageStr = age >= 0 ? String(age) : "\u2014";

      var roleCell = isHead
        ? '<span class="badge-head"><svg class="icon" aria-hidden="true"><use href="#icon-star"/></svg> Head</span>'
        : '<span class="badge-member">Member</span>';

      var sexCell =
        r.gender === "Male"
          ? '<span class="sex-m">M</span>'
          : '<span class="sex-f">F</span>';

      // Buttons use data-action + data-id — NO onclick attributes
      var safeId = escHtml(r.id);
      var safeName = escHtml((r.firstName || "") + " " + (r.lastName || ""));

      var editBtn =
        '<button class="btn-icon btn-edit"' +
        ' data-action="edit"' +
        ' data-id="' +
        safeId +
        '"' +
        ' title="Edit ' +
        safeName +
        '"' +
        ' aria-label="Edit ' +
        safeName +
        '">' +
        '<svg class="icon" aria-hidden="true"><use href="#icon-edit"/></svg>' +
        "</button>";

      var delBtn =
        '<button class="btn-icon btn-delete"' +
        ' data-action="delete"' +
        ' data-id="' +
        safeId +
        '"' +
        ' title="Delete ' +
        safeName +
        '"' +
        ' aria-label="Delete ' +
        safeName +
        '">' +
        '<svg class="icon" aria-hidden="true"><use href="#icon-trash"/></svg>' +
        "</button>";

      html +=
        '<tr class="' +
        (isHead ? "row-head" : "") +
        '">' +
        '<td class="row-num">' +
        rowNum +
        "</td>" +
        "<td>" +
        roleCell +
        "</td>" +
        "<td><strong>" +
        escHtml(r.lastName || "") +
        "</strong></td>" +
        "<td>" +
        escHtml(r.firstName || "") +
        "</td>" +
        "<td>" +
        escHtml(r.middleName || "") +
        "</td>" +
        '<td style="font-size:11px">' +
        escHtml(r.ext || "") +
        "</td>" +
        '<td style="font-size:11px">' +
        escHtml(r.placeOfBirth || "") +
        "</td>" +
        '<td style="font-size:11px">' +
        escHtml(r.birthdate || "\u2014") +
        "</td>" +
        '<td class="age-val">' +
        ageStr +
        "</td>" +
        "<td>" +
        sexCell +
        "</td>" +
        '<td style="font-size:12px">' +
        escHtml(r.civilStatus || "") +
        "</td>" +
        '<td style="font-size:11px">' +
        escHtml(r.citizenship || "") +
        "</td>" +
        '<td style="font-size:11.5px">' +
        escHtml(r.occupation || "") +
        "</td>" +
        "<td>" +
        buildIndicatorBadges(r) +
        "</td>" +
        '<td><div class="table-actions">' +
        editBtn +
        delBtn +
        "</div></td>" +
        "</tr>";
    });
  });

  tbody.innerHTML = html;

  // Footer counts: 1 head = 1 household
  var hhCount = all.filter(function (r) {
    return r.role === "Head";
  }).length;

  var recEl = document.getElementById("purok-record-count");
  var hhEl = document.getElementById("purok-hh-count");
  if (recEl) recEl.textContent = residents.length + " record(s)";
  if (hhEl) hhEl.textContent = hhCount + " household(s)";
}

/* ============================================================
   FILTERS
============================================================ */
function filterPurokTable() {
  var searchEl = document.getElementById("purok-search");
  var genderEl = document.getElementById("purok-filter-gender");
  var civilEl = document.getElementById("purok-filter-civil");
  var indEl = document.getElementById("purok-filter-indicator");

  var search = searchEl ? searchEl.value.toLowerCase().trim() : "";
  var gender = genderEl ? genderEl.value : "";
  var civil = civilEl ? civilEl.value : "";
  var ind = indEl ? indEl.value : "";

  var residents = getResidentsByPurok(currentPurok);

  if (search) {
    residents = residents.filter(function (r) {
      return (
        (
          (r.lastName || "") +
          " " +
          (r.firstName || "") +
          " " +
          (r.middleName || "")
        )
          .toLowerCase()
          .indexOf(search) !== -1
      );
    });
  }
  if (gender)
    residents = residents.filter(function (r) {
      return r.gender === gender;
    });
  if (civil)
    residents = residents.filter(function (r) {
      return r.civilStatus === civil;
    });
  if (ind)
    residents = residents.filter(function (r) {
      if (ind === "seniorCitizen")
        return r.seniorCitizen === true || resolveAge(r) >= 60;
      return r[ind] === true;
    });

  renderPurokTable(residents);
}

function clearPurokFilters() {
  [
    "purok-search",
    "purok-filter-gender",
    "purok-filter-civil",
    "purok-filter-indicator",
  ].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = "";
  });
  renderPurokTable();
}

/* ============================================================
   PUROK SUMMARY PANELS
============================================================ */
function renderPurokSummary() {
  var container = document.getElementById("purok-summary-content");
  if (!container) return;

  var residents = getResidentsByPurok(currentPurok);
  var s = statsForResidents(residents);

  function totRow(m, f, t) {
    return (
      '<tr class="total-row"><td>Overall Total</td><td>' +
      m +
      "</td><td>" +
      f +
      "</td><td>" +
      t +
      "</td></tr>"
    );
  }

  var civilRows = CIVIL_STATUSES.map(function (cs) {
    return (
      "<tr><td>" +
      escHtml(cs) +
      "</td>" +
      "<td>" +
      s.civil[cs].male +
      "</td>" +
      "<td>" +
      s.civil[cs].female +
      "</td>" +
      "<td>" +
      s.civil[cs].total +
      "</td></tr>"
    );
  }).join("");

  var ageRows = s.ageGroups
    .map(function (g) {
      return (
        "<tr><td>" +
        escHtml(g.label) +
        "</td>" +
        "<td>" +
        g.male +
        "</td><td>" +
        g.female +
        "</td><td>" +
        g.total +
        "</td></tr>"
      );
    })
    .join("");

  var indRows = s.indicators
    .map(function (i) {
      return (
        "<tr><td>" +
        escHtml(i.label) +
        "</td>" +
        "<td>" +
        i.male +
        "</td><td>" +
        i.female +
        "</td><td>" +
        i.total +
        "</td></tr>"
      );
    })
    .join("");

  container.innerHTML =
    '<div class="summary-panel">' +
    '<div class="summary-panel-header" style="background:var(--clr-gold);color:var(--clr-navy)">1. General Summary \u2014 Purok ' +
    escHtml(currentPurok) +
    "</div>" +
    '<table class="summary-table"><tbody>' +
    "<tr><td>Total Population</td><td>" +
    s.total +
    "</td></tr>" +
    "<tr><td>Total Households</td><td>" +
    s.households +
    "</td></tr>" +
    "<tr><td>Male</td><td>" +
    s.male +
    "</td></tr>" +
    "<tr><td>Female</td><td>" +
    s.female +
    "</td></tr>" +
    "</tbody></table></div>" +
    '<div class="summary-panel">' +
    '<div class="summary-panel-header">2. Sex Distribution</div>' +
    '<table class="summary-table"><thead><tr><th>Sex</th><th>Count</th></tr></thead><tbody>' +
    "<tr><td>Male</td><td>" +
    s.male +
    "</td></tr>" +
    "<tr><td>Female</td><td>" +
    s.female +
    "</td></tr>" +
    '<tr class="total-row"><td>Overall Total</td><td>' +
    s.total +
    "</td></tr>" +
    "</tbody></table></div>" +
    '<div class="summary-panel">' +
    '<div class="summary-panel-header">3. Civil Status</div>' +
    '<table class="summary-table"><thead><tr><th>Status</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>' +
    "<tbody>" +
    civilRows +
    totRow(s.male, s.female, s.total) +
    "</tbody></table></div>" +
    '<div class="summary-panel">' +
    '<div class="summary-panel-header">4. Age Bracket Breakdown</div>' +
    '<table class="summary-table"><thead><tr><th>Age Group</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>' +
    "<tbody>" +
    ageRows +
    totRow(s.male, s.female, s.total) +
    "</tbody></table></div>" +
    '<div class="summary-panel" style="grid-column:1/-1">' +
    '<div class="summary-panel-header">5. Socio-Economic &amp; Special Indicators</div>' +
    '<table class="summary-table"><thead><tr><th>Indicator</th><th>Male</th><th>Female</th><th>Total</th></tr></thead>' +
    "<tbody>" +
    indRows +
    totRow(
      s.indicatorTotals.male,
      s.indicatorTotals.female,
      s.indicatorTotals.total,
    ) +
    "</tbody></table></div>";
}

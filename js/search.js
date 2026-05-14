/* ============================================================
   js/search.js  —  Cross-purok global record search

   FIX: Enter-key listener wired immediately (no DOMContentLoaded).
   The search-edit action is handled by the document-level
   delegation in purok.js — no duplicate listener here.
============================================================ */

function globalSearch() {
  var inputEl = document.getElementById("global-search-input");
  var area = document.getElementById("search-results-area");
  if (!area) return;

  var q = inputEl ? inputEl.value.trim().toLowerCase() : "";

  if (!q) {
    area.innerHTML =
      '<div class="empty-state">' +
      '<svg class="empty-icon" aria-hidden="true"><use href="#icon-search"/></svg>' +
      '<p class="empty-title">Enter a name to begin searching</p>' +
      '<p class="empty-sub">Results will appear here</p>' +
      "</div>";
    return;
  }

  var results = db.residents.filter(function (r) {
    return (
      (
        (r.lastName || "") +
        " " +
        (r.firstName || "") +
        " " +
        (r.middleName || "")
      )
        .toLowerCase()
        .indexOf(q) !== -1
    );
  });

  if (!results.length) {
    area.innerHTML =
      '<div class="empty-state">' +
      '<svg class="empty-icon" aria-hidden="true"><use href="#icon-search"/></svg>' +
      '<p class="empty-title">No records found for \u201c' +
      escHtml(q) +
      "\u201d</p>" +
      '<p class="empty-sub">Try searching by surname only, or check the spelling.</p>' +
      "</div>";
    return;
  }

  var rows = results
    .map(function (r) {
      var age = resolveAge(r);
      var roleCell =
        r.role === "Head"
          ? '<span class="badge-head"><svg class="icon" aria-hidden="true"><use href="#icon-star"/></svg> Head</span>'
          : '<span class="badge-member">Member</span>';
      var sexCell =
        r.gender === "Male"
          ? '<span class="sex-m">Male</span>'
          : '<span class="sex-f">Female</span>';
      var safeName = escHtml((r.firstName || "") + " " + (r.lastName || ""));

      return (
        "<tr>" +
        "<td><strong>" +
        escHtml(r.lastName || "") +
        "</strong>, " +
        escHtml(r.firstName || "") +
        " " +
        escHtml(r.middleName || "") +
        " " +
        escHtml(r.ext || "") +
        "</td>" +
        '<td><span class="purok-badge">' +
        escHtml(r.purok) +
        "</span></td>" +
        "<td>" +
        roleCell +
        "</td>" +
        "<td>" +
        escHtml(r.placeOfBirth || "\u2014") +
        "</td>" +
        '<td class="age-val">' +
        (age >= 0 ? age : "\u2014") +
        "</td>" +
        "<td>" +
        sexCell +
        "</td>" +
        "<td>" +
        escHtml(r.civilStatus || "\u2014") +
        "</td>" +
        "<td>" +
        escHtml(r.occupation || "\u2014") +
        "</td>" +
        "<td>" +
        buildIndicatorBadges(r) +
        "</td>" +
        "<td>" +
        '<button class="btn btn-outline btn-xs"' +
        ' data-action="search-edit"' +
        ' data-id="' +
        escHtml(r.id) +
        '"' +
        ' data-purok="' +
        escHtml(r.purok) +
        '"' +
        ' aria-label="Edit ' +
        safeName +
        '">' +
        '<svg class="icon" aria-hidden="true"><use href="#icon-edit"/></svg> Edit' +
        "</button>" +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  area.innerHTML =
    '<div class="notice notice-success" style="margin-bottom:var(--sp-3)">' +
    '<svg class="icon" aria-hidden="true"><use href="#icon-check"/></svg>' +
    "Found <strong>" +
    results.length +
    "</strong> record(s) matching" +
    " \u201c" +
    escHtml(q) +
    "\u201d" +
    "</div>" +
    '<div class="table-card">' +
    '<div class="table-card-header">' +
    '<div><h3 class="table-card-title">Search Results</h3>' +
    '<p class="table-card-sub">Matching residents across all puroks</p></div>' +
    "</div>" +
    '<div class="table-wrapper" tabindex="0">' +
    '<table class="data-table"><thead><tr>' +
    "<th>Name</th><th>Purok</th><th>Role</th><th>Place of Birth</th><th>Age</th>" +
    "<th>Sex</th><th>Civil Status</th><th>Occupation</th>" +
    "<th>Indicators</th><th>Action</th>" +
    "</tr></thead>" +
    "<tbody>" +
    rows +
    "</tbody>" +
    "</table>" +
    "</div>" +
    '<div class="table-footer">' +
    '<span class="table-count">' +
    results.length +
    " result(s)</span>" +
    "</div>" +
    "</div>";
}

// Wire Enter key immediately — no DOMContentLoaded wrapper needed
(function () {
  var inp = document.getElementById("global-search-input");
  if (inp) {
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") globalSearch();
    });
  }
})();

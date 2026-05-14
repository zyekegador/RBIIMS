/* ════════════════════════════════════════════════════════════
   js/dashboard.js  —  Dashboard page rendering
════════════════════════════════════════════════════════════ */

function renderDashboard() {
  const all = db.residents;
  const s = statsForResidents(all);

  /* ── Top stat cards ────────────────────────────────────── */
  _setText("d-total-pop", s.total);
  _setText("d-total-hh", s.households);
  _setText("d-total-male", s.male);
  _setText("d-total-female", s.female);
  _setText(
    "d-total-senior",
    all.filter((r) => r.seniorCitizen || resolveAge(r) >= 60).length,
  );
  _setText("d-total-pwd", all.filter((r) => r.pwd).length);

  /* ── Purok population cards ────────────────────────────── */
  const grid = document.getElementById("purok-pop-grid");
  if (grid) {
    grid.innerHTML = (db.puroks || [])
      .map((p) => {
        const cnt = all.filter((r) => r.purok === p).length;
        return `
        <div class="purok-card" onclick="showPage('purok','${p}')" role="button"
          tabindex="0" aria-label="View Purok ${p} — ${cnt} residents"
          onkeydown="if(event.key==='Enter')showPage('purok','${p}')">
          <div class="purok-card-badge">${escHtml(p)}</div>
          <div class="purok-card-label">Purok ${escHtml(p)}</div>
          <div class="purok-card-count">${cnt}</div>
          <div class="purok-card-sub">Residents</div>
        </div>`;
      })
      .join("");
  }

  /* ── Sex distribution ──────────────────────────────────── */
  _setHtml(
    "d-sex-body",
    `
    <tr><td>Male</td>  <td>${s.male}</td></tr>
    <tr><td>Female</td><td>${s.female}</td></tr>
    <tr class="total-row"><td>Overall Total</td><td>${s.total}</td></tr>`,
  );

  /* ── Civil status ──────────────────────────────────────── */
  _setHtml(
    "d-civil-body",
    CIVIL_STATUSES.map(
      (cs) => `
      <tr>
        <td>${escHtml(cs)}</td>
        <td>${s.civil[cs].male}</td>
        <td>${s.civil[cs].female}</td>
        <td>${s.civil[cs].total}</td>
      </tr>`,
    ).join("") +
      `<tr class="total-row">
       <td>Overall Total</td>
       <td>${s.male}</td><td>${s.female}</td><td>${s.total}</td>
     </tr>`,
  );

  /* ── Age brackets ──────────────────────────────────────── */
  _setHtml(
    "d-age-body",
    s.ageGroups
      .map(
        (g) => `
      <tr>
        <td>${escHtml(g.label)}</td>
        <td>${g.male}</td><td>${g.female}</td><td>${g.total}</td>
      </tr>`,
      )
      .join("") +
      `<tr class="total-row">
       <td>Overall Total</td>
       <td>${s.male}</td><td>${s.female}</td><td>${s.total}</td>
     </tr>`,
  );

  /* ── Socio-Economic Indicators ───────────────────── */

  _setHtml(
    "d-indicator-body",

    s.indicators
      .map(
        (ind) => `
      <tr>
        <td>${escHtml(ind.label)}</td>
        <td>${ind.male}</td>
        <td>${ind.female}</td>
        <td>${ind.total}</td>
      </tr>
    `,
      )
      .join("") +
      `
    <tr class="total-row">
      <td>Overall Total</td>
      <td>${s.indicatorTotals.male}</td>
      <td>${s.indicatorTotals.female}</td>
      <td>${s.indicatorTotals.total}</td>
    </tr>
    `,
  );
}

/* ── Helpers ─────────────────────────────────────────────── */
function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function _setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/* ============================================================
   js/modal.js  —  Add / Edit / Delete resident modals

   FIX: Removed all DOMContentLoaded wrappers.
   Scripts load at the bottom of <body> — DOM is already fully
   parsed. DOMContentLoaded wrappers on bottom-of-body scripts
   can fire AFTER init() has already run, causing the birthdate
   listener to never attach (the event was already dispatched).
   
   Birthdate listener is wired immediately at module load time.
============================================================ */

var _editingId = null;
var _deleteId  = null;

/* ============================================================
   OPEN / CLOSE
============================================================ */
function openModal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  // Focus first usable field after transition
  setTimeout(function() {
    var f = el.querySelector('input:not([readonly]):not([type=checkbox]), select');
    if (f) f.focus();
  }, 230);
}

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

// Close modal when clicking the dark overlay
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

/* ============================================================
   FORM HELPERS
============================================================ */
var REQUIRED_FIELDS = [
  { id: 'f-lastname',    errId: 'err-lastname',    label: 'Last Name'    },
  { id: 'f-firstname',   errId: 'err-firstname',   label: 'First Name'   },
  { id: 'f-birthdate',   errId: 'err-birthdate',   label: 'Birthdate'    },
  { id: 'f-gender',      errId: 'err-gender',      label: 'Sex'          },
  { id: 'f-citizenship', errId: 'err-citizenship', label: 'Citizenship'  },
  { id: 'f-civil',       errId: 'err-civil',       label: 'Civil Status' },
  { id: 'f-purok',       errId: 'err-purok',       label: 'Purok'        },
];

function _fv(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function _sv(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = (val != null && val !== undefined) ? val : '';
}
function _fc(id) {
  var el = document.getElementById(id);
  return el ? el.checked : false;
}
function _sc(id, val) {
  var el = document.getElementById(id);
  if (el) el.checked = !!val;
}

function _clearForm() {
  ['f-lastname','f-firstname','f-middlename','f-ext','f-pob',
   'f-birthdate','f-occupation','f-age','f-household']
    .forEach(function(id) { _sv(id, ''); });

  ['f-gender','f-citizenship','f-civil','f-purok']
    .forEach(function(id) { _sv(id, ''); });
  _sv('f-role', 'Member');

  ['f-employed','f-unemployed','f-senior','f-ofw','f-pwd',
   'f-soloparent','f-osy','f-osc','f-student','f-ip','f-fourps']
    .forEach(function(id) { _sc(id, false); });

  _clearValidation();
}

function _clearValidation() {
  REQUIRED_FIELDS.forEach(function(f) {
    var ctrl = document.getElementById(f.id);
    var err  = document.getElementById(f.errId);
    if (ctrl) ctrl.classList.remove('is-invalid');
    if (err)  err.textContent = '';
  });
  var banner = document.getElementById('form-error-banner');
  if (banner) banner.style.display = 'none';
}

function _validate() {
  _clearValidation();
  var valid  = true;
  var errors = [];

  REQUIRED_FIELDS.forEach(function(f) {
    var el  = document.getElementById(f.id);
    var err = document.getElementById(f.errId);
    if (!el) return;
    if (!el.value.trim()) {
      el.classList.add('is-invalid');
      if (err) err.textContent = f.label + ' is required.';
      errors.push(f.label);
      valid = false;
    }
  });

  // Future date check
  var bdEl = document.getElementById('f-birthdate');
  if (bdEl && bdEl.value) {
    var parts = bdEl.value.split('-').map(Number);
    if (parts.length === 3) {
      var bd    = new Date(parts[0], parts[1] - 1, parts[2]);
      var today = new Date(); today.setHours(0,0,0,0);
      if (bd > today) {
        bdEl.classList.add('is-invalid');
        var e2 = document.getElementById('err-birthdate');
        if (e2) e2.textContent = 'Birthdate cannot be in the future.';
        errors.push('Birthdate');
        valid = false;
      }
    }
  }

  if (!valid) {
    var banner = document.getElementById('form-error-banner');
    var text   = document.getElementById('form-error-text');
    if (banner && text) {
      text.textContent = 'Please fill in: ' + errors.join(', ') + '.';
      banner.style.display = 'flex';
      banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  return valid;
}

/* ============================================================
   BIRTHDATE → AGE  (wired immediately, no DOMContentLoaded)
============================================================ */
(function wireBirthdateListener() {
  var bdEl = document.getElementById('f-birthdate');
  if (!bdEl) return;

  bdEl.addEventListener('change', function() {
    var age = calcAge(this.value);
    var ageEl = document.getElementById('f-age');
    if (ageEl) ageEl.value = (age !== '' && age !== undefined) ? age : '';

    // Auto-tick Senior Citizen
    var seniorEl = document.getElementById('f-senior');
    if (seniorEl && age !== '' && Number(age) >= 60) {
      seniorEl.checked = true;
    }
  });

  // Prevent typing future dates
  bdEl.max = new Date().toISOString().slice(0, 10);
})();

/* ============================================================
   ADD MODAL
============================================================ */
function openAddModal() {
  _editingId = null;

  var titleEl = document.getElementById('modal-title');
  var lblEl   = document.getElementById('btn-save-label');
  if (titleEl) titleEl.textContent = 'Add New Resident';
  if (lblEl)   lblEl.textContent   = 'Save Resident';

  rebuildPurokSelect();  // always refresh from db.puroks before opening
  _clearForm();

  // Pre-set current purok
  if (typeof currentPurok !== 'undefined') {
    _sv('f-purok', currentPurok);
    // Suggest next household number
    var existing = getResidentsByPurok(currentPurok);
    var maxHH = existing.reduce(function(m, r) { return Math.max(m, Number(r.household) || 0); }, 0);
    _sv('f-household', maxHH + 1);
  }

  // Keep max date current
  var bdEl = document.getElementById('f-birthdate');
  if (bdEl) bdEl.max = new Date().toISOString().slice(0, 10);

  openModal('resident-modal');
}

/* ============================================================
   EDIT MODAL
============================================================ */
function openEditModal(id) {
  var r = getResidentById(id);
  if (!r) { showToast('Record not found.', 'danger'); return; }

  _editingId = id;

  var titleEl = document.getElementById('modal-title');
  var lblEl   = document.getElementById('btn-save-label');
  if (titleEl) titleEl.textContent = 'Edit Resident Record';
  if (lblEl)   lblEl.textContent   = 'Update Resident';

  rebuildPurokSelect();  // always refresh from db.puroks before opening
  _clearForm();

  // Personal
  _sv('f-lastname',    r.lastName);
  _sv('f-firstname',   r.firstName);
  _sv('f-middlename',  r.middleName);
  _sv('f-ext',         r.ext);
  _sv('f-pob',         r.placeOfBirth);
  _sv('f-birthdate',   r.birthdate);
  _sv('f-age',         r.age);
  _sv('f-gender',      r.gender);
  _sv('f-citizenship', r.citizenship);
  _sv('f-civil',       r.civilStatus);
  _sv('f-occupation',  r.occupation);

  // Household
  _sv('f-purok',     r.purok);
  _sv('f-household', r.household);
  _sv('f-role',      r.role || 'Member');

  // Indicators
  _sc('f-employed',   r.employed);
  _sc('f-unemployed', r.unemployed);
  _sc('f-senior',     r.seniorCitizen);
  _sc('f-ofw',        r.ofw);
  _sc('f-pwd',        r.pwd);
  _sc('f-soloparent', r.soloParent);
  _sc('f-osy',        r.osy);
  _sc('f-osc',        r.osc);
  _sc('f-student',    r.student);
  _sc('f-ip',         r.ip);
  _sc('f-fourps',     r.fourPs);

  var bdEl = document.getElementById('f-birthdate');
  if (bdEl) bdEl.max = new Date().toISOString().slice(0, 10);

  openModal('resident-modal');
}

/* ============================================================
   SAVE (Add or Update)
============================================================ */
function saveResident() {
  if (!_validate()) return;

  var bdVal = _fv('f-birthdate');
  var age   = bdVal ? calcAge(bdVal) : (_fv('f-age') || '');
  var isSC  = _fc('f-senior') || Number(age) >= 60;

  var payload = {
    lastName:     _fv('f-lastname'),
    firstName:    _fv('f-firstname'),
    middleName:   _fv('f-middlename'),
    ext:          _fv('f-ext'),
    placeOfBirth: _fv('f-pob'),
    birthdate:    bdVal,
    age:          age,
    gender:       _fv('f-gender'),
    citizenship:  _fv('f-citizenship'),
    civilStatus:  _fv('f-civil'),
    occupation:   _fv('f-occupation'),
    purok:        _fv('f-purok'),
    household:    Number(_fv('f-household')) || 1,
    role:         _fv('f-role') || 'Member',
    employed:     _fc('f-employed'),
    unemployed:   _fc('f-unemployed'),
    seniorCitizen:isSC,
    ofw:          _fc('f-ofw'),
    pwd:          _fc('f-pwd'),
    soloParent:   _fc('f-soloparent'),
    osy:          _fc('f-osy'),
    osc:          _fc('f-osc'),
    student:      _fc('f-student'),
    ip:           _fc('f-ip'),
    fourPs:       _fc('f-fourps'),
  };

  var fullName = payload.firstName + ' ' + payload.lastName;

  if (_editingId) {
    updateResident(_editingId, payload);
    closeModal('resident-modal');
    renderPurokTable();
    showToast(fullName + ' updated successfully.');
  } else {
    addResident(payload);
    closeModal('resident-modal');
    renderPurokTable();
    showToast(fullName + ' added successfully.');
  }
}

/* ============================================================
   DELETE MODAL
============================================================ */
function openDeleteModal(id) {
  var r = getResidentById(id);
  if (!r) { showToast('Record not found.', 'danger'); return; }
  _deleteId = id;
  var nameEl = document.getElementById('delete-name');
  if (nameEl) nameEl.textContent = r.firstName + ' ' + r.lastName;
  openModal('delete-modal');
}

function confirmDelete() {
  if (!_deleteId) return;
  var r = getResidentById(_deleteId);
  var name = r ? (r.firstName + ' ' + r.lastName) : 'Record';
  deleteResident(_deleteId);
  _deleteId = null;
  closeModal('delete-modal');
  renderPurokTable();
  showToast(name + ' deleted.', 'warning');
}

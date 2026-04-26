// Top-level controller: wires DOM events, navigates between views, and
// orchestrates the scanner / students / barcode features.

import * as students from './students.js';
import * as scanner from './scanner.js';
import { renderBarcode } from './barcode.js';
import {
  showView,
  showToast,
  formatTime,
  formatDate,
  activeView,
  escapeHtml,
} from './ui.js';

const MAX_RECENT = 8;

const els = {
  todayDate:     document.getElementById('todayDate'),
  statTotal:     document.getElementById('statTotal'),
  statIn:        document.getElementById('statCheckedIn'),
  statOut:       document.getElementById('statCheckedOut'),

  scannerTitle:  document.getElementById('scannerTitle'),
  recentList:    document.getElementById('recentList'),
  recentCount:   document.getElementById('recentCount'),
  manualBtn:     document.getElementById('manualEntryBtn'),

  studentList:   document.getElementById('studentList'),
  studentSearch: document.getElementById('studentSearch'),
  gradeChips:    document.getElementById('gradeChips'),

  barcodeModal:  document.getElementById('barcodeModal'),
  barcodeName:   document.getElementById('barcodeName'),
  barcodeMeta:   document.getElementById('barcodeMeta'),
  barcodeId:     document.getElementById('barcodeId'),
  barcodeSvg:    document.getElementById('barcodeSvg'),

  manualModal:   document.getElementById('manualModal'),
  manualInput:   document.getElementById('manualInput'),
  manualSubmit:  document.getElementById('manualSubmit'),
};

let mode = null;          // 'check-in' | 'check-out'
let recent = [];
let activeGrade = 'all';
let searchQuery = '';

// ─────────────────────────── boot ───────────────────────────

function init() {
  students.init();
  els.todayDate.textContent = formatDate();
  refreshStats();
  bindHome();
  bindScanner();
  bindStudents();
  bindModals();
}

function refreshStats() {
  const s = students.getStats();
  els.statTotal.textContent = s.total;
  els.statIn.textContent    = s.in;
  els.statOut.textContent   = s.out;
}

// ─────────────────────────── home ───────────────────────────

function bindHome() {
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'check-in' || action === 'check-out') openScanner(action);
      else if (action === 'students') openStudents();
    });
  });
}

// ─────────────────────────── scanner ───────────────────────────

async function openScanner(nextMode) {
  mode = nextMode;
  recent = [];
  els.scannerTitle.textContent = nextMode === 'check-in' ? 'Check-In' : 'Check-Out';
  renderRecent();
  showView('scanner');

  await scanner.start({
    onScan: handleScan,
    onError: (err) => {
      console.error('[scanner]', err);
      showToast('Camera unavailable — use manual entry', 'error', 3500);
    },
  });
}

async function closeScanner() {
  await scanner.stop();
  mode = null;
  refreshStats();
  showView('home');
}

function bindScanner() {
  document.querySelectorAll('[data-back]').forEach((b) => {
    b.addEventListener('click', async () => {
      if (activeView() === 'scanner') await closeScanner();
      else showView('home');
    });
  });

  els.manualBtn.addEventListener('click', () => {
    els.manualModal.hidden = false;
    setTimeout(() => els.manualInput.focus(), 50);
  });

  els.manualSubmit.addEventListener('click', submitManual);
  els.manualInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitManual();
  });
}

function submitManual() {
  const value = els.manualInput.value.trim();
  if (!value) return;
  handleScan(value);
  els.manualInput.value = '';
  els.manualModal.hidden = true;
}

function handleScan(rawValue) {
  if (!mode) return;
  const id = String(rawValue).trim().toUpperCase();
  const result = students.recordCheck(id, mode);

  if (!result.ok && result.reason === 'not-found') {
    scanner.flashError();
    scanner.chimeError();
    showToast(`Unknown code: ${id}`, 'error');
    addRecent({
      kind: 'error',
      label: 'Unknown code',
      meta: id,
      time: new Date().toISOString(),
      avatar: '?',
    });
    return;
  }

  const s = result.student;

  if (!result.ok) {
    scanner.flashError();
    scanner.chimeError();
    const word = result.reason === 'already-in' ? 'already checked in' : 'already checked out';
    showToast(`${students.fullName(s)} is ${word}`, 'error', 2400);
    addRecent({
      kind: 'warn',
      label: students.fullName(s),
      meta: `Already ${result.reason === 'already-in' ? 'in' : 'out'} · Grade ${s.grade}`,
      time: new Date().toISOString(),
      avatar: students.initials(s),
    });
    return;
  }

  scanner.flashSuccess();
  scanner.chimeSuccess();
  showToast(
    `${mode === 'check-in' ? 'Checked in' : 'Checked out'} — ${students.fullName(s)}`,
    'success',
  );
  addRecent({
    kind: 'ok',
    label: students.fullName(s),
    meta: `Grade ${s.grade} · ${s.id}`,
    time: new Date().toISOString(),
    avatar: students.initials(s),
  });
}

function addRecent(entry) {
  recent.unshift(entry);
  if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
  renderRecent();
}

function renderRecent() {
  els.recentCount.textContent = recent.length;
  if (recent.length === 0) {
    els.recentList.innerHTML = '<li class="empty">No scans yet</li>';
    return;
  }
  els.recentList.innerHTML = recent
    .map((r) => `
      <li class="recent__item recent__item--${r.kind}">
        <span class="recent__avatar">${escapeHtml(r.avatar)}</span>
        <span>
          <div class="recent__name">${escapeHtml(r.label)}</div>
          <div class="recent__meta">${escapeHtml(r.meta)}</div>
        </span>
        <span class="recent__time">${formatTime(r.time)}</span>
      </li>
    `)
    .join('');
}

// ─────────────────────────── students ───────────────────────────

function openStudents() {
  showView('students');
  renderStudents();
}

function bindStudents() {
  els.studentSearch.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderStudents();
  });

  els.gradeChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    activeGrade = chip.dataset.grade;
    els.gradeChips.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('chip--active', c === chip);
    });
    renderStudents();
  });

  els.studentList.addEventListener('click', (e) => {
    const row = e.target.closest('.student');
    if (!row) return;
    openBarcode(row.dataset.id);
  });
}

function renderStudents() {
  const all = students.getAll();
  const filtered = all.filter((s) => {
    if (activeGrade !== 'all' && String(s.grade) !== activeGrade) return false;
    if (!searchQuery) return true;
    const hay = `${students.fullName(s)} ${s.id}`.toLowerCase();
    return hay.includes(searchQuery);
  });

  if (filtered.length === 0) {
    els.studentList.innerHTML = '<li class="empty">No students match</li>';
    return;
  }

  els.studentList.innerHTML = filtered
    .map((s) => `
      <li class="student" data-id="${s.id}">
        <span class="student__avatar">${students.initials(s)}</span>
        <span>
          <div class="student__name">${escapeHtml(students.fullName(s))}</div>
          <div class="student__meta">Grade ${s.grade} · ${s.id}</div>
        </span>
        <span class="badge badge--${s.status === 'in' ? 'in' : 'out'}">${s.status === 'in' ? 'In' : 'Out'}</span>
      </li>
    `)
    .join('');
}

// ─────────────────────────── barcode modal ───────────────────────────

function openBarcode(id) {
  const s = students.getById(id);
  if (!s) return;
  els.barcodeName.textContent = students.fullName(s);
  els.barcodeMeta.textContent = `Grade ${s.grade}`;
  els.barcodeId.textContent   = s.id;
  renderBarcode(els.barcodeSvg, s.id);
  els.barcodeModal.hidden = false;
}

function bindModals() {
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').hidden = true;
    });
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.hidden = true;
    });
  });

  document
    .querySelector('#barcodeModal [data-print]')
    ?.addEventListener('click', () => window.print());
}

// ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

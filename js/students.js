// Student roster + check-in/out logic. Seeded once on first run; mutations
// persist via the storage module.

import { storage } from './storage.js';

const KEY_STUDENTS = 'students';
const KEY_SEEDED   = 'seeded';

const SEED = [
  // ── Grade 1 ──
  { firstName: 'Ahmad',   lastName: 'Khan',     grade: 1 },
  { firstName: 'Fatima',  lastName: 'Ali',      grade: 1 },
  { firstName: 'Yusuf',   lastName: 'Rahman',   grade: 1 },
  { firstName: 'Maryam',  lastName: 'Hussain',  grade: 1 },
  { firstName: 'Ibrahim', lastName: 'Siddiqui', grade: 1 },
  // ── Grade 2 ──
  { firstName: 'Aisha',   lastName: 'Malik',    grade: 2 },
  { firstName: 'Bilal',   lastName: 'Ahmed',    grade: 2 },
  { firstName: 'Khadija', lastName: 'Patel',    grade: 2 },
  { firstName: 'Hamza',   lastName: 'Sheikh',   grade: 2 },
  { firstName: 'Zaynab',  lastName: 'Qureshi',  grade: 2 },
  // ── Grade 3 ──
  { firstName: 'Omar',    lastName: 'Farooq',   grade: 3 },
  { firstName: 'Sumayya', lastName: 'Akhtar',   grade: 3 },
  { firstName: 'Hassan',  lastName: 'Mahmood',  grade: 3 },
  { firstName: 'Layla',   lastName: 'Karim',    grade: 3 },
  { firstName: 'Zayd',    lastName: 'Iqbal',    grade: 3 },
  { firstName: 'Asiya',   lastName: 'Noor',     grade: 3 },
  // ── Grade 4 ──
  { firstName: 'Mustafa', lastName: 'Aziz',     grade: 4 },
  { firstName: 'Hawwa',   lastName: 'Bashir',   grade: 4 },
  { firstName: 'Anas',    lastName: 'Yusuf',    grade: 4 },
  { firstName: 'Rumaysa', lastName: 'Tariq',    grade: 4 },
  { firstName: 'Ismail',  lastName: 'Haque',    grade: 4 },
  { firstName: 'Sara',    lastName: 'Mansoor',  grade: 4 },
  // ── Grade 5 ──
  { firstName: 'Idris',   lastName: 'Saleem',   grade: 5 },
  { firstName: 'Nusayba', lastName: 'Rashid',   grade: 5 },
  { firstName: 'Ali',     lastName: 'Imran',    grade: 5 },
  { firstName: 'Maimuna', lastName: 'Khalid',   grade: 5 },
  { firstName: 'Tariq',   lastName: 'Sultan',   grade: 5 },
  { firstName: 'Safiyya', lastName: 'Adeel',    grade: 5 },
];

const makeId = (i) => 'TRB-' + String(i + 1).padStart(4, '0');

function ensureSeeded() {
  if (storage.get(KEY_SEEDED)) return;
  const students = SEED.map((s, i) => ({
    id:        makeId(i),
    firstName: s.firstName,
    lastName:  s.lastName,
    grade:     s.grade,
    status:    'out',
    history:   [],
  }));
  storage.set(KEY_STUDENTS, students);
  storage.set(KEY_SEEDED, true);
}

function save(students) {
  storage.set(KEY_STUDENTS, students);
}

// ── Public API ──

export function init() {
  ensureSeeded();
}

export function getAll() {
  return storage.get(KEY_STUDENTS, []);
}

export function getById(id) {
  if (!id) return null;
  const norm = String(id).trim().toUpperCase();
  return getAll().find((s) => s.id === norm) || null;
}

export function fullName(s) {
  return `${s.firstName} ${s.lastName}`;
}

export function initials(s) {
  return (s.firstName[0] + s.lastName[0]).toUpperCase();
}

/**
 * Mark a student as checked-in or checked-out.
 * Returns { ok, reason?, student? }.
 *   reason values: 'not-found' | 'already-in' | 'already-out'
 */
export function recordCheck(rawId, action) {
  const id = String(rawId).trim().toUpperCase();
  const list = getAll();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return { ok: false, reason: 'not-found' };

  const student = list[idx];
  const desired = action === 'check-in' ? 'in' : 'out';

  if (student.status === desired) {
    return { ok: false, reason: `already-${desired}`, student };
  }

  student.status = desired;
  student.history.push({ action, at: new Date().toISOString() });
  list[idx] = student;
  save(list);
  return { ok: true, student };
}

export function getStats() {
  const all = getAll();
  return {
    total: all.length,
    in:    all.filter((s) => s.status === 'in').length,
    out:   all.filter((s) => s.status === 'out').length,
  };
}

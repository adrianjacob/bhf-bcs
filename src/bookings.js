import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { getFirestoreDb } from './firebaseClient.js';

const ACCESS_DOC_PATH = ['app_data', 'staff_access'];
const BOOKINGS_COLLECTION = 'bookings';
const DAYS = ['Monday 1st', 'Tuesday 2nd', 'Wednesday 3rd'];
const DELETE_CONFIRM_TEXT = 'CONFIRM DELETE';

const accessCard = document.getElementById('access-card');
const bookingsCard = document.getElementById('bookings-card');
const staffLoginForm = document.getElementById('staff-login-form');
const staffPasswordInput = document.getElementById('staff-password');
const loginError = document.getElementById('login-error');
const bookingsCount = document.getElementById('bookings-count');
const bookingsTableBody = document.getElementById('bookings-table-body');
const btnGroupTime = document.getElementById('btn-group-time');
const btnGroupSection = document.getElementById('btn-group-section');
const btnDeleteAllBookings = document.getElementById('btn-delete-all-bookings');
const deleteAllDialog = document.getElementById('delete-all-dialog');
const btnCloseDeleteAllDialog = document.getElementById('btn-close-delete-all-dialog');
const btnCancelDeleteAll = document.getElementById('btn-cancel-delete-all');
const deleteConfirmInput = document.getElementById('delete-confirm-input');
const btnConfirmDeleteAll = document.getElementById('btn-confirm-delete-all');

let db;
let unsubscribeBookings = null;
let bookingsGroupMode = 'time';
let latestBookings = [];

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function sha256Hex(value) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getStaffAccessConfig() {
  const accessRef = doc(db, ...ACCESS_DOC_PATH);
  const snap = await getDoc(accessRef);
  return snap.exists() ? snap.data() : null;
}

async function checkPassword(inputPassword) {
  const accessConfig = await getStaffAccessConfig();
  if (!accessConfig || !accessConfig.passwordHash) {
    throw new Error('Staff access is not configured in Firebase yet.');
  }
  const inputHash = await sha256Hex(inputPassword);
  return inputHash === accessConfig.passwordHash;
}

async function fetchBookings() {
  const snap = await getDocs(collection(db, BOOKINGS_COLLECTION));
  const rows = [];
  snap.forEach((bookingDoc) => {
    rows.push({ id: bookingDoc.id, ...bookingDoc.data() });
  });
  return rows;
}

function sortBookings(bookings, mode) {
  const sorted = [...bookings];

  sorted.sort((a, b) => {
    if (mode === 'section') {
      const fieldDiff = (a.field || '').localeCompare(b.field || '');
      if (fieldDiff !== 0) return fieldDiff;
    }

    const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (timeDiff !== 0) return timeDiff;
    return (a.repName || '').localeCompare(b.repName || '');
  });

  return sorted;
}

function getGroupLabel(booking, mode) {
  if (mode === 'section') {
    return booking.field || 'Unassigned section';
  }
  return `${booking.day} - ${booking.startTime}-${booking.endTime}`;
}

function renderGroupToggleState() {
  const isTime = bookingsGroupMode === 'time';
  btnGroupTime.classList.toggle('is-active', isTime);
  btnGroupSection.classList.toggle('is-active', !isTime);
  btnGroupTime.setAttribute('aria-pressed', String(isTime));
  btnGroupSection.setAttribute('aria-pressed', String(!isTime));
}

function renderCurrentBookings() {
  renderBookingsTable(latestBookings);
}

function renderBookingsTable(bookings) {
  const sortedBookings = sortBookings(bookings, bookingsGroupMode);
  bookingsCount.textContent = `${sortedBookings.length} booking${sortedBookings.length === 1 ? '' : 's'} found`;

  if (sortedBookings.length === 0) {
    bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="bookings-empty">No bookings yet.</td>
      </tr>
    `;
    return;
  }

  let currentGroup = null;
  const rows = [];

  sortedBookings.forEach((booking) => {
    const groupLabel = getGroupLabel(booking, bookingsGroupMode);
    if (groupLabel !== currentGroup) {
      currentGroup = groupLabel;
      rows.push(`
        <tr class="bookings-group-row">
          <td colspan="7">${escapeHtml(groupLabel)}</td>
        </tr>
      `);
    }

    rows.push(`
      <tr>
        <td>${escapeHtml(booking.day)}</td>
        <td>${escapeHtml(booking.startTime)}-${escapeHtml(booking.endTime)}</td>
        <td>${escapeHtml(booking.repName)}</td>
        <td>${escapeHtml(booking.field)}</td>
        <td>${escapeHtml(booking.name)}</td>
        <td>${escapeHtml(booking.email)}</td>
        <td>${escapeHtml(booking.bookedAt || '—')}</td>
      </tr>
    `);
  });

  bookingsTableBody.innerHTML = rows.join('');
}

function showError(message) {
  loginError.textContent = message;
  loginError.classList.remove('hidden');
}

function closeDeleteDialog() {
  deleteAllDialog.close();
  deleteConfirmInput.value = '';
  btnConfirmDeleteAll.disabled = true;
}

function updateDeleteButtonState() {
  btnConfirmDeleteAll.disabled = deleteConfirmInput.value.trim() !== DELETE_CONFIRM_TEXT;
}

async function deleteAllBookings() {
  const snapshot = await getDocs(collection(db, BOOKINGS_COLLECTION));
  const deletions = snapshot.docs.map((bookingDoc) =>
    deleteDoc(doc(db, BOOKINGS_COLLECTION, bookingDoc.id))
  );
  await Promise.all(deletions);
}

async function unlockAndLoad() {
  accessCard.classList.add('hidden');
  bookingsCard.classList.remove('hidden');
  const bookings = await fetchBookings();
  latestBookings = bookings;
  renderCurrentBookings();

  if (unsubscribeBookings) {
    unsubscribeBookings();
  }

  unsubscribeBookings = onSnapshot(collection(db, BOOKINGS_COLLECTION), (snapshot) => {
    const rows = [];
    snapshot.forEach((bookingDoc) => {
      rows.push({ id: bookingDoc.id, ...bookingDoc.data() });
    });
    latestBookings = rows;
    renderCurrentBookings();
  });
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  loginError.classList.add('hidden');

  const password = staffPasswordInput.value.trim();
  if (!password) {
    showError('Please enter the password.');
    return;
  }

  try {
    const ok = await checkPassword(password);
    if (!ok) {
      showError('Incorrect password.');
      return;
    }
    await unlockAndLoad();
  } catch (error) {
    console.error(error);
    showError(error.message || 'Could not verify access.');
  }
}

async function initPage() {
  try {
    db = getFirestoreDb();
  } catch (error) {
    showError(error.message || 'Firebase is not configured.');
    return;
  }

  staffLoginForm.addEventListener('submit', handleLoginSubmit);

  btnGroupTime.addEventListener('click', () => {
    bookingsGroupMode = 'time';
    renderGroupToggleState();
    renderCurrentBookings();
  });

  btnGroupSection.addEventListener('click', () => {
    bookingsGroupMode = 'section';
    renderGroupToggleState();
    renderCurrentBookings();
  });

  btnDeleteAllBookings.addEventListener('click', () => {
    deleteAllDialog.showModal();
    deleteConfirmInput.focus();
  });

  btnCloseDeleteAllDialog.addEventListener('click', closeDeleteDialog);
  btnCancelDeleteAll.addEventListener('click', closeDeleteDialog);
  deleteConfirmInput.addEventListener('input', updateDeleteButtonState);

  btnConfirmDeleteAll.addEventListener('click', async () => {
    if (btnConfirmDeleteAll.disabled) return;
    btnConfirmDeleteAll.disabled = true;
    btnConfirmDeleteAll.textContent = 'Deleting...';

    try {
      await deleteAllBookings();
      closeDeleteDialog();
    } finally {
      btnConfirmDeleteAll.textContent = 'Permanently delete all';
      updateDeleteButtonState();
    }
  });

  renderGroupToggleState();
}

initPage();

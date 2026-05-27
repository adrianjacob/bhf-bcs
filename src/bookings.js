import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getFirestoreDb } from './firebaseClient.js';

const ACCESS_DOC_PATH = ['app_data', 'staff_access'];
const BOOKINGS_COLLECTION = 'bookings';
const ACCESS_SESSION_KEY = 'bhf_staff_bookings_unlocked';
const DAYS = ['Monday 1st', 'Tuesday 2nd', 'Wednesday 3rd'];

const accessCard = document.getElementById('access-card');
const bookingsCard = document.getElementById('bookings-card');
const staffLoginForm = document.getElementById('staff-login-form');
const staffPasswordInput = document.getElementById('staff-password');
const loginError = document.getElementById('login-error');
const bookingsCount = document.getElementById('bookings-count');
const bookingsTableBody = document.getElementById('bookings-table-body');
const btnRefreshBookings = document.getElementById('btn-refresh-bookings');
const btnLockBookings = document.getElementById('btn-lock-bookings');

let db;

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

  rows.sort((a, b) => {
    const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (timeDiff !== 0) return timeDiff;
    return (a.repName || '').localeCompare(b.repName || '');
  });

  return rows;
}

function renderBookingsTable(bookings) {
  bookingsCount.textContent = `${bookings.length} booking${bookings.length === 1 ? '' : 's'} found`;

  if (bookings.length === 0) {
    bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="bookings-empty">No bookings yet.</td>
      </tr>
    `;
    return;
  }

  bookingsTableBody.innerHTML = bookings
    .map(
      (booking) => `
      <tr>
        <td>${escapeHtml(booking.day)}</td>
        <td>${escapeHtml(booking.startTime)}-${escapeHtml(booking.endTime)}</td>
        <td>${escapeHtml(booking.repName)}</td>
        <td>${escapeHtml(booking.field)}</td>
        <td>${escapeHtml(booking.name)}</td>
        <td>${escapeHtml(booking.email)}</td>
        <td>${escapeHtml(booking.bookedAt || '—')}</td>
      </tr>
    `
    )
    .join('');
}

function showError(message) {
  loginError.textContent = message;
  loginError.classList.remove('hidden');
}

async function unlockAndLoad() {
  accessCard.classList.add('hidden');
  bookingsCard.classList.remove('hidden');
  const bookings = await fetchBookings();
  renderBookingsTable(bookings);
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
    sessionStorage.setItem(ACCESS_SESSION_KEY, 'true');
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
  btnRefreshBookings.addEventListener('click', async () => {
    const bookings = await fetchBookings();
    renderBookingsTable(bookings);
  });
  btnLockBookings.addEventListener('click', () => {
    sessionStorage.removeItem(ACCESS_SESSION_KEY);
    bookingsCard.classList.add('hidden');
    accessCard.classList.remove('hidden');
    staffPasswordInput.value = '';
    staffPasswordInput.focus();
  });

  if (sessionStorage.getItem(ACCESS_SESSION_KEY) === 'true') {
    await unlockAndLoad();
  }
}

initPage();

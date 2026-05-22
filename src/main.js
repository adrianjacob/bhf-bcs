import { dbService } from './dbService.js';

// Application State
let activeField = null;
let currentBookingTarget = null;
let cancelTarget = null;
let repsData = null;

// DOM Elements
const fieldListView = document.getElementById('field-list-view');
const fieldDetailView = document.getElementById('field-detail-view');
const myBookingsView = document.getElementById('my-bookings-view');
const fieldList = document.getElementById('field-list');
const btnBack = document.getElementById('btn-back');
const btnBackFromBookings = document.getElementById('btn-back-from-bookings');
const btnMyBookings = document.getElementById('btn-my-bookings');
const fieldSelect = document.getElementById('field-select');
const scheduleCard = document.getElementById('schedule-card');
const myBookingsCard = document.getElementById('my-bookings-card');

const bookingDialog = document.getElementById('booking-dialog');
const cancelDialog = document.getElementById('cancel-dialog');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelForm = document.getElementById('btn-cancel-form');
const bookingForm = document.getElementById('booking-form');
const btnCloseCancelDialog = document.getElementById('btn-close-cancel-dialog');
const btnKeepBooking = document.getElementById('btn-keep-booking');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
const cancelMessage = document.getElementById('cancel-message');

const summaryRep = document.getElementById('summary-rep');
const summaryCommittee = document.getElementById('summary-committee');
const summaryDay = document.getElementById('summary-day');
const summaryTime = document.getElementById('summary-time');
const bookingNameInput = document.getElementById('booking-name');
const bookingEmailInput = document.getElementById('booking-email');

const bookingCountBadge = document.getElementById('booking-count');

const DAYS = ['Monday 1st', 'Tuesday 2nd', 'Wednesday 3rd'];

async function initApp() {
  try {
    const data = await dbService.getAvailability();
    repsData = data;

    const fields = Object.keys(data.fields);
    if (fields.length > 0 && activeField && !fields.includes(activeField)) {
      activeField = fields[0];
    }

    renderFieldList(data.fields);
    renderFieldDropdown(data.fields);
    updateBookingStats();
    showFieldList();
    setupEventListeners();
  } catch (error) {
    console.error('App initialization failed:', error);
  }
}

function hideAllViews() {
  fieldListView.classList.add('hidden');
  fieldDetailView.classList.add('hidden');
  myBookingsView.classList.add('hidden');
}

function countAvailableSlotsForField(field) {
  const repNames = repsData.fields[field] || [];
  let count = 0;

  repNames.forEach((name) => {
    const rep = repsData.representatives[name];
    if (!rep) return;

    DAYS.forEach((day) => {
      (rep.schedule[day] || []).forEach((block) => {
        if (block.type === 'bookable') count += 1;
      });
    });
  });

  return count;
}

function fieldHasDropIn(field) {
  const repNames = repsData.fields[field] || [];

  return repNames.some((name) => {
    const rep = repsData.representatives[name];
    if (!rep) return false;

    return DAYS.some((day) =>
      (rep.schedule[day] || []).some((block) => block.type === 'drop-in')
    );
  });
}

function sortFieldNames(fields) {
  const names = Array.isArray(fields) ? fields : Object.keys(fields);
  const sorted = names.filter((name) => name !== 'Other').sort((a, b) => a.localeCompare(b));
  if (names.includes('Other')) {
    sorted.push('Other');
  }
  return sorted;
}

function renderFieldList(fields) {
  fieldList.innerHTML = '';

  sortFieldNames(fields).forEach((field) => {
    const slotCount = countAvailableSlotsForField(field);
    const hasDropIn = fieldHasDropIn(field);
    const item = document.createElement('li');
    item.className = 'field-list-item';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'field-list-btn';
    btn.innerHTML = `
      <span class="field-list-name">${field}</span>
      <span class="field-list-details">
        <span class="field-list-meta">${slotCount} bookable slot${slotCount !== 1 ? 's' : ''} available</span>
        ${hasDropIn ? '<span class="field-list-note">Drop-in times available</span>' : ''}
      </span>
    `;
    btn.addEventListener('click', () => showFieldDetail(field));
    item.appendChild(btn);
    fieldList.appendChild(item);
  });
}

function renderFieldDropdown(fields) {
  fieldSelect.innerHTML = '';

  sortFieldNames(fields).forEach((field) => {
    const option = document.createElement('option');
    option.value = field;
    option.textContent = field;
    fieldSelect.appendChild(option);
  });
}

function showFieldList() {
  hideAllViews();
  fieldListView.classList.remove('hidden');
  if (repsData) {
    renderFieldList(repsData.fields);
  }
}

function showFieldDetail(field) {
  activeField = field;
  fieldSelect.value = activeField;
  hideAllViews();
  fieldDetailView.classList.remove('hidden');
  renderCardView();
}

function showMyBookings() {
  hideAllViews();
  myBookingsView.classList.remove('hidden');
  renderMyBookings();
}

function setActiveField(field) {
  activeField = field;
  fieldSelect.value = activeField;
  renderCardView();
}

function updateBookingStats() {
  const count = Object.keys(dbService.getBookings()).length;
  bookingCountBadge.textContent = count;
  btnMyBookings.classList.toggle('hidden', count === 0);
}

async function refreshData() {
  repsData = await dbService.getAvailability();
  updateBookingStats();
}

function getRepNamesInField() {
  return repsData.fields[activeField] || [];
}

function getSessionsForFieldOnDay(day) {
  const sessions = [];

  getRepNamesInField().forEach((name) => {
    const rep = repsData.representatives[name];
    if (!rep) return;

    (rep.schedule[day] || [])
      .filter((block) => block.type !== 'unavailable')
      .forEach((block) => {
        sessions.push({ rep, block });
      });
  });

  sessions.sort((a, b) => {
    const typeOrder = { bookable: 0, 'user-booked': 1, booked: 2, 'drop-in': 3 };
    const typeDiff =
      (typeOrder[a.block.type] ?? 4) - (typeOrder[b.block.type] ?? 4);
    if (typeDiff !== 0) return typeDiff;
    return timeToMinutes(a.block.startTime) - timeToMinutes(b.block.startTime);
  });

  return sessions;
}

function buildSlotItemContent(rep, day, block) {
  const timeLabel = `<span class="slot-time"><strong>${block.startTime} - ${block.endTime}</strong></span>`;
  const repLabel = `<span class="slot-rep-name">${rep.name}</span>`;

  let action = '';

  if (block.type === 'drop-in') {
    action = '<span class="slot-badge">Drop-in</span>';
  } else if (block.type === 'booked') {
    const labelText = block.label === 'Booked slots' ? 'Booked' : block.label;
    action = `<span class="slot-badge">${labelText}</span>`;
  } else if (block.type === 'user-booked') {
    action = `
      <div class="slot-actions">
        <span class="slot-badge">Your Booking</span>
        <span class="btn-cancel">Cancel</span>
      </div>
    `;
  } else if (block.type === 'bookable') {
    action = '<span class="btn-book">Book slot</span>';
  }

  return `
    <div class="slot-info">
      ${timeLabel}
      ${repLabel}
    </div>
    <div class="slot-action">${action}</div>
  `;
}

function renderCardView() {
  scheduleCard.innerHTML = '';

  const repNamesInField = getRepNamesInField();
  if (repNamesInField.length === 0) {
    scheduleCard.innerHTML = '<div class="empty-state"><h3>No Representatives Found</h3><p>There are no representatives assigned to this field.</p></div>';
    return;
  }

  scheduleCard.innerHTML = `<h3 class="schedule-card-title">${activeField}</h3>`;

  let hasAnySessions = false;

  DAYS.forEach((day) => {
    const sessions = getSessionsForFieldOnDay(day);
    const daySec = document.createElement('div');
    daySec.className = 'day-schedule';
    daySec.innerHTML = `<h4 class="day-title">${day}</h4>`;

    if (sessions.length === 0) {
      daySec.innerHTML += '<p class="no-sessions">No sessions scheduled</p>';
    } else {
      hasAnySessions = true;
      const slotsList = document.createElement('div');
      slotsList.className = 'slots-list';

      sessions.forEach(({ rep, block }) => {
        const slotItem = document.createElement('div');
        slotItem.className = `slot-item ${block.type}`;
        slotItem.innerHTML = buildSlotItemContent(rep, day, block);

        if (block.type === 'bookable') {
          slotItem.dataset.rep = rep.name;
          slotItem.dataset.day = day;
          slotItem.dataset.start = block.startTime;
          slotItem.dataset.end = block.endTime;
          slotItem.setAttribute('role', 'button');
          slotItem.setAttribute('tabindex', '0');
          slotItem.setAttribute('aria-label', `Book slot with ${rep.name}, ${day}, ${block.startTime} to ${block.endTime}`);
        }

        if (block.type === 'user-booked') {
          slotItem.dataset.rep = rep.name;
          slotItem.dataset.day = day;
          slotItem.dataset.start = block.startTime;
          slotItem.dataset.end = block.endTime;
          slotItem.setAttribute('role', 'button');
          slotItem.setAttribute('tabindex', '0');
          slotItem.setAttribute('aria-label', `Cancel booking with ${rep.name}, ${day}, ${block.startTime} to ${block.endTime}`);
        }

        slotsList.appendChild(slotItem);
      });

      daySec.appendChild(slotsList);
    }

    scheduleCard.appendChild(daySec);
  });

  if (!hasAnySessions) {
    scheduleCard.innerHTML += '<p class="no-sessions no-sessions--card">No sessions scheduled for this field.</p>';
  }

  attachSlotEventListeners();
}

function buildItineraryItemContent(booking) {
  return `
    <div class="slot-info">
      <span class="slot-time"><strong>${booking.startTime} - ${booking.endTime}</strong></span>
      <span class="slot-rep-name">${booking.repName}</span>
      <span class="slot-field">${booking.field}</span>
    </div>
    <div class="slot-action">
      <span class="btn-cancel">Cancel</span>
    </div>
  `;
}

function renderMyBookings() {
  const itinerary = dbService.getBookingsItinerary();

  if (itinerary.length === 0) {
    myBookingsCard.innerHTML = `
      <div class="empty-state">
        <h3>No bookings yet</h3>
        <p>Browse the fields list to book a 10-minute session.</p>
      </div>
    `;
    return;
  }

  myBookingsCard.innerHTML = '';

  const grouped = {};
  itinerary.forEach((booking) => {
    if (!grouped[booking.day]) grouped[booking.day] = [];
    grouped[booking.day].push(booking);
  });

  DAYS.filter((day) => grouped[day]).forEach((day) => {
    const daySec = document.createElement('div');
    daySec.className = 'day-schedule';
    daySec.innerHTML = `<h4 class="day-title">${day}</h4>`;

    const slotsList = document.createElement('div');
    slotsList.className = 'slots-list';

    grouped[day].forEach((booking) => {
      const slotItem = document.createElement('div');
      slotItem.className = 'slot-item user-booked itinerary-item';
      slotItem.innerHTML = buildItineraryItemContent(booking);
      slotItem.dataset.rep = booking.repName;
      slotItem.dataset.day = booking.day;
      slotItem.dataset.start = booking.startTime;
      slotItem.dataset.end = booking.endTime;
      slotItem.setAttribute('role', 'button');
      slotItem.setAttribute('tabindex', '0');
      slotItem.setAttribute(
        'aria-label',
        `Cancel booking with ${booking.repName} on ${booking.day} at ${booking.startTime} to ${booking.endTime}`
      );
      slotsList.appendChild(slotItem);
    });

    daySec.appendChild(slotsList);
    myBookingsCard.appendChild(daySec);
  });

  attachCancelListeners(myBookingsCard);
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function requestCancelBooking(rep, day, start, end) {
  cancelTarget = { rep, day, start, end };
  cancelMessage.textContent = `Are you sure you want to cancel your booking with ${rep} on ${day} at ${start}–${end}? This will free up the slot for others.`;
  cancelDialog.showModal();
}

function closeCancelDialog() {
  cancelDialog.close();
  cancelTarget = null;
}

async function executeCancelBooking() {
  if (!cancelTarget) return;

  const { rep, day, start, end } = cancelTarget;
  const success = await dbService.cancelBooking(rep, day, start, end);

  closeCancelDialog();

  if (!success) return;

  await refreshData();

  if (!myBookingsView.classList.contains('hidden')) {
    renderMyBookings();
  } else if (!fieldDetailView.classList.contains('hidden')) {
    renderCardView();
  } else if (repsData) {
    renderFieldList(repsData.fields);
  }
}

function attachCancelListeners(container = document) {
  container.querySelectorAll('.slot-item.user-booked[data-rep]').forEach((slot) => {
    const cancelFromSlot = (e) => {
      e.preventDefault();
      const { rep, day, start, end } = slot.dataset;
      requestCancelBooking(rep, day, start, end);
    };

    slot.addEventListener('click', cancelFromSlot);
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        cancelFromSlot(e);
      }
    });
  });
}

function attachSlotEventListeners() {
  document.querySelectorAll('.slot-item.bookable').forEach((slot) => {
    const openFromSlot = () => {
      const { rep, day, start, end } = slot.dataset;
      openBookingModal(rep, day, start, end);
    };

    slot.addEventListener('click', openFromSlot);
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFromSlot();
      }
    });
  });

  attachCancelListeners(scheduleCard);
}

function openBookingModal(repName, day, startTime, endTime) {
  currentBookingTarget = { repName, day, startTime, endTime };

  summaryRep.textContent = repName;
  summaryCommittee.textContent = activeField;
  summaryDay.textContent = day;
  summaryTime.textContent = `${startTime} - ${endTime}`;

  bookingNameInput.value = '';
  bookingEmailInput.value = '';

  bookingDialog.showModal();
}

function closeBookingModal() {
  bookingDialog.close();
  currentBookingTarget = null;
}

function setupEventListeners() {
  btnBack.addEventListener('click', showFieldList);
  btnBackFromBookings.addEventListener('click', showFieldList);
  btnMyBookings.addEventListener('click', showMyBookings);

  fieldSelect.addEventListener('change', (e) => {
    setActiveField(e.target.value);
  });

  btnCloseModal.addEventListener('click', closeBookingModal);
  btnCancelForm.addEventListener('click', closeBookingModal);
  btnCloseCancelDialog.addEventListener('click', closeCancelDialog);
  btnKeepBooking.addEventListener('click', closeCancelDialog);
  btnConfirmCancel.addEventListener('click', executeCancelBooking);

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentBookingTarget) return;

    const details = {
      name: bookingNameInput.value.trim(),
      email: bookingEmailInput.value.trim(),
      field: activeField,
    };

    const success = await dbService.bookSlot(
      currentBookingTarget.repName,
      currentBookingTarget.day,
      currentBookingTarget.startTime,
      currentBookingTarget.endTime,
      details
    );

    if (success) {
      closeBookingModal();
      await refreshData();
      renderCardView();
    }
  });
}

initApp();

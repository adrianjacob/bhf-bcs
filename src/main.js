import { dbService } from './dbService.js';

// Application State
let activeField = 'Discovery Fellowships';
let activeDay = 'Monday 1st';
let currentBookingTarget = null;
let repsData = null;

// DOM Elements
const btnCardView = document.getElementById('btn-card-view');
const btnGridView = document.getElementById('btn-grid-view');
const cardViewContainer = document.getElementById('card-view-container');
const gridViewContainer = document.getElementById('grid-view-container');

const fieldTabsContainer = document.getElementById('field-tabs-container');
const fieldSelect = document.getElementById('field-select');

const cardGrid = document.getElementById('card-grid');

const gridDaySelector = document.getElementById('grid-day-selector');
const spreadsheetTable = document.getElementById('spreadsheet-table');

const bookingDialog = document.getElementById('booking-dialog');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelForm = document.getElementById('btn-cancel-form');
const bookingForm = document.getElementById('booking-form');

const summaryRep = document.getElementById('summary-rep');
const summaryCommittee = document.getElementById('summary-committee');
const summaryDay = document.getElementById('summary-day');
const summaryTime = document.getElementById('summary-time');
const bookingNameInput = document.getElementById('booking-name');
const bookingEmailInput = document.getElementById('booking-email');
const bookingInterestInput = document.getElementById('booking-interest');

const bookingCountBadge = document.getElementById('booking-count');

// 15-Minute Timeslots array from 09:00 to 17:00
const timeslots = [];
function generateTimeslots() {
  const start = 9 * 60; // 09:00 in minutes
  const end = 17 * 60;  // 17:00 in minutes
  for (let t = start; t < end; t += 15) {
    const slotStart = minutesToTime(t);
    const slotEnd = minutesToTime(t + 15);
    timeslots.push({
      start: slotStart,
      end: slotEnd,
      label: `${slotStart}-${slotEnd}`
    });
  }
}
generateTimeslots();

// Initialize the Application
async function initApp() {
  try {
    // Load and process data (merged with localStorage)
    const data = await dbService.getAvailability();
    repsData = data;
    
    // Default active field to the first available field key
    const fields = Object.keys(data.fields);
    if (fields.length > 0 && !fields.includes(activeField)) {
      activeField = fields[0];
    }

    renderFilters(data.fields);
    updateBookingStats();
    renderActiveView();
    setupEventListeners();
  } catch (error) {
    console.error('App initialization failed:', error);
  }
}

// Render Field Filter Buttons and Dropdown
function renderFilters(fields) {
  fieldTabsContainer.innerHTML = '';
  fieldSelect.innerHTML = '';

  Object.keys(fields).forEach((field, index) => {
    // 1. Render Tabs for Desktop
    const tabBtn = document.createElement('button');
    tabBtn.className = `field-tab ${field === activeField ? 'active' : ''}`;
    tabBtn.setAttribute('role', 'tab');
    tabBtn.setAttribute('aria-selected', field === activeField ? 'true' : 'false');
    tabBtn.textContent = field;
    tabBtn.dataset.field = field;
    tabBtn.addEventListener('click', () => {
      setActiveField(field);
    });
    fieldTabsContainer.appendChild(tabBtn);

    // 2. Render Options for Mobile select
    const option = document.createElement('option');
    option.value = field;
    option.textContent = field;
    option.selected = (field === activeField);
    fieldSelect.appendChild(option);
  });

  // Mobile select change listener
  fieldSelect.addEventListener('change', (e) => {
    setActiveField(e.target.value);
  });
}

function setActiveField(field) {
  activeField = field;
  
  // Sync desktop tabs
  document.querySelectorAll('.field-tab').forEach(tab => {
    const isSelected = tab.dataset.field === activeField;
    tab.className = `field-tab ${isSelected ? 'active' : ''}`;
    tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });

  // Sync mobile select
  fieldSelect.value = activeField;

  // Render view
  renderActiveView();
}

// Render the active view (Card or Grid)
function renderActiveView() {
  if (btnCardView.classList.contains('active')) {
    renderCardView();
  } else {
    renderGridView();
  }
}

// Update My Bookings count badge
function updateBookingStats() {
  const bookings = dbService.getBookings();
  const count = Object.keys(bookings).length;
  bookingCountBadge.textContent = count;
}

// --- CARD VIEW RENDERER ---
function renderCardView() {
  cardGrid.innerHTML = '';
  
  const repNamesInField = repsData.fields[activeField] || [];
  if (repNamesInField.length === 0) {
    cardGrid.innerHTML = '<div class="empty-state"><h3>No Representatives Found</h3><p>There are no representatives assigned to this field.</p></div>';
    return;
  }

  repNamesInField.forEach(name => {
    const rep = repsData.representatives[name];
    if (!rep) return;

    const card = document.createElement('div');
    card.className = 'rep-card';
    
    // Card Header
    const cardHeader = `
      <div class="rep-header">
        <h3 class="rep-name">${rep.name}</h3>
        <p class="rep-committee">${rep.committee}</p>
        <p class="rep-role">Role: ${rep.role}</p>
      </div>
    `;
    card.innerHTML = cardHeader;

    const cardBody = document.createElement('div');
    cardBody.className = 'rep-body';

    // Daily Schedules
    const days = ['Monday 1st', 'Tuesday 2nd', 'Wednesday 3rd'];
    days.forEach(day => {
      const daySec = document.createElement('div');
      daySec.className = 'day-schedule';
      daySec.innerHTML = `<h4 class="day-title">${day}</h4>`;

      const slotsList = document.createElement('div');
      slotsList.className = 'slots-list';

      const blocks = rep.schedule[day] || [];
      const activeBlocks = blocks.filter(b => b.type !== 'unavailable');

      if (activeBlocks.length === 0) {
        daySec.innerHTML += '<p class="no-sessions">No sessions scheduled</p>';
      } else {
        activeBlocks.forEach(block => {
          const slotItem = document.createElement('div');
          slotItem.className = `slot-item ${block.type}`;
          
          let content = `<span><strong>${block.startTime} - ${block.endTime}</strong></span>`;
          
          if (block.type === 'drop-in') {
            content += `<span class="slot-badge">Drop-in</span>`;
          } else if (block.type === 'booked') {
            const labelText = block.label === 'Booked slots' ? 'Booked' : `Booked (${block.label})`;
            content += `<span class="slot-badge">${labelText}</span>`;
          } else if (block.type === 'user-booked') {
            content += `
              <div>
                <span class="slot-badge" style="margin-right: 6px;">Your Booking</span>
                <button class="btn-cancel" data-rep="${rep.name}" data-day="${day}" data-start="${block.startTime}" data-end="${block.endTime}">Cancel</button>
              </div>
            `;
          } else if (block.type === 'bookable') {
            content += `
              <button class="btn-book" data-rep="${rep.name}" data-day="${day}" data-start="${block.startTime}" data-end="${block.endTime}" data-committee="${rep.committee}">Book 15 min</button>
            `;
          }

          slotItem.innerHTML = content;
          slotsList.appendChild(slotItem);
        });
        daySec.appendChild(slotsList);
      }
      cardBody.appendChild(daySec);
    });

    card.appendChild(cardBody);
    cardGrid.appendChild(card);
  });

  // Attach card event listeners
  attachSlotEventListeners();
}

// --- GRID VIEW RENDERER ---
function renderGridView() {
  const tableHead = spreadsheetTable.querySelector('thead');
  const tableBody = spreadsheetTable.querySelector('tbody');
  
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  const repNamesInField = repsData.fields[activeField] || [];
  if (repNamesInField.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="33" class="empty-state"><h3>No Data</h3><p>No representatives for this field.</p></td></tr>';
    return;
  }

  // 1. Render Header Row (Timeslots)
  const headerRow = document.createElement('tr');
  
  const repHeader = document.createElement('th');
  repHeader.className = 'sticky-col';
  repHeader.textContent = 'Representative';
  headerRow.appendChild(repHeader);

  timeslots.forEach(slot => {
    const timeTh = document.createElement('th');
    timeTh.textContent = slot.label;
    headerRow.appendChild(timeTh);
  });
  tableHead.appendChild(headerRow);

  // 2. Render Rows per Representative
  repNamesInField.forEach(name => {
    const rep = repsData.representatives[name];
    if (!rep) return;

    const row = document.createElement('tr');
    
    // Sticky representative identity column
    const repCell = document.createElement('td');
    repCell.className = 'sticky-col';
    repCell.innerHTML = `
      <div class="rep-cell-info">
        <span class="rep-cell-name">${rep.name}</span>
        <span class="rep-cell-comm">${rep.role}</span>
      </div>
    `;
    row.appendChild(repCell);

    // Render cells for each timeslot
    timeslots.forEach((slot, index) => {
      const cell = document.createElement('td');
      cell.className = 'grid-cell';

      const block = getBlockForTime(rep, activeDay, slot.start, slot.end);
      
      if (block) {
        cell.classList.add(`cell-${block.type}`);
        
        // Custom Tooltip details
        let tooltipContent = `<strong>Time:</strong> ${block.startTime}-${block.endTime}<br><strong>Status:</strong> `;
        
        // Remove borders to display block continuity (merged cells aesthetic)
        const isStart = (block.startTime === slot.start);
        const hasPrev = (index > 0 && getBlockForTime(rep, activeDay, timeslots[index - 1].start, timeslots[index - 1].end) === block);
        const hasNext = (index < timeslots.length - 1 && getBlockForTime(rep, activeDay, timeslots[index + 1].start, timeslots[index + 1].end) === block);

        if (hasPrev) cell.style.borderLeft = 'none';
        if (hasNext) cell.style.borderRight = 'none';

        // Render block label at the beginning cell of the block
        if (isStart) {
          if (block.type === 'drop-in') {
            cell.textContent = 'Drop-in';
          } else if (block.type === 'booked') {
            cell.textContent = block.label === 'Booked slots' ? 'Booked' : block.label;
          } else if (block.type === 'user-booked') {
            cell.textContent = 'Yours';
          } else if (block.type === 'bookable') {
            cell.textContent = 'Bookable';
          } else if (block.type === 'unavailable') {
            cell.textContent = 'Blocked';
          }
        }

        // Add visual indicator / actions
        if (block.type === 'bookable') {
          tooltipContent += `Available (Click to book)`;
          cell.dataset.action = 'book';
          cell.dataset.rep = rep.name;
          cell.dataset.day = activeDay;
          cell.dataset.start = slot.start;
          cell.dataset.end = slot.end;
          cell.dataset.committee = rep.committee;
        } else if (block.type === 'user-booked') {
          tooltipContent += `Booked by You (Click to cancel)`;
          cell.dataset.action = 'cancel';
          cell.dataset.rep = rep.name;
          cell.dataset.day = activeDay;
          cell.dataset.start = slot.start;
          cell.dataset.end = slot.end;
        } else if (block.type === 'drop-in') {
          tooltipContent += `Drop-in Session (No booking needed)`;
        } else if (block.type === 'booked') {
          const nameSuffix = block.label === 'Booked slots' ? '' : ` (${block.label})`;
          tooltipContent += `Already Booked${nameSuffix}`;
        } else if (block.type === 'unavailable') {
          tooltipContent += `Busy / Unavailable`;
        }

        cell.innerHTML += `<div class="cell-tooltip">${tooltipContent}</div>`;
      }
      
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });

  // Attach spreadsheet interactive event listeners
  attachGridEventListeners();
}

// Helper: Check if slot overlaps with representative schedule block
function getBlockForTime(rep, day, startTimeStr, endTimeStr) {
  if (!rep.schedule || !rep.schedule[day]) return null;
  
  const slotStart = timeToMinutes(startTimeStr);
  const slotEnd = timeToMinutes(endTimeStr);
  
  for (const block of rep.schedule[day]) {
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);
    
    // Check if slot falls completely within the block's range
    if (slotStart >= blockStart && slotEnd <= blockEnd) {
      return block;
    }
  }
  
  return null;
}

// Convert "HH:MM" to minutes
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes to "HH:MM"
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Event Listeners setup for Card Elements
function attachSlotEventListeners() {
  // 1. Booking buttons
  document.querySelectorAll('.btn-book').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const { rep, day, start, end, committee } = e.target.dataset;
      openBookingModal(rep, day, start, end, committee);
    });
  });

  // 2. Cancellation buttons
  document.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const { rep, day, start, end } = e.target.dataset;
      if (confirm(`Are you sure you want to cancel your booking with ${rep} on ${day} at ${start}-${end}?`)) {
        const success = await dbService.cancelBooking(rep, day, start, end);
        if (success) {
          repsData = await dbService.getAvailability();
          updateBookingStats();
          renderActiveView();
        }
      }
    });
  });
}

// Event Listeners setup for Spreadsheet Grid Elements
function attachGridEventListeners() {
  document.querySelectorAll('.grid-cell').forEach(cell => {
    if (cell.dataset.action === 'book') {
      cell.addEventListener('click', () => {
        const { rep, day, start, end, committee } = cell.dataset;
        openBookingModal(rep, day, start, end, committee);
      });
    } else if (cell.dataset.action === 'cancel') {
      cell.addEventListener('click', async () => {
        const { rep, day, start, end } = cell.dataset;
        if (confirm(`Are you sure you want to cancel your booking with ${rep} on ${day} at ${start}-${end}?`)) {
          const success = await dbService.cancelBooking(rep, day, start, end);
          if (success) {
            repsData = await dbService.getAvailability();
            updateBookingStats();
            renderActiveView();
          }
        }
      });
    }
  });
}

// Open booking dialog
function openBookingModal(repName, day, startTime, endTime, committee) {
  currentBookingTarget = { repName, day, startTime, endTime, committee };
  
  summaryRep.textContent = repName;
  summaryCommittee.textContent = committee;
  summaryDay.textContent = day;
  summaryTime.textContent = `${startTime} - ${endTime}`;

  // Clear inputs
  bookingNameInput.value = '';
  bookingEmailInput.value = '';
  bookingInterestInput.value = '';

  bookingDialog.showModal();
}

// Close booking dialog
function closeBookingModal() {
  bookingDialog.close();
  currentBookingTarget = null;
}

// Setup core application listeners
function setupEventListeners() {
  // 1. View Toggles
  btnCardView.addEventListener('click', () => {
    btnCardView.classList.add('active');
    btnCardView.setAttribute('aria-pressed', 'true');
    btnGridView.classList.remove('active');
    btnGridView.setAttribute('aria-pressed', 'false');
    
    cardViewContainer.classList.add('active');
    gridViewContainer.classList.remove('active');
    renderCardView();
  });

  btnGridView.addEventListener('click', () => {
    btnGridView.classList.add('active');
    btnGridView.setAttribute('aria-pressed', 'true');
    btnCardView.classList.remove('active');
    btnCardView.setAttribute('aria-pressed', 'false');
    
    gridViewContainer.classList.add('active');
    cardViewContainer.classList.remove('active');
    renderGridView();
  });

  // 2. Day Selectors for Grid View
  gridDaySelector.querySelectorAll('.grid-day-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      gridDaySelector.querySelector('.grid-day-btn.active').classList.remove('active');
      e.target.classList.add('active');
      activeDay = e.target.dataset.day;
      renderGridView();
    });
  });

  // 3. Modal Controls
  btnCloseModal.addEventListener('click', closeBookingModal);
  btnCancelForm.addEventListener('click', closeBookingModal);

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentBookingTarget) return;

    const details = {
      name: bookingNameInput.value.trim(),
      email: bookingEmailInput.value.trim(),
      interest: bookingInterestInput.value.trim()
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
      // Reload combined data structure
      repsData = await dbService.getAvailability();
      updateBookingStats();
      renderActiveView();
    }
  });
}

// Launch application
initApp();

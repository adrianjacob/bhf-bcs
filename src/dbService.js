// Database service for managing representative availability and booking states.
// This is designed to act as a clean data layer that can be easily swapped for Firebase.

const LOCAL_STORAGE_KEY = 'bhf_bcs_bookings';
const AVAILABILITY_URL = '/data/availability.json';
const SLOT_DURATION_MINUTES = 10;

export class DbService {
  constructor() {
    this.data = null;
  }

  // Load the initial mock database
  async init() {
    try {
      const response = await fetch(AVAILABILITY_URL);
      if (!response.ok) {
        throw new Error('Failed to load availability data');
      }
      this.data = await response.json();
    } catch (error) {
      console.error('Error initializing dbService:', error);
      throw error;
    }
  }

  // Get all fields/areas
  getFields() {
    return this.data ? this.data.fields : {};
  }

  // Get all representatives
  getRepresentatives() {
    return this.data ? this.data.representatives : {};
  }

  // Get list of active bookings from local storage
  getBookings() {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  // Save bookings to local storage
  saveBookings(bookings) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bookings));
  }

  // Get the combined availability data (JSON data + user bookings)
  async getAvailability() {
    if (!this.data) {
      await this.init();
    }

    const bookings = this.getBookings();
    
    // Deep clone the representatives data to avoid mutating original state
    const reps = JSON.parse(JSON.stringify(this.data.representatives));

    // Iterate through all representatives and merge their schedules with local bookings
    for (const [repName, rep] of Object.entries(reps)) {
      for (const [day, blocks] of Object.entries(rep.schedule)) {
        const mergedBlocks = [];

        for (const block of blocks) {
          if (block.type === 'bookable' || block.type === 'booked') {
            const start = this.timeToMinutes(block.startTime);
            const end = this.timeToMinutes(block.endTime);

            for (let t = start; t + SLOT_DURATION_MINUTES <= end; t += SLOT_DURATION_MINUTES) {
              const slotStart = this.minutesToTime(t);
              const slotEnd = this.minutesToTime(t + SLOT_DURATION_MINUTES);
              const slotTime = `${slotStart}-${slotEnd}`;
              const bookingKey = `${repName}_${day}_${slotTime}`;

              if (bookings[bookingKey]) {
                mergedBlocks.push({
                  startTime: slotStart,
                  endTime: slotEnd,
                  type: 'user-booked',
                  label: 'Booked by You',
                  details: bookings[bookingKey]
                });
              } else {
                mergedBlocks.push({
                  startTime: slotStart,
                  endTime: slotEnd,
                  type: 'bookable',
                  label: 'Bookable',
                  details: null
                });
              }
            }
          } else if (block.type === 'drop-in') {
            mergedBlocks.push(...this.splitTimeBlockIntoSlots(block, 'drop-in'));
          } else {
            mergedBlocks.push(block);
          }
        }
        
        // Sort blocks by start time
        mergedBlocks.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
        rep.schedule[day] = mergedBlocks;
      }
    }

    return {
      fields: this.data.fields,
      representatives: reps
    };
  }

  // Create a booking
  async bookSlot(repName, day, startTime, endTime, details) {
    const slotTime = `${startTime}-${endTime}`;
    const bookingKey = `${repName}_${day}_${slotTime}`;
    const bookings = this.getBookings();

    bookings[bookingKey] = {
      repName,
      day,
      startTime,
      endTime,
      ...details,
      bookedAt: new Date().toISOString()
    };

    this.saveBookings(bookings);
    return true;
  }

  // Cancel a booking
  async cancelBooking(repName, day, startTime, endTime) {
    const slotTime = `${startTime}-${endTime}`;
    const bookingKey = `${repName}_${day}_${slotTime}`;
    const bookings = this.getBookings();

    if (bookings[bookingKey]) {
      delete bookings[bookingKey];
      this.saveBookings(bookings);
      return true;
    }
    return false;
  }

  getBookingsItinerary() {
    const dayOrder = ['Monday 1st', 'Tuesday 2nd', 'Wednesday 3rd'];

    return Object.entries(this.getBookings())
      .map(([key, booking]) => {
        const parsed = this.parseBookingKey(key);
        return {
          key,
          repName: booking.repName || parsed.repName,
          day: booking.day || parsed.day,
          startTime: booking.startTime || parsed.startTime,
          endTime: booking.endTime || parsed.endTime,
          field: booking.field || '—',
          name: booking.name,
          email: booking.email,
          bookedAt: booking.bookedAt,
        };
      })
      .sort((a, b) => {
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
      });
  }

  parseBookingKey(key) {
    const slotTime = key.slice(key.lastIndexOf('_') + 1);
    const remainder = key.slice(0, key.lastIndexOf('_'));
    const day = remainder.slice(remainder.lastIndexOf('_') + 1);
    const repName = remainder.slice(0, remainder.lastIndexOf('_'));
    const [startTime, endTime] = slotTime.split('-');

    return { repName, day, startTime, endTime };
  }

  splitTimeBlockIntoSlots(block, type) {
    const slots = [];
    const start = this.timeToMinutes(block.startTime);
    const end = this.timeToMinutes(block.endTime);

    for (let t = start; t + SLOT_DURATION_MINUTES <= end; t += SLOT_DURATION_MINUTES) {
      slots.push({
        startTime: this.minutesToTime(t),
        endTime: this.minutesToTime(t + SLOT_DURATION_MINUTES),
        type,
        label: block.label || (type === 'drop-in' ? 'Drop-in' : 'Bookable')
      });
    }

    return slots;
  }

  // Helpers to convert time formats
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}

export const dbService = new DbService();

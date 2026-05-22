// Database service for managing representative availability and booking states.
// This is designed to act as a clean data layer that can be easily swapped for Firebase.

const LOCAL_STORAGE_KEY = 'bhf_bcs_bookings';

export class DbService {
  constructor() {
    this.data = null;
  }

  // Load the initial mock database
  async init() {
    try {
      const response = await fetch('/src/data/availability.json');
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
          // If the block is bookable, we split it into 15-minute intervals
          if (block.type === 'bookable') {
            const start = this.timeToMinutes(block.startTime);
            const end = this.timeToMinutes(block.endTime);
            
            for (let t = start; t < end; t += 15) {
              const slotStart = this.minutesToTime(t);
              const slotEnd = this.minutesToTime(t + 15);
              const slotTime = `${slotStart}-${slotEnd}`;
              const bookingKey = `${repName}_${day}_${slotTime}`;

              if (bookings[bookingKey]) {
                // Booked by the current user
                mergedBlocks.push({
                  startTime: slotStart,
                  endTime: slotEnd,
                  type: 'user-booked',
                  label: 'Booked by You',
                  details: bookings[bookingKey]
                });
              } else {
                // Still available to book
                mergedBlocks.push({
                  startTime: slotStart,
                  endTime: slotEnd,
                  type: 'bookable',
                  label: 'Bookable',
                  details: null
                });
              }
            }
          } else {
            // For drop-in, booked, and unavailable blocks, keep them as is
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

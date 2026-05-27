import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { getFirestoreDb } from './firebaseClient.js';

const AVAILABILITY_URL = '/data/availability.json';
const AVAILABILITY_DOC_PATH = ['app_data', 'availability'];
const BOOKINGS_COLLECTION = 'bookings';
const SLOT_DURATION_MINUTES = 10;

export class DbService {
  constructor() {
    this.data = null;
    this.bookings = {};
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeFromFirestore();
    return this.initPromise;
  }

  async initializeFromFirestore() {
    try {
      this.db = getFirestoreDb();
      const availabilityRef = doc(this.db, ...AVAILABILITY_DOC_PATH);
      const availabilitySnapshot = await getDoc(availabilityRef);

      if (availabilitySnapshot.exists()) {
        this.data = availabilitySnapshot.data();
      } else {
        const response = await fetch(AVAILABILITY_URL);
        if (!response.ok) {
          throw new Error('Failed to load fallback availability data');
        }
        const seedData = await response.json();
        await setDoc(availabilityRef, seedData);
        this.data = seedData;
      }

      await this.loadBookings();
    } catch (error) {
      this.initPromise = null;
      console.error('Error initializing dbService with Firestore:', error);
      throw error;
    }
  }

  async loadBookings() {
    const snapshot = await getDocs(collection(this.db, BOOKINGS_COLLECTION));
    this.bookings = {};
    snapshot.forEach((bookingDoc) => {
      this.bookings[bookingDoc.id] = bookingDoc.data();
    });
  }

  getFields() {
    return this.data ? this.data.fields : {};
  }

  getRepresentatives() {
    return this.data ? this.data.representatives : {};
  }

  getBookings() {
    return this.bookings;
  }

  async getAvailability() {
    if (!this.data) {
      await this.init();
    }

    const bookings = this.bookings;
    const reps = JSON.parse(JSON.stringify(this.data.representatives));

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
            mergedBlocks.push(block);
          } else {
            mergedBlocks.push(block);
          }
        }

        mergedBlocks.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
        rep.schedule[day] = mergedBlocks;
      }
    }

    return {
      fields: this.data.fields,
      representatives: reps
    };
  }

  async bookSlot(repName, day, startTime, endTime, details) {
    await this.init();
    const slotTime = `${startTime}-${endTime}`;
    const bookingKey = `${repName}_${day}_${slotTime}`;
    const bookingPayload = {
      repName,
      day,
      startTime,
      endTime,
      ...details,
      bookedAt: new Date().toISOString()
    };

    await setDoc(doc(this.db, BOOKINGS_COLLECTION, bookingKey), bookingPayload);
    this.bookings[bookingKey] = bookingPayload;
    return true;
  }

  async cancelBooking(repName, day, startTime, endTime) {
    await this.init();
    const slotTime = `${startTime}-${endTime}`;
    const bookingKey = `${repName}_${day}_${slotTime}`;

    if (this.bookings[bookingKey]) {
      await deleteDoc(doc(this.db, BOOKINGS_COLLECTION, bookingKey));
      delete this.bookings[bookingKey];
      return true;
    }
    return false;
  }

  getBookingsItinerary() {
    const dayOrder = ['Monday 1st', 'Tuesday 2nd', 'Wednesday 3rd'];

    return Object.entries(this.bookings)
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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
global.localStorage = localStorageMock;

// Mock fetch to load the local availability.json file
global.fetch = async (url) => {
  if (url === '/data/availability.json') {
    const jsonPath = path.join(__dirname, '../public/data/availability.json');
    const data = fs.readFileSync(jsonPath, 'utf8');
    return {
      ok: true,
      json: async () => JSON.parse(data)
    };
  }
  throw new Error(`Unknown URL: ${url}`);
};

async function testDbService() {
  console.log('Testing DbService...');
  
  // Dynamically import ES Module
  const { dbService } = await import('../src/dbService.js');
  
  // 1. Initial State
  await dbService.init();
  const fields = dbService.getFields();
  console.log('Fields loaded:', Object.keys(fields));
  
  const reps = dbService.getRepresentatives();
  console.log('Reps loaded:', Object.keys(reps));
  
  if (!fields['Discovery Research'] || fields['Discovery Research'].length !== 1) {
    throw new Error('Discovery Research field mapping is incorrect');
  }
  console.log('✓ "Discovery Research" field contains:', fields['Discovery Research']);
  
  // 2. Fetch Availability (empty bookings)
  let state = await dbService.getAvailability();
  let helena = state.representatives['Helena T'];
  let monHelena = helena.schedule['Monday 1st'];
  
  console.log('Helena Monday schedule length:', monHelena.length);
  // Helena has a bookable slot from 13:45 to 14:45 (60 mins).
  // This should be split into six 10-minute slots:
  // 13:45-13:55, 13:55-14:05, 14:05-14:15, 14:15-14:25, 14:25-14:35, 14:35-14:45.
  const bookableSlots = monHelena.filter(s => s.type === 'bookable');
  if (bookableSlots.length !== 6) {
    throw new Error(`Expected 6 bookable slots for Helena on Monday, got ${bookableSlots.length}`);
  }
  console.log('✓ Split bookable slots correctly:', bookableSlots.map(s => `${s.startTime}-${s.endTime}`));

  // 3. Book a slot
  console.log('Booking Helena Monday 13:45-13:55...');
  await dbService.bookSlot('Helena T', 'Monday 1st', '13:45', '13:55', {
    name: 'Test User',
    email: 'test@example.com',
    interest: 'Translational Awards inquiry'
  });
  
  // 4. Verify booked state
  state = await dbService.getAvailability();
  monHelena = state.representatives['Helena T'].schedule['Monday 1st'];
  const userBooked = monHelena.find(s => s.type === 'user-booked');
  if (!userBooked || userBooked.startTime !== '13:45' || userBooked.endTime !== '13:55') {
    throw new Error('Booking was not retrieved correctly');
  }
  console.log('✓ Successfully retrieved booked slot:', userBooked);
  
  // 5. Cancel booking
  console.log('Cancelling booking...');
  await dbService.cancelBooking('Helena T', 'Monday 1st', '13:45', '13:55');
  
  // 6. Verify cancelled state
  state = await dbService.getAvailability();
  monHelena = state.representatives['Helena T'].schedule['Monday 1st'];
  const cancelledSlot = monHelena.find(s => s.startTime === '13:45' && s.endTime === '13:55');
  if (!cancelledSlot || cancelledSlot.type !== 'bookable') {
    throw new Error('Booking cancellation failed or slot did not revert to bookable');
  }
  console.log('✓ Successfully cancelled and reverted to bookable:', cancelledSlot);
  
  console.log('All tests passed successfully!');
}

testDbService().catch(console.error);

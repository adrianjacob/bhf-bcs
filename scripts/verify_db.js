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
  if (url === '/src/data/availability.json') {
    const jsonPath = path.join(__dirname, '../src/data/availability.json');
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
  
  if (!fields['Other'] || fields['Other'].length !== 2) {
    throw new Error('Other field mapping is incorrect');
  }
  console.log('✓ "Other" field contains:', fields['Other']);
  
  // 2. Fetch Availability (empty bookings)
  let state = await dbService.getAvailability();
  let helena = state.representatives['Helena T'];
  let monHelena = helena.schedule['Monday 1st'];
  
  console.log('Helena Monday schedule length:', monHelena.length);
  // Helena has a bookable slot from 13:30 to 14:15.
  // This should be split into three 15-minute slots:
  // 13:30-13:45, 13:45-14:00, 14:00-14:15.
  const bookableSlots = monHelena.filter(s => s.type === 'bookable');
  if (bookableSlots.length !== 3) {
    throw new Error(`Expected 3 bookable slots for Helena on Monday, got ${bookableSlots.length}`);
  }
  console.log('✓ Split bookable slots correctly:', bookableSlots.map(s => `${s.startTime}-${s.endTime}`));

  // 3. Book a slot
  console.log('Booking Helena Monday 13:30-13:45...');
  await dbService.bookSlot('Helena T', 'Monday 1st', '13:30', '13:45', {
    name: 'Test User',
    email: 'test@example.com',
    interest: 'Translational Awards inquiry'
  });
  
  // 4. Verify booked state
  state = await dbService.getAvailability();
  monHelena = state.representatives['Helena T'].schedule['Monday 1st'];
  const userBooked = monHelena.find(s => s.type === 'user-booked');
  if (!userBooked || userBooked.startTime !== '13:30' || userBooked.endTime !== '13:45') {
    throw new Error('Booking was not retrieved correctly');
  }
  console.log('✓ Successfully retrieved booked slot:', userBooked);
  
  // 5. Cancel booking
  console.log('Cancelling booking...');
  await dbService.cancelBooking('Helena T', 'Monday 1st', '13:30', '13:45');
  
  // 6. Verify cancelled state
  state = await dbService.getAvailability();
  monHelena = state.representatives['Helena T'].schedule['Monday 1st'];
  const cancelledSlot = monHelena.find(s => s.startTime === '13:30' && s.endTime === '13:45');
  if (!cancelledSlot || cancelledSlot.type !== 'bookable') {
    throw new Error('Booking cancellation failed or slot did not revert to bookable');
  }
  console.log('✓ Successfully cancelled and reverted to bookable:', cancelledSlot);
  
  console.log('All tests passed successfully!');
}

testDbService().catch(console.error);

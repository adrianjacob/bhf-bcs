# bhf-bcs

## Firebase setup

1. Copy `.env.example` to `.env`.
2. Fill in `VITE_FIREBASE_*` values from your Firebase Web App config.
3. Run `npm install` and `npm run dev`.

### Firestore data model

- `app_data/availability` document:
  - stores the full schedule object (`fields`, `representatives`) used by the app.
- `bookings/{bookingKey}` documents:
  - booking key format: `repName_day_start-end`
  - stores `repName`, `day`, `startTime`, `endTime`, `name`, `email`, `field`, `bookedAt`.

### First-run behavior

- On first run, if `app_data/availability` does not exist, the app seeds it from `public/data/availability.json`.

## Staff bookings page

- URL: `/bookings.html`
- Uses shared-password gate backed by `app_data/staff_access.passwordHash` (SHA-256).
- Lists all docs from `bookings` collection for on-site staff visibility.
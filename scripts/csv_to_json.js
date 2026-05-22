import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directories exist
const dataDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Define the fields and representatives
const fields = {
  "Discovery Fellowships": ["Laura M"],
  "Clinical Fellowships": ["Sarah K", "Barbara V"],
  "Project Grants": ["Aimee E"],
  "Clinical Studies": ["Phoebe K", "Shannon A"],
  "Healthcare Implementation Awards": ["Andrew L"],
  "Translational Awards": ["Helena T"],
  "Programme Grants": ["Subreena S"],
  "Special Programmes": ["Zoe H"],
  "Filming": ["Ollie H"],
  "Discovery Research": ["Abby W"],
  "Clinical Research": ["Kieran P"],
  "Other": ["Abby W", "Kieran P"]
};

// Reconstruct the exact database from the Google Sheet screenshot and CSV
const representatives = {
  "Laura M": {
    "name": "Laura M",
    "committee": "Discovery Fellowships (Laura M)",
    "role": "Fellows (Disc)",
    "schedule": {
      "Monday 1st": [
        { "startTime": "14:15", "endTime": "15:00", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [
        { "startTime": "14:00", "endTime": "14:30", "type": "booked", "label": "Booked slots" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Sarah K": {
    "name": "Sarah K",
    "committee": "Clinical Fellowships (Sarah K)",
    "role": "Fellows (Clin)",
    "schedule": {
      "Monday 1st": [
        { "startTime": "15:30", "endTime": "16:00", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "16:00", "endTime": "16:45", "type": "booked", "label": "Booked slots" }
      ]
    }
  },
  "Barbara V": {
    "name": "Barbara V",
    "committee": "Clinical Fellowships (Barbara V)",
    "role": "Fellows (Clin)",
    "schedule": {
      "Monday 1st": [],
      "Tuesday 2nd": [
        { "startTime": "09:30", "endTime": "10:00", "type": "booked", "label": "Booked slots" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Aimee E": {
    "name": "Aimee E",
    "committee": "Project Grants (Aimee E)",
    "role": "Projects",
    "schedule": {
      "Monday 1st": [
        { "startTime": "15:15", "endTime": "16:00", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [
        { "startTime": "10:15", "endTime": "11:00", "type": "booked", "label": "Booked slots" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Phoebe K": {
    "name": "Phoebe K",
    "committee": "Clinical Studies (Phoebe K)",
    "role": "CSC",
    "schedule": {
      "Monday 1st": [
        { "startTime": "14:00", "endTime": "14:45", "type": "booked", "label": "Booked slots" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "09:15", "endTime": "10:00", "type": "drop-in", "label": "Drop-in" }
      ]
    }
  },
  "Shannon A": {
    "name": "Shannon A",
    "committee": "Clinical Studies (Shannon A)",
    "role": "CSC",
    "schedule": {
      "Monday 1st": [],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "09:15", "endTime": "10:00", "type": "drop-in", "label": "Drop-in" }
      ]
    }
  },
  "Andrew L": {
    "name": "Andrew L",
    "committee": "Healthcare Implementation Awards (Andrew L)",
    "role": "HIF",
    "schedule": {
      "Monday 1st": [
        { "startTime": "09:00", "endTime": "11:00", "type": "unavailable", "label": "Blocked" },
        { "startTime": "12:45", "endTime": "13:30", "type": "bookable", "label": "Bookable slots" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": []
    }
  },
  "Helena T": {
    "name": "Helena T",
    "committee": "Translational Awards (Helena T)",
    "role": "TAC",
    "schedule": {
      "Monday 1st": [
        { "startTime": "13:30", "endTime": "14:15", "type": "bookable", "label": "Bookable slots" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "11:00", "endTime": "12:00", "type": "drop-in", "label": "Drop-in" }
      ]
    }
  },
  "Abby W": {
    "name": "Abby W",
    "committee": "Discovery research & Other (Abby W)",
    "role": "HoDRP",
    "schedule": {
      "Monday 1st": [
        { "startTime": "14:45", "endTime": "15:45", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [
        { "startTime": "10:45", "endTime": "11:30", "type": "booked", "label": "Booked slots" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Kieran P": {
    "name": "Kieran P",
    "committee": "Clinical research & Other (Kieran P)",
    "role": "HoCRP",
    "schedule": {
      "Monday 1st": [
        { "startTime": "11:45", "endTime": "12:45", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "09:45", "endTime": "10:45", "type": "booked", "label": "Booked slots" }
      ]
    }
  },
  "Subreena S": {
    "name": "Subreena S",
    "committee": "Programme Grants (Subreena S)",
    "role": "CPGC",
    "schedule": {
      "Monday 1st": [],
      "Tuesday 2nd": [
        { "startTime": "09:15", "endTime": "10:00", "type": "booked", "label": "Booked slots" },
        { "startTime": "10:00", "endTime": "10:30", "type": "drop-in", "label": "Drop-in" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Zoe H": {
    "name": "Zoe H",
    "committee": "Special Programmes (Zoe H)",
    "role": "Special Programmes",
    "schedule": {
      "Monday 1st": [
        { "startTime": "14:45", "endTime": "15:45", "type": "booked", "label": "Booked slots" }
      ],
      "Tuesday 2nd": [
        { "startTime": "10:00", "endTime": "10:30", "type": "drop-in", "label": "Drop-in" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Ollie H": {
    "name": "Ollie H",
    "committee": "Filming",
    "role": "Filming",
    "schedule": {
      "Monday 1st": [
        { "startTime": "14:00", "endTime": "14:15", "type": "booked", "label": "Chris" },
        { "startTime": "14:30", "endTime": "14:45", "type": "booked", "label": "Kathryn" }
      ],
      "Tuesday 2nd": [
        { "startTime": "09:30", "endTime": "09:45", "type": "booked", "label": "Marc?" },
        { "startTime": "10:00", "endTime": "10:15", "type": "booked", "label": "Marc?" },
        { "startTime": "11:00", "endTime": "11:15", "type": "booked", "label": "Marc?" },
        { "startTime": "15:15", "endTime": "15:30", "type": "booked", "label": "Paz?" }
      ],
      "Wednesday 3rd": []
    }
  }
};

// External (pre-existing) bookings — these represent slots already taken by named individuals
// before the app was opened. Keyed as: repName -> day -> [{ startTime, endTime, bookedBy }]
const externalBookings = {
  "Helena T": {
    "Monday 1st": [
      { "startTime": "13:45", "endTime": "14:00", "bookedBy": "Dr. Sarah Collins" }
    ]
  },
  "Andrew L": {
    "Monday 1st": [
      { "startTime": "13:00", "endTime": "13:15", "bookedBy": "Prof. James Whitfield" }
    ]
  },
  "Laura M": {
    "Monday 1st": [
      { "startTime": "14:30", "endTime": "14:45", "bookedBy": "Dr. Amir Patel" }
    ]
  },
  "Abby W": {
    "Monday 1st": [
      { "startTime": "15:00", "endTime": "15:15", "bookedBy": "Dr. Ruth Hammond" },
      { "startTime": "15:15", "endTime": "15:30", "bookedBy": "Prof. Tom Gallagher" }
    ]
  }
};

const database = {
  fields,
  representatives,
  externalBookings
};

fs.writeFileSync(
  path.join(dataDir, 'availability.json'),
  JSON.stringify(database, null, 2),
  'utf8'
);

console.log('Successfully generated src/data/availability.json!');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directories exist
const dataDir = path.join(__dirname, '../src/data');
const publicDataDir = path.join(__dirname, '../public/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
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
  "Discovery Research": ["Abby W"],
  "Clinical Research": ["Kieran P"]
};

function committeesForRep(repName) {
  return Object.entries(fields)
    .filter(([, reps]) => reps.includes(repName))
    .map(([fieldName]) => fieldName);
}

// Reconstruct the exact database from the Google Sheet screenshot and CSV
const representatives = {
  "Laura M": {
    "name": "Laura M",
    "role": "Fellows (Disc)",
    "schedule": {
      "Monday 1st": [
        { "startTime": "14:15", "endTime": "15:00", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [
        { "startTime": "14:00", "endTime": "14:45", "type": "bookable", "label": "Bookable slots" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Sarah K": {
    "name": "Sarah K",
    "role": "Fellows (Clin)",
    "schedule": {
      "Monday 1st": [
        { "startTime": "15:45", "endTime": "16:15", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "16:00", "endTime": "17:00", "type": "bookable", "label": "Bookable slots" }
      ]
    }
  },
  "Barbara V": {
    "name": "Barbara V",
    "role": "Fellows (Clin)",
    "schedule": {
      "Monday 1st": [],
      "Tuesday 2nd": [
        { "startTime": "09:30", "endTime": "10:15", "type": "bookable", "label": "Bookable slots" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Aimee E": {
    "name": "Aimee E",
    "role": "Projects",
    "schedule": {
      "Monday 1st": [
        { "startTime": "15:30", "endTime": "16:30", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [
        { "startTime": "10:30", "endTime": "11:15", "type": "bookable", "label": "Bookable slots" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Phoebe K": {
    "name": "Phoebe K",
    "role": "CSC",
    "schedule": {
      "Monday 1st": [
        { "startTime": "14:15", "endTime": "15:00", "type": "bookable", "label": "Bookable slots" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "09:30", "endTime": "10:15", "type": "drop-in", "label": "Drop-in" }
      ]
    }
  },
  "Shannon A": {
    "name": "Shannon A",
    "role": "CSC",
    "schedule": {
      "Monday 1st": [],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "09:30", "endTime": "10:15", "type": "drop-in", "label": "Drop-in" }
      ]
    }
  },
  "Andrew L": {
    "name": "Andrew L",
    "role": "HIF",
    "schedule": {
      "Monday 1st": [
        { "startTime": "09:00", "endTime": "11:00", "type": "unavailable", "label": "Blocked" },
        { "startTime": "13:00", "endTime": "13:45", "type": "bookable", "label": "Bookable slots" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": []
    }
  },
  "Helena T": {
    "name": "Helena T",
    "role": "TAC",
    "schedule": {
      "Monday 1st": [
        { "startTime": "13:45", "endTime": "14:45", "type": "bookable", "label": "Bookable slots" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "11:30", "endTime": "12:30", "type": "drop-in", "label": "Drop-in" }
      ]
    }
  },
  "Abby W": {
    "name": "Abby W",
    "role": "HoDRP",
    "schedule": {
      "Monday 1st": [
        { "startTime": "15:00", "endTime": "16:00", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [
        { "startTime": "11:15", "endTime": "12:15", "type": "bookable", "label": "Bookable slots" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Kieran P": {
    "name": "Kieran P",
    "role": "HoCRP",
    "schedule": {
      "Monday 1st": [
        { "startTime": "12:30", "endTime": "13:30", "type": "drop-in", "label": "Drop-in" }
      ],
      "Tuesday 2nd": [],
      "Wednesday 3rd": [
        { "startTime": "10:15", "endTime": "11:15", "type": "bookable", "label": "Bookable slots" }
      ]
    }
  },
  "Subreena S": {
    "name": "Subreena S",
    "role": "CPGC",
    "schedule": {
      "Monday 1st": [],
      "Tuesday 2nd": [
        { "startTime": "09:30", "endTime": "10:15", "type": "bookable", "label": "Bookable slots" },
        { "startTime": "10:15", "endTime": "11:00", "type": "drop-in", "label": "Drop-in" }
      ],
      "Wednesday 3rd": []
    }
  },
  "Zoe H": {
    "name": "Zoe H",
    "role": "Special Programmes",
    "schedule": {
      "Monday 1st": [
        { "startTime": "15:00", "endTime": "16:00", "type": "bookable", "label": "Bookable slots" }
      ],
      "Tuesday 2nd": [
        { "startTime": "10:45", "endTime": "11:15", "type": "drop-in", "label": "Drop-in" }
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

for (const [repName, rep] of Object.entries(representatives)) {
  rep.committee = committeesForRep(repName);
}

const database = {
  fields,
  representatives,
  externalBookings
};

const databaseJson = JSON.stringify(database, null, 2);

fs.writeFileSync(path.join(dataDir, 'availability.json'), databaseJson, 'utf8');
fs.writeFileSync(path.join(publicDataDir, 'availability.json'), databaseJson, 'utf8');

console.log('Successfully generated src/data/availability.json and public/data/availability.json!');

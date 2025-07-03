import { Roster, NurseStats, AssignmentRow } from '../types';

// Strict 1:1 logic enabled!
const STRICT_ONE_TO_ONE = true;

// ICU-specific substrings for 1:1 assignment identification
const ONE_TO_ONE_KEYWORDS = [
  "1:1", "1to1", "crrt", "impella", "sled", "ecmo", "iabp",
  "organ", "ourlegacy", "donation", "dcd"
];

// Utility: Returns true if any relevant field in row contains a 1:1 keyword
function isOneToOneAssignment(row: AssignmentRow): boolean {
  const fieldsToCheck = [
    row.status,
    row.prec,
    row.patient
    // Add row.notes or others here if present
  ];
  return fieldsToCheck.some(field =>
    field &&
    ONE_TO_ONE_KEYWORDS.some(kw =>
      field.toLowerCase().includes(kw)
    )
  );
}

// Classifies nurses for a shift as 1:1 (strict) and/or triple
function classifyNurses(assignments: AssignmentRow[], shift: "day" | "night") {
  // nurse: { rows (assignments), rooms assigned }
  const nurseAssignmentMap: Record<string, { rows: AssignmentRow[]; rooms: Set<string> }> = {};

  for (const row of assignments) {
    const nurse = shift === "day" ? row.rnDay : row.rnNight;
    if (!nurse) continue;
    if (!nurseAssignmentMap[nurse]) nurseAssignmentMap[nurse] = { rows: [], rooms: new Set() };
    nurseAssignmentMap[nurse].rows.push(row);
    nurseAssignmentMap[nurse].rooms.add(row.room);
  }

  // Strict 1:1: nurse has exactly one assignment, and that assignment is flagged as 1:1
  const oneToOnes = Object.entries(nurseAssignmentMap)
    .filter(([_, val]) =>
      val.rows.length === 1 && isOneToOneAssignment(val.rows[0])
    )
    .map(([nurse]) => nurse);

  // Triple detection: assigned to exactly 3 rooms (ICU standard for "triple")
  const triples = Object.entries(nurseAssignmentMap)
    .filter(([_, val]) => val.rooms.size === 3)
    .map(([nurse]) => nurse);

  return { oneToOnes, triples };
}

// =======================
// MAIN ANALYTICS FUNCTIONS
// =======================

export function calculateNurseStats(roster: Roster): NurseStats[] {
  if (!roster) return [];

  const nurseMap: Map<string, NurseStats> = new Map();

  const initializeNurse = (
    name: string,
    chargeNurse: string,
    isFloat: boolean = false
  ) => {
    if (!nurseMap.has(name)) {
      nurseMap.set(name, {
        name,
        patientCount: 0,
        patients: [],
        isTriple: false,
        isOneToOne: false,
        isFloat: isFloat,
        isHighAssignment: false,
        chargeNurse: chargeNurse,
      });
    }
  };

  const { assignments, floats, chargeNurses } = roster;

  // Initialize float nurses (day/night)
  (floats?.day || []).forEach(name =>
    initializeNurse(name.trim(), chargeNurses.day, true)
  );
  (floats?.night || []).forEach(name =>
    initializeNurse(name.trim(), chargeNurses.night, true)
  );

  // Process all assignments (for day and night shifts)
  assignments.forEach(assignment => {
    const { room, patient, rnDay, rnNight } = assignment;
    // Day shift
    if (rnDay && rnDay.trim() !== '') {
      const name = rnDay.trim();
      initializeNurse(name, chargeNurses.day);
      const stats = nurseMap.get(name)!;
      if (patient && patient.trim() !== '') {
        stats.patientCount++;
        stats.patients.push({ room, patient });
      }
    }
    // Night shift
    if (rnNight && rnNight.trim() !== '') {
      const name = rnNight.trim();
      initializeNurse(name, chargeNurses.night);
      const stats = nurseMap.get(name)!;
      if (patient && patient.trim() !== '') {
        stats.patientCount++;
        stats.patients.push({ room, patient });
      }
    }
  });

  // Use classifyNurses to set isOneToOne and isTriple flags
  const dayClass = classifyNurses(assignments, "day");
  const nightClass = classifyNurses(assignments, "night");

  nurseMap.forEach((stats, name) => {
    stats.isOneToOne = dayClass.oneToOnes.includes(name) || nightClass.oneToOnes.includes(name);
    stats.isTriple =
      (dayClass.triples.includes(name) && stats.patientCount === 3) ||
      (nightClass.triples.includes(name) && stats.patientCount === 3);
    stats.isHighAssignment = stats.patientCount >= 5;
  });

  return Array.from(nurseMap.values());
}

// Aggregates summary stats across all nurses for reporting
export function calculateSummaryStats(nurseStats: NurseStats[]) {
  return {
    totalNurses: nurseStats.length,
    totalPatients: nurseStats.reduce((sum, nurse) => sum + nurse.patientCount, 0),
    totalTriples: nurseStats.filter(n => n.isTriple).length,
    totalOneToOnes: nurseStats.filter(n => n.isOneToOne).length,
    totalFloats: nurseStats.filter(n => n.isFloat).length,
  };
}

// Aggregates stats across multiple rosters (e.g., for batch analytics)
export function processBatchRosters(rosters: Roster[]): NurseStats[] {
  const aggregatedStats: Map<string, NurseStats> = new Map();

  for (const roster of rosters) {
    const dailyStats = calculateNurseStats(roster);
    for (const dailyStat of dailyStats) {
      const { name } = dailyStat;
      if (aggregatedStats.has(name)) {
        const existing = aggregatedStats.get(name)!;
        existing.patientCount += dailyStat.patientCount;
        existing.patients.push(...dailyStat.patients.map(p => ({
          ...p,
          patient: `${p.patient} (${roster.date})`,
        })));
        existing.isTriple = existing.isTriple || dailyStat.isTriple;
        existing.isOneToOne = existing.isOneToOne || dailyStat.isOneToOne;
        existing.isFloat = existing.isFloat || dailyStat.isFloat;
      } else {
        const newStat = { ...dailyStat, patients: [...dailyStat.patients] };
        aggregatedStats.set(name, newStat);
      }
    }
  }

  aggregatedStats.forEach(stats => {
    stats.isHighAssignment = stats.patientCount >= 5;
  });

  return Array.from(aggregatedStats.values());
}

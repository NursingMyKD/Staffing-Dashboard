import { Roster, NurseStats } from '../types';

export function calculateNurseStats(roster: Roster): NurseStats[] {
  if (!roster) return [];

  const nurseMap: Map<string, NurseStats> = new Map();

  const initializeNurse = (name: string, chargeNurse: string, isFloat: boolean = false) => {
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

  // Initialize float nurses
  (floats?.day || []).forEach(name => initializeNurse(name.trim(), chargeNurses.day, true));
  (floats?.night || []).forEach(name => initializeNurse(name.trim(), chargeNurses.night, true));

  // Process day and night shift assignments
  assignments.forEach(assignment => {
    const { room, patient, rnDay, rnNight, status } = assignment;
    
    // Day Shift
    if (rnDay && rnDay.trim() !== '') {
      const name = rnDay.trim();
      initializeNurse(name, chargeNurses.day);
      const stats = nurseMap.get(name);
      if (stats && patient && patient.trim() !== '') {
        stats.patientCount++;
        stats.patients.push({ room, patient });
      }
    }
    
    // Night Shift
    if (rnNight && rnNight.trim() !== '') {
      const name = rnNight.trim();
      initializeNurse(name, chargeNurses.night);
      const stats = nurseMap.get(name);
      if (stats && patient && patient.trim() !== '') {
        stats.patientCount++;
        stats.patients.push({ room, patient });
      }
    }

    // Check for high-acuity assignments based on status for both shifts
     if (patient && patient.trim() !== '' && status && status.trim() !== '') {
        const s = status.toLowerCase();
        if(s.includes('1:1') || s.includes('1-1')) {
            if(rnDay && nurseMap.has(rnDay.trim())) nurseMap.get(rnDay.trim())!.isOneToOne = true;
            if(rnNight && nurseMap.has(rnNight.trim())) nurseMap.get(rnNight.trim())!.isOneToOne = true;
        }
    }
  });

  // Final calculations (Triples, High Assignment)
  nurseMap.forEach(stats => {
    if (stats.patientCount === 3) {
      stats.isTriple = true;
    }
    if (stats.patientCount >= 5) {
        stats.isHighAssignment = true;
    }
  });
  
  return Array.from(nurseMap.values());
}


export function calculateSummaryStats(nurseStats: NurseStats[]) {
    return {
        totalNurses: nurseStats.length,
        totalPatients: nurseStats.reduce((sum, nurse) => sum + nurse.patientCount, 0),
        totalTriples: nurseStats.filter(n => n.isTriple).length,
        totalOneToOnes: nurseStats.filter(n => n.isOneToOne).length,
        totalFloats: nurseStats.filter(n => n.isFloat).length,
    };
}


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
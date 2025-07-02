// A single row in the main assignment grid.
export interface AssignmentRow {
  room: string;
  prec: string; // Precaution
  patient: string;
  mrn: string; // Medical Record Number
  status: string;
  rnDay: string;
  extDay: string;
  rnNight: string;
  extNight: string;
}

// The entire roster for a single sheet/day.
export interface Roster {
  date: string;
  pctsDay: string;
  pctsNight: string;
  chargeNurses: {
    day: string;
    night: string;
  };
  assignments: AssignmentRow[];
  floats: {
    day: string[];
    night: string[];
  };
  respiratory: string[];
}

// Statistics for a single nurse.
export interface NurseStats {
  name: string;
  patientCount: number;
  patients: {
    room: string;
    patient: string;
  }[];
  isTriple: boolean;
  isOneToOne: boolean;
  isFloat: boolean;
  isHighAssignment: boolean;
  chargeNurse?: string;
}

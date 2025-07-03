import { Roster } from "./types";

export interface AssignmentGridProps {
  roster: Roster;
  onRosterChange: (updatedRoster: Roster) => void;
  availableNurses: { day: string[]; night: string[] };
  onClearRoster?: () => void; // <-- Optional!
}

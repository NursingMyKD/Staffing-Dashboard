// Import types
import { Roster, AssignmentRow } from '../types';

// If you need to define types for reference, uncomment and adapt as needed:
/*
export interface AssignmentRow {
  room: string;
  prec: string;
  patient: string;
  mrn: string;
  status: string;
  rnDay: string;
  extDay: string;
  rnNight: string;
  extNight: string;
}

export interface Roster {
  date: string;
  pctsDay: string;
  pctsNight: string;
  chargeNurses: { day: string; night: string };
  assignments: AssignmentRow[];
  floats: { day: string[]; night: string[] };
  respiratory: string[];
}
*/

declare const mammoth: any;

// --- DOCX TO HTML ---
export async function readDocxFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer: event.target.result });
          resolve(result.value);
        } catch (err) {
          reject(new Error("Failed to parse .docx file."));
        }
      } else {
        reject(new Error("Failed to read file."));
      }
    };
    reader.onerror = () => reject(new Error("Error reading file."));
    reader.readAsArrayBuffer(file);
  });
}

// --- UTILITIES ---
const getCellText = (cell: HTMLElement | null | undefined): string =>
  cell ? cell.innerText.trim() : '';

const extractListFromCell = (cell: HTMLElement | null | undefined): string[] =>
  getCellText(cell).split('\n').map(s => s.trim()).filter(Boolean);

const parseDate = (input: string): string => {
  const dateRegex = /\b(?:mon|tue|wed|thu|fri|sat|sun)\w*,?\s+\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/i;
  const match = input.match(dateRegex);
  if (match) {
    const cleaned = match[0].replace(/(\d{1,2})(st|nd|rd|th)/, '$1').replace(/,\s+/g, ' ');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  // fallback: try to parse any ISO or US date format in string
  const fallbackMatch = input.match(/\d{4}-\d{2}-\d{2}/) || input.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  if (fallbackMatch) {
    const d = new Date(fallbackMatch[0]);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
};

function autoMapHeaders(headerCells: string[], keys: string[]): { [k: string]: number } {
  // Fuzzy map columns for each key
  const colIdx: { [k: string]: number } = {};
  for (const key of keys) {
    const idx = headerCells.findIndex(h => h.replace(/\s/g, '').toLowerCase().includes(key.toLowerCase().replace(/\s/g, '')));
    colIdx[key] = idx;
  }
  return colIdx;
}

// --- MAIN GRID AND SECTIONS ---
function parseAssignmentsAndBottomSection(
  rows: HTMLTableRowElement[],
  startRoom = 501,
  endRoom = 532
): {
  assignments: AssignmentRow[];
  floats: { day: string[]; night: string[] };
  respiratory: string[];
} {
  const numRooms = endRoom - startRoom + 1;
  const assignments: AssignmentRow[] = Array.from({ length: numRooms }, (_, i) => ({
    room: (startRoom + i).toString(),
    prec: '', patient: '', mrn: '', status: '',
    rnDay: '', extDay: '', rnNight: '', extNight: '',
  }));
  // --- FIX: Explicitly type floats
  let floats: { day: string[]; night: string[] } = { day: [], night: [] };
  let respiratory: string[] = [];

  // Find grid header
  const headerRowIdx = rows.findIndex(r => r.innerText && r.innerText.toUpperCase().includes('ROOM') && r.innerText.toUpperCase().includes('PATIENT'));
  if (headerRowIdx === -1) throw new Error('Assignment table header not found.');
  const headerRow = rows[headerRowIdx];
  const headerCells = Array.from(headerRow.querySelectorAll<HTMLElement>('th,td')).map(getCellText);
  const colMap = autoMapHeaders(headerCells, ['room', 'prec', 'patient', 'mrn', 'status', 'rnday', 'extday', 'rnnight', 'extnight']);

  let gridEndIdx = rows.findIndex((r, i) => i > headerRowIdx && /(FLOAT|RESPIRATORY|CPU)/i.test(r.innerText));
  if (gridEndIdx === -1) gridEndIdx = rows.length;

  // Fill assignments
  for (let i = headerRowIdx + 1; i < gridEndIdx; ++i) {
    const row = rows[i];
    if (!row || !row.cells) continue;
    const cells = Array.from(row.cells);
    const roomStr = getCellText(cells[colMap['room']]);
    const room = parseInt(roomStr, 10);
    if (!isNaN(room) && room >= startRoom && room <= endRoom) {
      const idx = room - startRoom;
      assignments[idx] = {
        room: roomStr,
        prec: getCellText(cells[colMap['prec']]),
        patient: getCellText(cells[colMap['patient']]),
        mrn: getCellText(cells[colMap['mrn']]),
        status: getCellText(cells[colMap['status']]),
        rnDay: getCellText(cells[colMap['rnday']]),
        extDay: getCellText(cells[colMap['extday']]),
        rnNight: getCellText(cells[colMap['rnnight']]),
        extNight: getCellText(cells[colMap['extnight']]),
      };
    }
  }

  // --- Bottom Section ---
  for (let i = gridEndIdx; i < rows.length; ++i) {
    const row = rows[i];
    const txt = row.innerText.toUpperCase();
    if (txt.includes('FLOATS') || txt.includes('FLOAT')) {
      if (txt.includes('7A-7P')) floats.day = extractListFromCell(row.cells[0]);
      if (txt.includes('7P-7A')) floats.night = extractListFromCell(row.cells[0]);
    }
    if (txt.includes('RESPIRATORY')) respiratory = extractListFromCell(row.cells[0]);
  }
  return { assignments, floats, respiratory };
}

// --- INFO TABLE/BLOCK PARSING ---
function parseInfoTable(table: HTMLTableElement): Partial<Roster> {
  const rows = Array.from(table.querySelectorAll('tr'));
  const roster: Partial<Roster> = { chargeNurses: { day: '', night: '' } };

  for (const row of rows) {
    const txt = row.innerText.toUpperCase();
    if (!roster.date && /\b(?:mon|tue|wed|thu|fri|sat|sun)/.test(txt)) {
      roster.date = parseDate(txt);
    }
    if (txt.includes('PCT')) {
      if (txt.includes('7A-7P') || txt.includes('DAY')) {
        const m = row.innerText.match(/PCT\S*:?\s*(.+?)\s*(?:7[aA]-7[pP]|DAY)/);
        if (m) roster.pctsDay = m[1].trim();
      }
      if (txt.includes('7P-7A') || txt.includes('NIGHT')) {
        const m = row.innerText.match(/PCT\S*:?\s*(.+?)\s*(?:7[pP]-7[aA]|NIGHT)/);
        if (m) roster.pctsNight = m[1].trim();
      }
    }
    if (txt.includes('CHARGE NURSE')) {
      if (txt.includes('7A-7P') || txt.includes('DAY')) {
        const m = row.innerText.match(/CHARGE NURSE:\s*([\w\-]+)/i);
        if (m) roster.chargeNurses!.day = m[1].trim();
      }
      if (txt.includes('7P-7A') || txt.includes('NIGHT')) {
        const m = row.innerText.match(/CHARGE NURSE:\s*([\w\-]+)/i);
        if (m) roster.chargeNurses!.night = m[1].trim();
      }
    }
  }
  return roster;
}

// --- MAIN ENTRYPOINT ---
export const parseRosterFromHtml = (htmlString: string): Roster => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const tables = doc.querySelectorAll('table');
  // Info table: first table with "charge nurse" or fallback
  const infoTable = Array.from(tables).find(t => (t.textContent || '').toUpperCase().includes('CHARGE NURSE')) || tables[0];
  // Assignment tables: everything else
  const contentRows = Array.from(tables)
    .filter(t => t !== infoTable)
    .flatMap(t => Array.from(t.querySelectorAll('tr')));
  // Date fallback: whole doc body
  const bodyText = doc.body.innerText;
  const dateFromBody = parseDate(bodyText);
  // Parse main data
  const { assignments, floats, respiratory } = parseAssignmentsAndBottomSection(contentRows);
  const { chargeNurses, pctsDay, pctsNight, date: infoDate } = parseInfoTable(infoTable);

  // Date order: infoTable > body > now
  const finalDate = infoDate || dateFromBody || new Date().toISOString().split('T')[0];
  return {
    date: finalDate,
    pctsDay: pctsDay || '',
    pctsNight: pctsNight || '',
    chargeNurses: chargeNurses || { day: '', night: '' },
    assignments,
    floats,
    respiratory,
  };
};

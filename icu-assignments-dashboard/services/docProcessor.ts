import { Roster, AssignmentRow } from '../types';

declare const mammoth: any;

export async function readDocxFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer: event.target.result });
          resolve(result.value);
        } catch (err) {
          reject(new Error("Failed to parse .docx file. It might be corrupted or in an unsupported format."));
        }
      } else {
        reject(new Error("Failed to read file."));
      }
    };
    reader.onerror = () => reject(new Error("Error reading file."));
    reader.readAsArrayBuffer(file);
  });
}

// Helper to get text from a cell, cleaning it up.
const getCellText = (cell: HTMLElement | null | undefined): string => {
    if (!cell) return '';
    // Use innerText to handle line breaks within cells correctly
    return cell.innerText.trim();
};

// Helper to extract a list of names from a single cell's text content
const extractListFromCell = (cell: HTMLElement | null | undefined): string[] => {
    if (!cell) return [];
    return getCellText(cell).split('\n').map(s => s.trim()).filter(Boolean);
};


/**
 * Parses the top information table (Teams, PCTs, Charge Nurses).
 */
function parseInfoTable(table: HTMLTableElement): Partial<Roster> {
    const rosterPart: Partial<Roster> = {
        chargeNurses: { day: '', night: '' },
    };

    const rows = Array.from(table.querySelectorAll('tr'));
    
    const getRowTextFromCells = (row: HTMLTableRowElement) => Array.from(row.cells).map(getCellText).join(' ');

    // Day Shift Row (usually the first complex one)
    const dayRow = rows.find(r => getRowTextFromCells(r).includes('7A-7P'));
    if (dayRow) {
        // Try to find a cell that starts with 'DATE' (legacy)
        let dateCell = Array.from(dayRow.cells).find(c => getCellText(c).toUpperCase().startsWith('DATE'));
        let dateText = '';
        if (dateCell) {
            dateText = getCellText(dateCell).replace(/DATE:?/i, '').trim();
        } else {
            // Try to find a cell that looks like a date (e.g., 'Friday, April 4th, 2025')
            dateCell = Array.from(dayRow.cells).find(c => /\b\w+, \w+ \d{1,2}(st|nd|rd|th)?, \d{4}\b/.test(getCellText(c)));
            if (dateCell) {
                dateText = getCellText(dateCell).trim();
            }
        }
        if (dateText) {
            // Try to parse the date string
            let parsedDate = new Date(dateText);
            if (isNaN(parsedDate.getTime())) {
                // Try to remove ordinal suffixes (st, nd, rd, th)
                const cleaned = dateText.replace(/(\d{1,2})(st|nd|rd|th)/, '$1');
                parsedDate = new Date(cleaned);
            }
            if (!isNaN(parsedDate.getTime())) {
                const year = parsedDate.getFullYear();
                const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                const day = String(parsedDate.getDate()).padStart(2, '0');
                rosterPart.date = `${year}-${month}-${day}`;
            }
        }
        
        const pctDayCell = Array.from(dayRow.cells).find(c => getCellText(c).toUpperCase().includes("PCT'S"));
        rosterPart.pctsDay = getCellText(pctDayCell).replace(/PCT'S:?/i, '').trim();

        const chargeDayCell = Array.from(dayRow.cells).find(c => getCellText(c).includes('CHARGE NURSE:'));
        if (chargeDayCell) {
             const match = getCellText(chargeDayCell).match(/CHARGE NURSE:\s*(#?\S+)/);
             if(match) rosterPart.chargeNurses!.day = match[1];
        }
    }

    // Night Shift Row
    const nightRow = rows.find(r => getRowTextFromCells(r).includes('7P-7A'));
    if (nightRow) {
        const pctNightCell = Array.from(nightRow.cells).find(c => getCellText(c).toUpperCase().includes("PCT'S"));
        rosterPart.pctsNight = getCellText(pctNightCell).replace(/PCT'S:?/i, '').trim();

        const chargeNightCell = Array.from(nightRow.cells).find(c => getCellText(c).includes('CHARGE NURSE:'));
        if (chargeNightCell) {
            const match = getCellText(chargeNightCell).match(/CHARGE NURSE:\s*(#?\S+)/);
            if(match) rosterPart.chargeNurses!.night = match[1];
        }
    }
    
    if (rosterPart.pctsDay && !rosterPart.pctsNight) {
        rosterPart.pctsNight = rosterPart.pctsDay;
    }

    return rosterPart;
}

/**
 * Main parser function that orchestrates the parsing of the entire document.
 * This version is resilient to table merging during .docx conversion.
 */
export function parseRosterFromHtml(htmlContent: string): Roster {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const tables = Array.from(doc.querySelectorAll('table'));
    if (tables.length < 2) {
         throw new Error(`Parsing failed: Expected at least 2 tables (info, content), but found ${tables.length}.`);
    }

    // Identify info table based on keywords
    const INFO_KEYWORDS = ['CHARGE NURSE', 'TEAM A', 'PCT\'S'];
    const infoTable = tables.find(t => INFO_KEYWORDS.some(k => (t.textContent || '').toUpperCase().includes(k)));
    if (!infoTable) throw new Error('Failed to identify the main information table (Charge Nurse, PCTs).');
    
    // Assume the rest of the content is in the other table(s). Combine them into one list of rows.
    const contentRows = tables
        .filter(t => t !== infoTable)
        .flatMap(t => Array.from(t.querySelectorAll('tr')));

    const GRID_HEADER_KEYWORDS = ['RM', 'PATIENT', 'RN DAYS', 'RN NIGHTS'];
    const BOTTOM_HEADER_KEYWORDS = ['RESPIRATORY THERAPISTS', 'FLOATS (DAYS)', 'FLOATS (NIGHTS)'];

    let gridHeaderIndex = -1;
    let bottomHeaderIndex = -1;
    
    let maxGridScore = 0;
    let maxBottomScore = 0;

    const getRowTextFromCells = (row: HTMLTableRowElement) => {
        return Array.from(row.querySelectorAll<HTMLElement>('th, td')).map(getCellText).join(' ').toUpperCase();
    }

    // Find the best candidate row for each header based on score
    contentRows.forEach((row, index) => {
        const rowText = getRowTextFromCells(row);
        
        const gridScore = GRID_HEADER_KEYWORDS.filter(k => rowText.includes(k)).length;
        if (gridScore > maxGridScore) {
            maxGridScore = gridScore;
            gridHeaderIndex = index;
        }

        const bottomScore = BOTTOM_HEADER_KEYWORDS.filter(k => rowText.includes(k)).length;
        if (bottomScore > maxBottomScore) {
            maxBottomScore = bottomScore;
            bottomHeaderIndex = index;
        }
    });
    
    // Validate the findings
    if (gridHeaderIndex === -1 || maxGridScore < 3) { // Require at least 3 of 4 keywords
        throw new Error('Could not find the main assignment grid header row (RM, PATIENT, etc.). Please check file formats.');
    }

    // The bottom header must be different, come after the grid header, and have a decent score
    if (bottomHeaderIndex === gridHeaderIndex || bottomHeaderIndex < gridHeaderIndex || maxBottomScore < 2) {
        bottomHeaderIndex = -1; // Invalidate if it's not a good candidate
    }

    // --- Parse Main Grid ---
    const gridBodyEndIndex = bottomHeaderIndex !== -1 ? bottomHeaderIndex : contentRows.length;
    const gridRows = contentRows.slice(gridHeaderIndex, gridBodyEndIndex);
    const mainGridHeaderRow = gridRows[0];
    const mainGridBodyRows = gridRows.slice(1);

    const initialAssignments: AssignmentRow[] = Array.from({ length: 32 }, (_, i) => ({
        room: (501 + i).toString(), prec: '', patient: '', mrn: '', status: '',
        rnDay: '', extDay: '', rnNight: '', extNight: '',
    }));

    const headerCells = Array.from(mainGridHeaderRow.querySelectorAll<HTMLElement>('th, td')).map(c => getCellText(c).toUpperCase());
    const colIdx: { [key: string]: number } = {};
    const getIndex = (text: string) => headerCells.findIndex(h => h.includes(text));

    colIdx.rm = getIndex('RM');
    colIdx.prec = getIndex('PREC');
    colIdx.patient = getIndex('PATIENT');
    colIdx.mrn = getIndex('MRN');
    colIdx.status = getIndex('STATUS');
    colIdx.rnDay = getIndex('RN DAYS');
    colIdx.rnNight = getIndex('RN NIGHTS');
    
    const extIndices = headerCells.map((h, i) => h.includes('EXT') ? i : -1).filter(i => i > -1);
    colIdx.extDay = extIndices.find(i => i > colIdx.rnDay && i < (colIdx.rnNight > -1 ? colIdx.rnNight : Infinity)) ?? -1;
    colIdx.extNight = extIndices.find(i => i > colIdx.rnNight) ?? -1;

    if (colIdx.rm !== -1) {
      mainGridBodyRows.forEach(row => {
          const cells = Array.from(row.cells);
          const roomNumberStr = getCellText(cells[colIdx.rm]);
          if (roomNumberStr) {
              const roomNumber = parseInt(roomNumberStr, 10);
              if (!isNaN(roomNumber) && roomNumber >= 501 && roomNumber <= 532) {
                  const index = roomNumber - 501;
                  initialAssignments[index] = {
                      room: roomNumberStr,
                      prec: getCellText(cells[colIdx.prec]),
                      patient: getCellText(cells[colIdx.patient]),
                      mrn: getCellText(cells[colIdx.mrn]),
                      status: getCellText(cells[colIdx.status]),
                      rnDay: getCellText(cells[colIdx.rnDay]),
                      extDay: getCellText(cells[colIdx.extDay]),
                      rnNight: getCellText(cells[colIdx.rnNight]),
                      extNight: getCellText(cells[colIdx.extNight]),
                  };
              }
          }
      });
    }

    // --- Parse Bottom Section ---
    const bottomPart: Pick<Roster, 'floats' | 'respiratory'> = {
        floats: { day: [], night: [] },
        respiratory: [],
    };
    if (bottomHeaderIndex !== -1) {
        const bottomRows = contentRows.slice(bottomHeaderIndex);
        if (bottomRows.length > 1) {
            const bottomHeaderRow = bottomRows[0];
            const bottomDataRow = bottomRows[1];
            
            const bottomHeaderCells = Array.from(bottomHeaderRow.querySelectorAll<HTMLElement>('th, td'));
            const bottomDataCells = Array.from(bottomDataRow.querySelectorAll('td'));

            const headerMap = bottomHeaderCells.reduce((acc, cell, index) => {
                const text = getCellText(cell).toUpperCase();
                if (text.includes('RESPIRATORY')) acc.respiratory = index;
                if (text.includes('FLOATS (DAYS)')) acc.floatsDay = index;
                if (text.includes('FLOATS (NIGHTS)')) acc.floatsNight = index;
                return acc;
            }, {} as { respiratory?: number, floatsDay?: number, floatsNight?: number });

            if (headerMap.respiratory !== undefined) bottomPart.respiratory = extractListFromCell(bottomDataCells[headerMap.respiratory]);
            if (headerMap.floatsDay !== undefined) bottomPart.floats.day = extractListFromCell(bottomDataCells[headerMap.floatsDay]);
            if (headerMap.floatsNight !== undefined) bottomPart.floats.night = extractListFromCell(bottomDataCells[headerMap.floatsNight]);
        }
    }

    // --- Combine and Finalize ---
    const infoPart = parseInfoTable(infoTable);
    const finalDate = infoPart.date || new Date().toISOString().split('T')[0];

    return {
        date: finalDate,
        pctsDay: infoPart.pctsDay || '',
        pctsNight: infoPart.pctsNight || '',
        chargeNurses: infoPart.chargeNurses || { day: '', night: '' },
        assignments: initialAssignments,
        ...bottomPart,
    };
}

import React, { useState, useEffect, useRef, FC, KeyboardEvent } from 'react';
import { Roster, AssignmentRow } from '../types';

interface EditableCellProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  options?: string[];
  listId?: string;
  className?: string;
  placeholder?: string;
}

const EditableCell: FC<EditableCellProps> = ({ initialValue, onSave, options, listId, className, placeholder }) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    if (value !== initialValue) {
      onSave(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value || ''}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      list={listId}
      placeholder={placeholder}
      className={`w-full h-full bg-transparent p-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm ${className}`}
    />
  );
};


interface EditableTextareaProps {
    initialValue: string;
    onSave: (newValue: string) => void;
    placeholder?: string;
    className?: string;
}

const EditableTextarea: FC<EditableTextareaProps> = ({ initialValue, onSave, placeholder, className }) => {
    const [value, setValue] = useState(initialValue);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);

    const handleSave = () => {
        if (value !== initialValue) {
            onSave(value);
        }
    };

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            placeholder={placeholder}
            className={`w-full bg-transparent p-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm resize-none overflow-hidden ${className}`}
            rows={1}
        />
    );
};


interface ListEditorProps {
    values: string[];
    onChange: (newValues: string[]) => void;
}

const ListEditor: FC<ListEditorProps> = ({ values, onChange }) => {
    const text = (values || []).join('\n');
    
    const handleSave = (newText: string) => {
        const newValues = newText.split('\n').filter(line => line.trim() !== '');
        onChange(newValues);
    };

    return (
        <EditableTextarea
            initialValue={text}
            onSave={handleSave}
            className="h-full text-sm"
            placeholder="Enter names..."
        />
    );
};


interface AssignmentGridProps {
  roster: Roster;
  onRosterChange: (updatedRoster: Roster) => void;
  availableDayNurses: string[];
  availableNightNurses: string[];
}

const HEADER_BG = 'bg-[#e6f2e8]';
const BORDER_STYLE = 'border border-black';
const HEADER_CELL_STYLE = `p-1 ${BORDER_STYLE} ${HEADER_BG} font-bold text-center align-middle`;
const DATA_CELL_STYLE = `p-0 ${BORDER_STYLE} align-top`;


export const AssignmentGrid: FC<AssignmentGridProps> = ({ roster, onRosterChange, availableDayNurses, availableNightNurses }) => {

  const handleCellChange = (rowIndex: number, field: keyof AssignmentRow, newValue: string) => {
    const newAssignments = [...roster.assignments];
    newAssignments[rowIndex] = { ...newAssignments[rowIndex], [field]: newValue };
    onRosterChange({ ...roster, assignments: newAssignments });
  };
  
  const handleFieldChange = (field: keyof Roster | `chargeNurses.day` | `chargeNurses.night` | `pctsDay` | `pctsNight`, newValue: any) => {
    const newRoster = { ...roster };
    if (field === 'chargeNurses.day') newRoster.chargeNurses.day = newValue;
    else if (field === 'chargeNurses.night') newRoster.chargeNurses.night = newValue;
    else if (field === 'pctsDay') newRoster.pctsDay = newValue;
    else if (field === 'pctsNight') newRoster.pctsNight = newValue;
    else if(field === 'date') newRoster.date = newValue;

    onRosterChange(newRoster);
  };
  
  const handleListChange = (listName: 'respiratory' | 'floats.day' | 'floats.night', newValues: string[]) => {
    const newRoster = {...roster};
    if (listName === 'respiratory') newRoster.respiratory = newValues;
    else if (listName === 'floats.day') newRoster.floats.day = newValues;
    else if (listName === 'floats.night') newRoster.floats.night = newValues;
    onRosterChange(newRoster);
  }

  return (
    <div className="bg-white text-black p-1 sm:p-2 border-2 border-black font-sans text-xs sm:text-sm">
        <h1 className="text-center font-bold text-base sm:text-lg my-1">ADVENT HEALTH DAYTONA BEACH ICU</h1>

        {/* Info Header */}
        <table className="w-full border-collapse border-2 border-black">
            <tbody>
                <tr className="divide-x divide-black">
                    <td className={`${BORDER_STYLE} w-[20%] text-center font-bold align-middle`}>TEAM A</td>
                    <td className={`${BORDER_STYLE} row-span-2 p-1 align-top w-[55%]`}>
                        <div className="flex items-center">
                            <span className="font-bold mr-2">Date:</span>
                            <EditableCell initialValue={roster.date} onSave={val => handleFieldChange('date', val)} />
                        </div>
                        <div className="flex items-start mt-1">
                            <span className="font-bold mr-2 mt-1">PCT's:</span>
                            <EditableTextarea initialValue={roster.pctsDay} onSave={val => handleFieldChange('pctsDay', val)} />
                        </div>
                    </td>
                    <td className={`${BORDER_STYLE} p-1 align-middle text-center`}>
                        <div className="font-bold">UL:</div>
                        <div className="font-bold my-1">7A-7P</div>
                        <div className="flex items-center justify-center">
                            <span className="font-bold mr-1">CHARGE NURSE:</span>
                            <EditableCell initialValue={roster.chargeNurses.day} onSave={val => handleFieldChange('chargeNurses.day', val)} className="font-bold text-center" />
                        </div>
                    </td>
                </tr>
                <tr className="divide-x divide-black">
                     <td className={`${BORDER_STYLE} text-center font-bold align-middle`}>TEAM B</td>
                     {/* Cell 2 is spanned */}
                     <td className={`${BORDER_STYLE} p-1 align-middle text-center`}></td>
                </tr>
                <tr className="divide-x divide-black">
                    <td className={`${BORDER_STYLE} text-center font-bold align-middle`}>NIGHT SHIFT</td>
                    <td className={`${BORDER_STYLE} p-1 align-top`}>
                        <div className="flex items-start">
                            <span className="font-bold mr-2 mt-1">PCT's:</span>
                            <EditableTextarea initialValue={roster.pctsNight} onSave={val => handleFieldChange('pctsNight', val)} />
                        </div>
                    </td>
                    <td className={`${BORDER_STYLE} p-1 align-middle text-center`}>
                        <div className="font-bold my-1">7P-7A</div>
                         <div className="flex items-center justify-center">
                            <span className="font-bold mr-1">CHARGE NURSE:</span>
                            <EditableCell initialValue={roster.chargeNurses.night} onSave={val => handleFieldChange('chargeNurses.night', val)} className="font-bold text-center" />
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        {/* Main Roster */}
        <table className="w-full border-collapse border-2 border-black mt-1">
            <thead className="text-[10px] sm:text-xs">
                <tr>
                    <th className={`${HEADER_CELL_STYLE} w-[5%]`}>RM</th>
                    <th className={`${HEADER_CELL_STYLE} w-[5%]`}>PREC</th>
                    <th className={`${HEADER_CELL_STYLE} w-[18%]`}>PATIENT</th>
                    <th className={`${HEADER_CELL_STYLE} w-[10%]`}>MRN</th>
                    <th className={`${HEADER_CELL_STYLE} w-[14%]`}>STATUS</th>
                    <th className={`${HEADER_CELL_STYLE} w-[18%]`}>RN DAYS</th>
                    <th className={`${HEADER_CELL_STYLE} w-[5%]`}>EXT</th>
                    <th className={`${HEADER_CELL_STYLE} w-[18%]`}>RN NIGHTS</th>
                    <th className={`${HEADER_CELL_STYLE} w-[5%]`}>EXT</th>
                </tr>
            </thead>
            <tbody>
                {roster.assignments.map((row, rowIndex) => (
                    <tr key={row.room} className={`h-8 ${rowIndex === 15 ? 'border-b-4 border-orange-400' : ''}`}>
                        <td className={`${HEADER_CELL_STYLE} w-[5%]`}>{row.room}</td>
                        <td className={DATA_CELL_STYLE}><EditableCell initialValue={row.prec} onSave={v => handleCellChange(rowIndex, 'prec', v)} /></td>
                        <td className={DATA_CELL_STYLE}><EditableCell initialValue={row.patient} onSave={v => handleCellChange(rowIndex, 'patient', v)} /></td>
                        <td className={DATA_CELL_STYLE}><EditableCell initialValue={row.mrn} onSave={v => handleCellChange(rowIndex, 'mrn', v)} /></td>
                        <td className={DATA_CELL_STYLE}><EditableCell initialValue={row.status} onSave={v => handleCellChange(rowIndex, 'status', v)} /></td>
                        <td className={DATA_CELL_STYLE}><EditableCell initialValue={row.rnDay} onSave={v => handleCellChange(rowIndex, 'rnDay', v)} options={availableDayNurses} listId={`day-nurses-${row.room}`} /></td>
                        <td className={DATA_CELL_STYLE}><EditableCell initialValue={row.extDay} onSave={v => handleCellChange(rowIndex, 'extDay', v)} /></td>
                        <td className={DATA_CELL_STYLE}><EditableCell initialValue={row.rnNight} onSave={v => handleCellChange(rowIndex, 'rnNight', v)} options={availableNightNurses} listId={`night-nurses-${row.room}`} /></td>
                        <td className={DATA_CELL_STYLE}><EditableCell initialValue={row.extNight} onSave={v => handleCellChange(rowIndex, 'extNight', v)} /></td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* Bottom Section */}
        <table className="w-full border-collapse border-2 border-black mt-1 h-32">
            <thead>
                <tr>
                    <th className={`${HEADER_CELL_STYLE} w-1/3`}>RESPIRATORY THERAPISTS:</th>
                    <th className={`${HEADER_CELL_STYLE} w-1/3`}>FLOATS (DAYS)</th>
                    <th className={`${HEADER_CELL_STYLE} w-1/3`}>FLOATS (NIGHTS):</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className={DATA_CELL_STYLE}><ListEditor values={roster.respiratory} onChange={v => handleListChange('respiratory', v)} /></td>
                    <td className={DATA_CELL_STYLE}><ListEditor values={roster.floats.day} onChange={v => handleListChange('floats.day', v)} /></td>
                    <td className={DATA_CELL_STYLE}><ListEditor values={roster.floats.night} onChange={v => handleListChange('floats.night', v)} /></td>
                </tr>
            </tbody>
        </table>
         <div className="text-right text-gray-500 text-[10px] mt-1 pr-1">MARIBEL</div>
    </div>
  );
};
import { NurseStats } from '../types';

function escapeCsvCell(cellData: string | number | boolean): string {
    const stringData = String(cellData);
    if (/[",\n]/.test(stringData)) {
        return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
}

export function exportNursesToCsv(nurses: NurseStats[], date: string, fileNamePrefix: string = 'icu_staffing_report') {
    const fileName = `${fileNamePrefix}_${date}.csv`;
    const headers = [
        'Nurse Name',
        'Patient Count',
        'Is Triple',
        'Is 1-to-1',
        'Is Float',
        'Is High Assignment (5+)',
        'Assigned Patients (Rooms)'
    ];

    const rows = nurses.map(nurse => {
        const patientDetails = nurse.patients.map(p => `${p.patient} (${p.room})`).join('; ');
        
        return [
            nurse.name,
            nurse.patientCount,
            nurse.isTriple,
            nurse.isOneToOne,
            nurse.isFloat,
            nurse.isHighAssignment,
            patientDetails,
        ].map(escapeCsvCell);
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

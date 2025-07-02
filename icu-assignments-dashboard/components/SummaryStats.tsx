import React, { FC, ReactNode } from 'react';
import { UsersIcon, FileTextIcon, AlertTriangleIcon, HeartPulseIcon, BriefcaseIcon } from './icons';

interface SummaryStatsProps {
  totalNurses: number;
  totalPatients: number;
  totalTriples: number;
  totalOneToOnes: number;
  totalFloats: number;
  chargeNurses: {
    day: string;
    night: string;
  };
  historicalRosterCount: number;
}

const StatCard: FC<{ icon: ReactNode; title: string; value: string | number; color: string }> = ({ icon, title, value, color }) => (
  <div className="bg-white p-5 rounded-lg border border-gray-200 flex items-center space-x-4 shadow-sm">
    <div className={`rounded-full p-3 bg-gray-100`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  </div>
);


export const SummaryStats: FC<SummaryStatsProps> = ({ 
  totalNurses,
  totalPatients,
  totalTriples,
  totalOneToOnes,
  totalFloats,
  chargeNurses,
  historicalRosterCount
}) => {
  return (
    <>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          Historical Summary <span className="text-base font-normal text-gray-500">(from {historicalRosterCount} roster{historicalRosterCount !== 1 ? 's' : ''})</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <StatCard 
          icon={<UsersIcon className="w-6 h-6 text-indigo-500" />}
          title="Total Nurses"
          value={totalNurses}
          color="text-gray-900"
        />
        <StatCard 
          icon={<FileTextIcon className="w-6 h-6 text-cyan-500" />}
          title="Total Patients"
          value={totalPatients}
          color="text-gray-900"
        />
        <StatCard 
          icon={<BriefcaseIcon className="w-6 h-6 text-sky-500" />}
          title="Float Assignments"
          value={totalFloats}
          color="text-sky-600"
        />
        <StatCard 
          icon={<AlertTriangleIcon className="w-6 h-6 text-amber-500" />}
          title="Triple Assignments"
          value={totalTriples}
          color="text-amber-600"
        />
        <StatCard 
          icon={<HeartPulseIcon className="w-6 h-6 text-rose-500" />}
          title="High-Acuity 1:1s"
          value={totalOneToOnes}
          color="text-rose-600"
        />
      </div>
    </>
  );
};
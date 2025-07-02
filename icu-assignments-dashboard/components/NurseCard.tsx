import { memo, FC, ReactElement, cloneElement } from 'react';
import { NurseStats } from '../types';
import { UsersIcon, AlertTriangleIcon, HeartPulseIcon, BriefcaseIcon, type IconProps } from './icons';

interface NurseCardProps {
  nurseStats: NurseStats;
}

interface MetricPillProps {
  text: string;
  icon: ReactElement<IconProps>;
  color: 'amber' | 'rose' | 'sky';
  active: boolean;
}

const MetricPill: FC<MetricPillProps> = ({ text, icon, color, active }) => {
  if (!active) return null;
  
  const colors = {
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-800',
    sky: 'bg-sky-100 text-sky-800'
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${colors[color]}`}>
      {cloneElement(icon, { className: 'w-4 h-4' })}
      <span>{text}</span>
    </div>
  );
};

export const NurseCard: FC<NurseCardProps> = memo(({ nurseStats }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm transform hover:-translate-y-1 transition-all duration-300 ease-in-out">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800 truncate flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-gray-500" />
            {nurseStats.name}
          </h3>
          {nurseStats.isHighAssignment && <AlertTriangleIcon className="w-6 h-6 text-red-500 animate-pulse" title="Assigned 5 or more patients" />}
        </div>

        <div className="bg-gray-50 p-3 rounded-md mb-4 border border-gray-200">
          <p className="text-sm text-gray-500">Patient Count</p>
          <p className="text-3xl font-bold text-gray-900">{nurseStats.patientCount}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <MetricPill text="Triple" icon={<AlertTriangleIcon />} color="amber" active={nurseStats.isTriple} />
          <MetricPill text="1-to-1" icon={<HeartPulseIcon />} color="rose" active={nurseStats.isOneToOne} />
          <MetricPill text="Float" icon={<BriefcaseIcon />} color="sky" active={nurseStats.isFloat} />
        </div>

        {nurseStats.patients.length > 0 && (
          <div>
            <h4 className="text-xs text-gray-400 uppercase font-semibold mb-2">Assigned Patients</h4>
            <ul className="space-y-1 text-sm">
              {nurseStats.patients.map(p => (
                <li key={p.room} className="text-gray-600">
                  <span className="font-semibold text-gray-800">{p.room}:</span> {p.patient}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
});

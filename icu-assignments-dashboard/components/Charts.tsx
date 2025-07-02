import React, { useMemo, FC } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { NurseStats } from '../types';

interface ChartsProps {
  nurseStats: NurseStats[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 p-3 border border-gray-300 rounded-lg backdrop-blur-sm shadow-md">
        <p className="label text-gray-700 font-semibold">{`${label}`}</p>
        <p className="intro text-gray-600">{`Count: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

// Extracted ChartContent to be a stable, top-level component
const ChartContent: FC<{data: any[], dataKey: string, fillColor: string}> = ({ data, dataKey, fillColor }) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data for this category.</p>
        </div>
      );
    }
    return (
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" stroke="#4b5563" allowDecimals={false} />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="#4b5563" 
            width={120} 
            tick={{ fontSize: 12 }} 
            interval={0}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}/>
          <Bar dataKey={dataKey} fill={fillColor} barSize={20}>
             <LabelList dataKey={dataKey} position="right" fill="#1f2937" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
};


const AssignmentsChart: FC<{
  data: any[];
  title: string;
  dataKey: string;
  fillColor: string;
}> = ({ data, title, dataKey, fillColor }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">{title}</h3>
      <div style={{ width: '100%', height: 300 }}>
         <ChartContent data={data} dataKey={dataKey} fillColor={fillColor} />
      </div>
    </div>
  )
}


export const Charts: FC<ChartsProps> = ({ nurseStats }) => {
  const { patientCountData, floatData, tripleData, oneToOneData } = useMemo(() => {
    const patientCountData = nurseStats
      .filter(n => n.patientCount > 0)
      .map(n => ({ name: n.name, count: n.patientCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const floatData = nurseStats
      .filter(n => n.isFloat)
      .map(n => ({ name: n.name, count: n.patientCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const tripleData = nurseStats
      .filter(n => n.isTriple)
      .map(n => ({ name: n.name, count: n.patientCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const oneToOneData = nurseStats
      .filter(n => n.isOneToOne)
      .map(n => ({ name: n.name, count: n.patientCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { patientCountData, floatData, tripleData, oneToOneData };
  }, [nurseStats]);
  
  const hasAnyData = nurseStats.length > 0;
  if (!hasAnyData) return null;

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-2 gap-6">
      <AssignmentsChart 
        data={patientCountData}
        title="Patient Load by Nurse (Top 10)"
        dataKey="count"
        fillColor="#818cf8"
      />
      <AssignmentsChart 
        data={floatData}
        title="Float Assignments"
        dataKey="count"
        fillColor="#38bdf8"
      />
      <AssignmentsChart 
        data={tripleData}
        title="Triple Assignments"
        dataKey="count"
        fillColor="#fbbf24"
      />
      <AssignmentsChart 
        data={oneToOneData}
        title="High-Acuity 1:1s"
        dataKey="count"
        fillColor="#fb7185"
      />
    </div>
  );
};
import { FC } from 'react';
import { NurseStats } from '../types';
import { NurseCard } from './NurseCard';
import { SummaryStats } from './SummaryStats';
import { Charts } from './Charts';
import { SearchIcon, DownloadIcon, XCircleIcon, TrashIcon } from './icons';
import { FileUpload } from './FileUpload';

type SortByType = 'name' | 'patients';
type AssignmentFilterType = 'isTriple' | 'isOneToOne' | 'isFloat';

interface DashboardProps {
  nurseStats: NurseStats[];
  summaryStats: {
    totalNurses: number;
    totalPatients: number;
    totalTriples: number;
    totalOneToOnes: number;
    totalFloats: number;
  };
  allChargeNursesForFilter: string[];
  allDatesForFilter: string[];
  dateFilter: string;
  onDateFilterChange: (date: string) => void;
  rosterDate: string;
  nursesToDisplay: NurseStats[];
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  sortBy: SortByType;
  onSortByChange: (sortBy: SortByType) => void;
  assignmentFilters: Set<AssignmentFilterType>;
  onAssignmentFilterChange: (filter: AssignmentFilterType) => void;
  chargeNurseFilter: string;
  onChargeNurseFilterChange: (name: string) => void;
  onExport: () => void;
  onClearFilters: () => void;
  isAnyFilterActive: boolean;
  onFilesSelected: (files: File[]) => void;
  onClearHistory: () => void;
  isLoading: boolean;
  historicalRosterCount: number;
}

const FilterCheckbox: FC<{ label: string; checked: boolean; onChange: () => void; }> = ({ label, checked, onChange }) => (
    <label className="flex items-center space-x-2 cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 rounded bg-gray-100 border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-600">{label}</span>
    </label>
);

export const Dashboard: FC<DashboardProps> = ({
  nurseStats,
  summaryStats,
  allChargeNursesForFilter,
  allDatesForFilter,
  nursesToDisplay,
  searchTerm,
  onSearchTermChange,
  sortBy,
  onSortByChange,
  assignmentFilters,
  onAssignmentFilterChange,
  chargeNurseFilter,
  onChargeNurseFilterChange,
  onExport,
  onClearFilters,
  isAnyFilterActive,
  onFilesSelected,
  onClearHistory,
  isLoading,
  historicalRosterCount,
  dateFilter,
  onDateFilterChange
}) => {

  const dataAvailable = historicalRosterCount > 0;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchTermChange(e.target.value);
  };

  const handleChargeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChargeNurseFilterChange(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortByChange(e.target.value as SortByType);
  };

  return (
    <div className="mt-2 text-black">
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Historical Data Controls</h2>
            <p className="text-sm text-gray-500">Upload rosters to build your historical database.</p>
          </div>
          <div className="flex items-center gap-2">
            <FileUpload onFilesSelected={onFilesSelected} isLoading={isLoading} />
            {dataAvailable && (
              <button onClick={onClearHistory} title="Clear all historical data" className="flex items-center justify-center h-[42px] px-3 text-sm font-medium rounded-md transition-colors duration-200 bg-red-600 text-white hover:bg-red-700">
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading && <p className="text-center text-indigo-600 animate-pulse my-8 font-semibold">Processing Files...</p>}
      
      {!dataAvailable && !isLoading && (
        <div className="text-center py-20 px-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-700">Dashboard is Empty</h3>
            <p className="mt-2 text-gray-500">Upload one or more .docx roster files to begin analyzing historical data.</p>
        </div>
      )}

      {dataAvailable && !isLoading && (
      <>
        <SummaryStats {...summaryStats} historicalRosterCount={historicalRosterCount} />
        <Charts nurseStats={nurseStats} />
        
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="relative w-full">
                  <label htmlFor="search" className="text-xs text-gray-500 mb-1 block">Search Nurse</label>
                  <input
                      id="search"
                      type="text"
                      placeholder="Filter by name..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full bg-white border border-gray-300 rounded-md py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  <SearchIcon className="absolute left-3 bottom-2.5 w-5 h-5 text-gray-400" />
              </div>

              <div className="w-full">
                  <label htmlFor="charge-nurse-filter" className="text-xs text-gray-500 mb-1 block">Filter by Charge Nurse</label>
                  <select
                      id="charge-nurse-filter"
                      value={chargeNurseFilter}
                      onChange={handleChargeFilterChange}
                      className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  >
                      <option value="">All Charge Nurses</option>
                      {allChargeNursesForFilter.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
              </div>

              <div className="w-full">
                  <label htmlFor="date-filter" className="text-xs text-gray-500 mb-1 block">Filter by Date</label>
                  <select
                      id="date-filter"
                      value={dateFilter}
                      onChange={e => onDateFilterChange(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  >
                      <option value="">All Dates</option>
                      {allDatesForFilter.map(date => <option key={date} value={date}>{date}</option>)}
                  </select>
              </div>

              <div>
                  <span className="text-xs text-gray-500 mb-1 block">Filter by Assignment Type</span>
                  <div className="flex items-center gap-4 h-[42px]">
                      <FilterCheckbox label="Triples" checked={assignmentFilters.has('isTriple')} onChange={() => onAssignmentFilterChange('isTriple')} />
                      <FilterCheckbox label="1-to-1s" checked={assignmentFilters.has('isOneToOne')} onChange={() => onAssignmentFilterChange('isOneToOne')} />
                      <FilterCheckbox label="Floats" checked={assignmentFilters.has('isFloat')} onChange={() => onAssignmentFilterChange('isFloat')} />
                  </div>
              </div>

              <div className="flex items-center justify-self-end gap-2">
                  {isAnyFilterActive && (
                      <button onClick={onClearFilters} title="Clear all filters" className="flex items-center justify-center gap-2 h-[42px] px-3 text-sm font-medium rounded-md transition-colors duration-200 bg-gray-200 text-gray-600 hover:bg-gray-300">
                          <XCircleIcon className="w-4 h-4" />
                      </button>
                  )}
                  <button onClick={onExport} title="Export current view to CSV" className="flex items-center justify-center gap-2 h-[42px] px-4 text-sm font-medium rounded-md transition-colors duration-200 bg-emerald-600 text-white hover:bg-emerald-700">
                    <DownloadIcon className="w-4 h-4" />
                      <span>Export</span>
                  </button>
              </div>
          </div>
        </div>
        
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Nurse Details ({nursesToDisplay.length})</h2>
              <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <select
                      value={sortBy}
                      onChange={handleSortChange}
                      className="bg-white border-gray-300 rounded-md py-1 px-2 text-sm focus:ring-1 focus:ring-indigo-500 transition"
                  >
                      <option value="name">Name</option>
                      <option value="patients">Patient Count</option>
                  </select>
              </div>
          </div>
          {nursesToDisplay.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {nursesToDisplay.map(nurse => (
                      <NurseCard key={nurse.name} nurseStats={nurse} currentDate={dateFilter || undefined} />
                  ))}
              </div>
          ) : (
              <div className="text-center py-10 px-6 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-700">No Nurses Found</h3>
                  <p className="mt-1 text-gray-500">Try adjusting your search or filters.</p>
              </div>
          )}
        </div>
      </>
      )}
    </div>
  );
};
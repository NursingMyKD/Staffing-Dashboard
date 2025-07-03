import {
  useState,
  useEffect,
  useMemo,
  FC,
  ReactNode,
  useCallback,
} from 'react';
import { AssignmentGrid } from './components/AssignmentGrid';
import { readDocxFile, parseRosterFromHtml } from './services/docProcessor';
import { Roster } from './types';
import { Dashboard } from './components/Dashboard';
import {
  calculateNurseStats,
  calculateSummaryStats,
  processBatchRosters,
} from './services/statsService';
import { exportNursesToCsv } from './services/exportService';
import {
  FileTextIcon,
  BriefcaseIcon,
  TrashIcon,
} from './components/icons';

// -------------------
// App-wide Types
// -------------------

type View = 'roster' | 'dashboard';
type SortByType = 'name' | 'patients';
type AssignmentFilterType = 'isTriple' | 'isOneToOne' | 'isFloat';

const localStorageKey = {
  live: 'icuLiveRoster',
  history: 'icuHistoricalRosters',
};

// -------------------
// Roster Utilities
// -------------------

const createBlankRoster = (): Roster => ({
  date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
  pctsDay: '#7520: 501-516\n#7521: 517-532',
  pctsNight: '#7520: 501-516\n#7521: 517-532',
  chargeNurses: { day: '#7501', night: '#7501' },
  assignments: Array.from({ length: 32 }, (_, i) => ({
    room: (501 + i).toString(),
    prec: '',
    patient: '',
    mrn: '',
    status: '',
    rnDay: '',
    extDay: '',
    rnNight: '',
    extNight: '',
  })),
  floats: {
    day: [],
    night: [],
  },
  respiratory: [],
});

function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToLocalStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save', key, e);
  }
}

// -------------------
// Main App Component
// -------------------

const App: FC = () => {
  // Core state
  const [liveRoster, setLiveRoster] = useState<Roster>(() =>
    loadFromLocalStorage(localStorageKey.live, createBlankRoster())
  );
  const [historicalRosters, setHistoricalRosters] = useState<Roster[]>(() =>
    loadFromLocalStorage(localStorageKey.history, [])
  );

  // UI/UX state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('roster');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortByType>('name');
  const [assignmentFilters, setAssignmentFilters] = useState<Set<AssignmentFilterType>>(new Set());
  const [chargeNurseFilter, setChargeNurseFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Data persistence
  useEffect(() => {
    saveToLocalStorage(localStorageKey.live, liveRoster);
  }, [liveRoster]);
  useEffect(() => {
    saveToLocalStorage(localStorageKey.history, historicalRosters);
  }, [historicalRosters]);

  // Robust batch import with uniqueness by date+assignments
  const handleFilesProcessing = useCallback(async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    const rostersToAdd: Roster[] = [];
    for (const file of files) {
      try {
        const htmlContent = await readDocxFile(file);
        const roster = parseRosterFromHtml(htmlContent);
        roster.date =
          roster.date ||
          file.name.replace('.docx', '').split(' ')[0] ||
          new Date().toLocaleDateString('en-CA');
        rostersToAdd.push(roster);
      } catch (err: any) {
        setError(
          `Failed to process "${file.name}": ${err.message || err}`
        );
      }
    }
    if (rostersToAdd.length) {
      setHistoricalRosters((prev) => {
        const newMap = new Map(
          prev.map((r) => [r.date + JSON.stringify(r.assignments), r])
        );
        rostersToAdd.forEach((r) =>
          newMap.set(r.date + JSON.stringify(r.assignments), r)
        );
        return Array.from(newMap.values()).sort((a, b) =>
          b.date.localeCompare(a.date)
        );
      });
    }
    setIsLoading(false);
  }, []);

  // Live editing handler
  const handleLiveRosterChange = useCallback((updatedRoster: Roster) => {
    setLiveRoster(updatedRoster);
  }, []);

  // Roster reset
  const handleClearRoster = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to clear the entire live roster? This action cannot be undone.'
      )
    ) {
      setLiveRoster(createBlankRoster());
    }
  }, []);

  // History reset
  const handleClearHistory = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to clear ALL historical data? This action is permanent and cannot be undone.'
      )
    ) {
      setHistoricalRosters([]);
    }
  }, []);

  // Filter toggle
  const handleAssignmentFilterChange = useCallback((filter: AssignmentFilterType) => {
    setAssignmentFilters((prev) => {
      const updated = new Set(prev);
      updated.has(filter) ? updated.delete(filter) : updated.add(filter);
      return updated;
    });
  }, []);

  // Reset dashboard filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setChargeNurseFilter('');
    setAssignmentFilters(new Set());
    setDateFilter('');
  }, []);

  // Dashboard data and memoization
  const dashboardData = useMemo(() => {
    let filteredRosters = historicalRosters;
    if (dateFilter && dateFilter !== 'all') {
      filteredRosters = historicalRosters.filter(r => r.date === dateFilter);
    }
    if (filteredRosters.length === 0) {
      return {
        nurseStats: [],
        summaryStats: {
          totalNurses: 0,
          totalPatients: 0,
          totalTriples: 0,
          totalOneToOnes: 0,
          totalFloats: 0,
        },
        rosterDate: 'No data',
        allChargeNursesForFilter: [],
        allDatesForFilter: [],
      };
    }
    const stats =
      filteredRosters.length > 1
        ? processBatchRosters(filteredRosters)
        : calculateNurseStats(filteredRosters[0]);
    const summary = calculateSummaryStats(stats);

    const allChargeNurses = new Set<string>();
    filteredRosters.forEach((r) => {
      if (r.chargeNurses.day) allChargeNurses.add(r.chargeNurses.day);
      if (r.chargeNurses.night) allChargeNurses.add(r.chargeNurses.night);
    });
    const allDatesForFilter = Array.from(new Set(historicalRosters.map(r => r.date))).sort((a, b) => b.localeCompare(a));

    return {
      nurseStats: stats,
      summaryStats: summary,
      rosterDate:
        filteredRosters.length === 1
          ? filteredRosters[0].date
          : `${filteredRosters.length} days`,
      allChargeNursesForFilter: Array.from(allChargeNurses).sort(),
      allDatesForFilter,
    };
  }, [historicalRosters, dateFilter]);

  // Nurses to display after filtering
  const nursesToDisplay = useMemo(() => {
    return dashboardData.nurseStats
      .filter((nurse) => {
        const nameMatch = nurse.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const chargeNurseMatch =
          !chargeNurseFilter || nurse.chargeNurse === chargeNurseFilter;
        const assignmentMatch =
          assignmentFilters.size === 0 ||
          Array.from(assignmentFilters).every((filter) => nurse[filter]);
        return nameMatch && chargeNurseMatch && assignmentMatch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.patientCount - a.patientCount;
      });
  }, [
    dashboardData.nurseStats,
    searchTerm,
    sortBy,
    assignmentFilters,
    chargeNurseFilter,
  ]);

  // CSV export handler
  const handleExport = useCallback(() => {
    exportNursesToCsv(
      nursesToDisplay,
      dashboardData.rosterDate,
      'icu_dashboard_export'
    );
  }, [nursesToDisplay, dashboardData.rosterDate]);

  // Day/night nurse lists for editing and stats
  const availableNurses = useMemo(() => {
    const dayNurses = new Set<string>(
      (liveRoster.floats.day || []).filter((n) => n && n.trim() !== '')
    );
    const nightNurses = new Set<string>(
      (liveRoster.floats.night || []).filter((n) => n && n.trim() !== '')
    );
    for (const assignment of liveRoster.assignments) {
      if (assignment.rnDay && assignment.rnDay.trim())
        dayNurses.add(assignment.rnDay.trim());
      if (assignment.rnNight && assignment.rnNight.trim())
        nightNurses.add(assignment.rnNight.trim());
    }
    return {
      day: Array.from(dayNurses).sort(),
      night: Array.from(nightNurses).sort(),
    };
  }, [liveRoster]);

  // Accessible, reusable navigation button
  const NavButton: FC<{
    currentView: View;
    targetView: View;
    setView: (v: View) => void;
    children: ReactNode;
  }> = ({ currentView, targetView, setView, children }) => {
    const isActive = currentView === targetView;
    return (
      <button
        onClick={() => setView(targetView)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-200'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {children}
      </button>
    );
  };

  // -------------------
  // Main Render
  // -------------------

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                ICU Assignments Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {view === 'roster'
                  ? `Manage the current day's assignments`
                  : 'Analyze historical staffing data'}
              </p>
            </div>
            {view === 'roster' && (
              <button
                onClick={handleClearRoster}
                title="Clear the live roster"
                className="flex items-center justify-center gap-2 h-[42px] px-3 text-sm font-medium rounded-md transition-colors duration-200 bg-red-600 text-white hover:bg-red-700 no-print"
                aria-label="Clear roster"
              >
                <TrashIcon className="w-5 h-5 mr-1" />
                <span>Clear Roster</span>
              </button>
            )}
          </div>

          {/* Print Button */}
          <div className="mb-4 no-print">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-colors"
              aria-label="Print this page"
            >
              Print This Page
            </button>
          </div>

          <nav className="flex items-center gap-4 mb-4 no-print">
            <div className="flex items-center gap-2 p-1.5 bg-gray-200/70 rounded-lg">
              <NavButton
                currentView={view}
                targetView="roster"
                setView={setView}
              >
                <FileTextIcon className="w-5 h-5" /> Roster
              </NavButton>
              <NavButton
                currentView={view}
                targetView="dashboard"
                setView={setView}
              >
                <BriefcaseIcon className="w-5 h-5" /> Dashboard
              </NavButton>
            </div>
          </nav>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div
            className="my-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
            <button
              className="mt-2 underline"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        )}

        {view === 'roster' ? (
          <AssignmentGrid 
            roster={liveRoster} 
            onRosterChange={handleLiveRosterChange} 
            onClearRoster={handleClearRoster}
            availableNurses={availableNurses}
          />
        ) : (
          <Dashboard 
            nurseStats={dashboardData.nurseStats}
            summaryStats={dashboardData.summaryStats}
            allChargeNursesForFilter={dashboardData.allChargeNursesForFilter}
            allDatesForFilter={dashboardData.allDatesForFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            rosterDate={dashboardData.rosterDate}
            nursesToDisplay={nursesToDisplay}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            assignmentFilters={assignmentFilters}
            onAssignmentFilterChange={handleAssignmentFilterChange}
            chargeNurseFilter={chargeNurseFilter}
            onChargeNurseFilterChange={setChargeNurseFilter}
            onExport={handleExport}
            onClearFilters={clearFilters}
            isAnyFilterActive={searchTerm !== '' || chargeNurseFilter !== '' || assignmentFilters.size > 0}
            onFilesSelected={handleFilesProcessing}
            onClearHistory={handleClearHistory}
            isLoading={isLoading}
            historicalRosterCount={historicalRosters.length}
          />
        )}
      </main>
    </div>
  );
};

// -------------------
// Default Export (required for import App from './App')
// -------------------
export default App;

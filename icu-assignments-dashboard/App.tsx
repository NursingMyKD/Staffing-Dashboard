import React, { useState, useEffect, useMemo, FC, ReactNode } from 'react';
import { AssignmentGrid } from './components/AssignmentGrid';
import { readDocxFile, parseRosterFromHtml } from './services/docProcessor';
import { Roster, NurseStats } from './types';
import { Dashboard } from './components/Dashboard';
import { calculateNurseStats, calculateSummaryStats, processBatchRosters } from './services/statsService';
import { exportNursesToCsv } from './services/exportService';
import { FileTextIcon, BriefcaseIcon, TrashIcon } from './components/icons';

type View = 'roster' | 'dashboard';
type SortByType = 'name' | 'patients';
type AssignmentFilterType = 'isTriple' | 'isOneToOne' | 'isFloat';

const createBlankRoster = (): Roster => {
  return {
    date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format
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
  };
};

function App() {
  const [liveRoster, setLiveRoster] = useState<Roster>(createBlankRoster());
  const [historicalRosters, setHistoricalRosters] = useState<Roster[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('roster');

  // Dashboard Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortByType>('name');
  const [assignmentFilters, setAssignmentFilters] = useState<Set<AssignmentFilterType>>(new Set());
  const [chargeNurseFilter, setChargeNurseFilter] = useState('');

  // Load initial data from localStorage
  useEffect(() => {
    try {
      const savedLiveRoster = localStorage.getItem('icuLiveRoster');
      if (savedLiveRoster) {
        setLiveRoster(JSON.parse(savedLiveRoster));
      } else {
        setLiveRoster(createBlankRoster());
      }
      
      const savedHistoricalRosters = localStorage.getItem('icuHistoricalRosters');
      if (savedHistoricalRosters) {
        setHistoricalRosters(JSON.parse(savedHistoricalRosters));
      }
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
      localStorage.clear();
      setLiveRoster(createBlankRoster());
      setHistoricalRosters([]);
    }
  }, []);

  // Persist data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('icuLiveRoster', JSON.stringify(liveRoster));
    } catch (e) {
      console.error("Failed to save live roster to localStorage", e);
    }
  }, [liveRoster]);

  useEffect(() => {
    try {
      localStorage.setItem('icuHistoricalRosters', JSON.stringify(historicalRosters));
    } catch (e) {
      console.error("Failed to save historical rosters to localStorage", e);
    }
  }, [historicalRosters]);

  const handleFilesProcessing = async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedRosters = await Promise.all(
        files.map(async (file) => {
          const htmlContent = await readDocxFile(file);
          const roster = parseRosterFromHtml(htmlContent);
          if (!roster.date) {
            // Fallback to filename for date
            roster.date = file.name.replace('.docx', '').split(' ')[0] || new Date().toLocaleDateString('en-CA');
          }
          return roster;
        })
      );
      
      setHistoricalRosters(prevRosters => {
        const newRostersMap = new Map(prevRosters.map(r => [r.date, r]));
        parsedRosters.forEach(r => {
            newRostersMap.set(r.date, r); // Add or update based on date
        });
        return Array.from(newRostersMap.values()).sort((a,b) => b.date.localeCompare(a.date));
      });
      
    } catch (err: any) {
      setError(`Error processing files: ${err.message}. Please check file formats.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLiveRosterChange = (updatedRoster: Roster) => {
    setLiveRoster(updatedRoster);
  };

  const handleClearRoster = () => {
      if(window.confirm('Are you sure you want to clear the entire live roster? This action cannot be undone.')) {
          setLiveRoster(createBlankRoster());
      }
  };
  
  const handleClearHistory = () => {
    if(window.confirm('Are you sure you want to clear ALL historical data? This action is permanent and cannot be undone.')) {
        setHistoricalRosters([]);
    }
  };

  const handleAssignmentFilterChange = (filter: AssignmentFilterType) => {
    setAssignmentFilters(prev => {
        const newSet = new Set(prev);
        if (newSet.has(filter)) newSet.delete(filter);
        else newSet.add(filter);
        return newSet;
    });
  };
  
  const clearFilters = () => {
      setSearchTerm('');
      setChargeNurseFilter('');
      setAssignmentFilters(new Set());
  };

  const dashboardData = useMemo(() => {
    if (historicalRosters.length === 0) {
      return { nurseStats: [], summaryStats: { totalNurses: 0, totalPatients: 0, totalTriples: 0, totalOneToOnes: 0, totalFloats: 0 }, rosterDate: 'No data', chargeNurses: { day: '', night: '' }, allChargeNursesForFilter: [] };
    }

    const stats = historicalRosters.length > 1 ? processBatchRosters(historicalRosters) : calculateNurseStats(historicalRosters[0]);
    const summary = calculateSummaryStats(stats);
    
    const allChargeNurses = new Set<string>();
    historicalRosters.forEach(r => {
        if (r.chargeNurses.day) allChargeNurses.add(r.chargeNurses.day);
        if (r.chargeNurses.night) allChargeNurses.add(r.chargeNurses.night);
    });

    return {
        nurseStats: stats,
        summaryStats: summary,
        rosterDate: historicalRosters.length === 1 ? historicalRosters[0].date : `${historicalRosters.length} days`,
        chargeNurses: historicalRosters.length === 1 ? historicalRosters[0].chargeNurses : {day: 'Multiple', night: 'Multiple'},
        allChargeNursesForFilter: Array.from(allChargeNurses).sort(),
    };
  }, [historicalRosters]);

  const nursesToDisplay = useMemo(() => {
    return dashboardData.nurseStats
      .filter(nurse => {
        const nameMatch = nurse.name.toLowerCase().includes(searchTerm.toLowerCase());
        const chargeNurseMatch = !chargeNurseFilter || nurse.chargeNurse === chargeNurseFilter;
        const assignmentMatch = assignmentFilters.size === 0 || Array.from(assignmentFilters).every(filter => nurse[filter]);
        return nameMatch && chargeNurseMatch && assignmentMatch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.patientCount - a.patientCount;
      });
  }, [dashboardData.nurseStats, searchTerm, sortBy, assignmentFilters, chargeNurseFilter]);
  
  const handleExport = () => {
      exportNursesToCsv(nursesToDisplay, dashboardData.rosterDate, 'icu_dashboard_export');
  };

  const availableNurses = useMemo(() => {
    const dayNurses = new Set<string>((liveRoster.floats.day || []).filter(n => n && n.trim() !== ''));
    const nightNurses = new Set<string>((liveRoster.floats.night || []).filter(n => n && n.trim() !== ''));

    for (const assignment of liveRoster.assignments) {
      if (assignment.rnDay && assignment.rnDay.trim()) dayNurses.add(assignment.rnDay.trim());
      if (assignment.rnNight && assignment.rnNight.trim()) nightNurses.add(assignment.rnNight.trim());
    }
    
    return { day: Array.from(dayNurses).sort(), night: Array.from(nightNurses).sort() };
  }, [liveRoster]);


  const NavButton: FC<{ currentView: View, targetView: View, setView: (v: View) => void, children: ReactNode }> = ({ currentView, targetView, setView, children }) => {
    const isActive = currentView === targetView;
    return (
      <button 
        onClick={() => setView(targetView)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
        aria-current={isActive ? 'page' : undefined}
      >{children}</button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 lg:p-6">
      <div className="max-w-[1200px] mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div>
             <h1 className="text-xl font-bold text-gray-800">ICU Assignments Dashboard</h1>
             <p className="mt-1 text-sm text-gray-500">
              {view === 'roster' ? `Manage the current day's assignments` : 'Analyze historical staffing data'}
            </p>
          </div>
          {view === 'roster' && (
              <button onClick={handleClearRoster} title="Clear the live roster" className="flex items-center justify-center gap-2 h-[42px] px-3 text-sm font-medium rounded-md transition-colors duration-200 bg-red-600 text-white hover:bg-red-700">
                  <TrashIcon className="w-5 h-5 mr-1" />
                  <span>Clear Roster</span>
              </button>
          )}
        </header>

         <nav className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 p-1.5 bg-gray-200/70 rounded-lg">
              <NavButton currentView={view} targetView="roster" setView={setView}><FileTextIcon className="w-5 h-5" /> Roster</NavButton>
              <NavButton currentView={view} targetView="dashboard" setView={setView}><BriefcaseIcon className="w-5 h-5" /> Dashboard</NavButton>
            </div>
        </nav>

        <main>
          {error && <div className="my-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert"><p className="font-bold">An Error Occurred</p><p>{error}</p></div>}
          
          {view === 'roster' && liveRoster &&
            <AssignmentGrid roster={liveRoster} onRosterChange={handleLiveRosterChange} availableDayNurses={availableNurses.day} availableNightNurses={availableNurses.night} />
          }

          {view === 'dashboard' &&
            <Dashboard 
              {...dashboardData}
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
          }
        </main>
      </div>
    </div>
  );
}

export default App;
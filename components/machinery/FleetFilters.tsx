'use client';

interface FleetFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  filterMake: string;
  onMakeChange: (val: string) => void;
  filterClass: string;
  onClassChange: (val: string) => void;
  filterStatus: string;
  onStatusChange: (val: string) => void;
  makes: string[];
  classes: string[];
}

export default function FleetFilters({
  search, onSearchChange,
  filterMake, onMakeChange,
  filterClass, onClassChange,
  filterStatus, onStatusChange,
  makes, classes,
}: FleetFiltersProps) {

  const hasFilters = filterMake || filterClass || filterStatus;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search by make, model, serial..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
        />
      </div>
      <select
        value={filterMake}
        onChange={(e) => onMakeChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 bg-white"
      >
        <option value="">All Makes</option>
        {makes.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select
        value={filterClass}
        onChange={(e) => onClassChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 bg-white"
      >
        <option value="">All Classes</option>
        {classes.map(c => (
          <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
        ))}
      </select>
      <select
        value={filterStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 bg-white"
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="WATCH">Watch</option>
        <option value="DOWN">Down</option>
        <option value="SOLD">Sold</option>
        <option value="RETIRED">Retired</option>
      </select>
      {hasFilters && (
        <button
          onClick={() => { onMakeChange(''); onClassChange(''); onStatusChange(''); }}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
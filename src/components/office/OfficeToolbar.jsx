import { Input } from 'antd';
import { Search, SlidersHorizontal, X } from 'lucide-react';

/**
 * Search + filter trigger for list screens. Active filters are surfaced as
 * removable chips right below, so users can see (and clear) them without
 * opening the sheet again.
 *
 * `filters`: [{ key, label }] — pass only the currently active ones.
 */
export default function OfficeToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  onRemoveFilter,
  onOpenFilters,
  onClearFilters,
  right,
}) {
  return (
    <div className="office-toolbar-wrap">
      <div className="office-toolbar">
        {onSearchChange ? (
          <Input
            allowClear
            className="office-search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            prefix={<Search size={15} color="#94a3b8" />}
          />
        ) : null}

        {onOpenFilters ? (
          <button
            type="button"
            className={`office-filter-btn${filters.length ? ' is-active' : ''}`}
            onClick={onOpenFilters}
          >
            <SlidersHorizontal size={15} />
            <span>Filters</span>
            {filters.length ? <b>{filters.length}</b> : null}
          </button>
        ) : null}

        {right}
      </div>

      {filters.length ? (
        <div className="office-chips">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className="office-chip"
              onClick={() => onRemoveFilter?.(filter.key)}
            >
              <span>{filter.label}</span>
              <X size={12} />
            </button>
          ))}
          {onClearFilters ? (
            <button type="button" className="office-chip office-chip--clear" onClick={onClearFilters}>
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

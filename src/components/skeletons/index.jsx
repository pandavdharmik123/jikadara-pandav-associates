import React from 'react';

/* --------------------------------------------------------------------------
   Primitive building blocks
   -------------------------------------------------------------------------- */

const LINE_WIDTHS = ['78%', '62%', '70%', '55%', '66%', '48%', '61%', '52%', '45%', '58%'];

export function Sk({ w = '100%', h = 12, r = 6, circle = false, className = '', style }) {
  return (
    <span
      className={`sk${className ? ` ${className}` : ''}`}
      style={{
        width: w,
        height: circle ? w : h,
        borderRadius: circle ? '50%' : r,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkText({ lines = 2, widths, gap = 8, align = 'flex-start' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, alignItems: align, width: '100%' }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Sk
          key={index}
          w={(widths && widths[index]) || LINE_WIDTHS[index % LINE_WIDTHS.length]}
          h={index === 0 ? 13 : 10}
        />
      ))}
    </div>
  );
}

const toTemplate = (columns) => {
  if (Array.isArray(columns)) return columns.join(' ');
  return `repeat(${Math.max(1, columns || 1)}, minmax(0, 1fr))`;
};

/* --------------------------------------------------------------------------
   Page header
   -------------------------------------------------------------------------- */

export function PageHeaderSkeleton({ titleWidth = 210, subtitleWidth = 300, actions = 1 }) {
  return (
    <div className="sk-header">
      <div className="sk-header-copy">
        <Sk w={titleWidth} h={24} r={8} />
        {subtitleWidth ? <Sk w={subtitleWidth} h={11} /> : null}
      </div>
      {actions > 0 ? (
        <div className="sk-header-actions">
          {Array.from({ length: actions }).map((_, index) => (
            <Sk key={index} w={index === 0 ? 118 : 42} h={38} r={10} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Stat cards
   -------------------------------------------------------------------------- */

export function StatsSkeleton({ count = 3, icon = true }) {
  return (
    <div className="sk-stats">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="sk-card sk-stat">
          {icon ? <Sk w={38} circle /> : null}
          <div className="sk-stat-copy">
            <Sk w={`${52 + ((index * 9) % 24)}%`} h={18} r={7} />
            <Sk w={`${68 + ((index * 7) % 20)}%`} h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Tables
   -------------------------------------------------------------------------- */

export function TableSkeleton({
  rows = 6,
  columns = 6,
  showHead = true,
  compact = false,
  colWidths,
}) {
  const template = toTemplate(colWidths || columns);
  const columnCount = Array.isArray(colWidths || columns)
    ? (colWidths || columns).length
    : Number(columns) || 1;

  return (
    <div className="sk-table" aria-hidden="true">
      {showHead ? (
        <div className="sk-table-head-row" style={{ gridTemplateColumns: template }}>
          {Array.from({ length: columnCount }).map((_, index) => (
            <Sk key={index} w={index === 0 ? '58%' : '48%'} h={9} />
          ))}
        </div>
      ) : null}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={`sk-table-row${compact ? ' sk-table-row--compact' : ''}`}
          style={{ gridTemplateColumns: template }}
        >
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <Sk
              key={colIndex}
              w={LINE_WIDTHS[(rowIndex + colIndex) % LINE_WIDTHS.length]}
              h={10}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton rows intended for an Ant Design Table's `locale.emptyText`. */
export function TableLoadingSkeleton({ rows = 7, columns = 6, colWidths, compact }) {
  return (
    <div style={{ width: '100%', textAlign: 'left', padding: '2px 0' }}>
      <TableSkeleton
        rows={rows}
        columns={columns}
        colWidths={colWidths}
        compact={compact}
        showHead={false}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
   Lists & cards
   -------------------------------------------------------------------------- */

export function ListSkeleton({ rows = 5, avatar = true, actions = false }) {
  return (
    <div className="sk-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="sk-list-row">
          {avatar ? <Sk w={34} circle /> : null}
          <div className="sk-list-copy">
            <Sk w={`${48 + ((index * 11) % 32)}%`} h={12} />
            <Sk w={`${30 + ((index * 7) % 28)}%`} h={9} />
          </div>
          {actions ? <Sk w={58} h={22} r={8} /> : null}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ head = true, lines = 4, style, children }) {
  return (
    <div className="sk-card" style={style} aria-hidden="true">
      {head ? (
        <div className="sk-card-head">
          <Sk w={140} h={16} r={7} />
          <Sk w={32} h={32} r={9} />
        </div>
      ) : null}
      {children || <SkText lines={lines} gap={11} />}
    </div>
  );
}

export function ColumnsSkeleton({ count = 2, rows = 5 }) {
  return (
    <div className="sk-columns">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} lines={rows + 1} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Page compositions
   -------------------------------------------------------------------------- */

export function PageSkeleton({ stats = 3, tableRows = 6, tableColumns = 6 }) {
  return (
    <div className="sk-page" style={{ paddingTop: 2 }}>
      <PageHeaderSkeleton />
      {stats > 0 ? <StatsSkeleton count={stats} /> : null}
      <div className="sk-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 18px 12px' }}>
          <Sk w={160} h={16} r={7} />
        </div>
        <TableSkeleton rows={tableRows} columns={tableColumns} showHead />
      </div>
    </div>
  );
}

export function DashboardSkeleton({ stats = 3 }) {
  return (
    <div className="sk-page" style={{ maxWidth: 1200, margin: '0 auto', width: '100%', paddingTop: 2 }}>
      <PageHeaderSkeleton titleWidth={190} subtitleWidth={0} actions={0} />
      <StatsSkeleton count={stats} />

      <div className="sk-card" style={{ padding: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 18px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sk w={40} circle />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Sk w={178} h={15} r={7} />
              <Sk w={130} h={9} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Sk w={40} h={32} r={8} />
            <Sk w={118} h={32} r={8} />
            <Sk w={40} h={32} r={8} />
          </div>
        </div>
        <TableSkeleton rows={4} columns={7} showHead />
      </div>

      <div className="sk-columns">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>
    </div>
  );
}

export function DetailSkeleton({ stats = 4, tableRows = 5, tableColumns = 7 }) {
  return (
    <div className="sk-page" style={{ paddingTop: 2 }}>
      <div className="sk-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <Sk w={38} h={38} r={10} />
          <Sk w={54} circle />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sk w={230} h={24} r={8} />
            <Sk w={150} h={10} />
          </div>
        </div>
        <Sk w={136} h={40} r={10} />
      </div>

      <StatsSkeleton count={stats} icon={false} />

      <div className="sk-card" style={{ padding: 0 }}>
        <div style={{ padding: '15px 18px 10px' }}>
          <Sk w={90} h={16} r={7} />
        </div>
        <TableSkeleton rows={tableRows} columns={tableColumns} showHead />
      </div>
    </div>
  );
}

export function ReportSkeleton({ stats = 3, tableRows = 6, tableColumns = 6 }) {
  return (
    <div className="sk-page" style={{ paddingTop: 2 }}>
      <PageHeaderSkeleton titleWidth={200} subtitleWidth={0} actions={1} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Sk w={120} h={34} r={9} />
        <Sk w={120} h={34} r={9} />
        <Sk w={96} h={34} r={9} />
        <Sk w={112} h={34} r={9} />
      </div>
      {stats > 0 ? <StatsSkeleton count={stats} /> : null}
      <div className="sk-card" style={{ padding: 0 }}>
        <div style={{ padding: '15px 18px 10px' }}>
          <Sk w={170} h={16} r={7} />
        </div>
        <TableSkeleton rows={tableRows} columns={tableColumns} showHead />
      </div>
    </div>
  );
}

export function LedgerSkeleton() {
  return (
    <div className="sk-columns">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="sk-card" style={{ padding: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sk w={32} h={32} r={9} />
              <Sk w={120} h={14} r={7} />
            </div>
            <Sk w={82} h={15} r={7} />
          </div>
          <div style={{ padding: '0 16px 8px' }}>
            <ListSkeleton rows={5} avatar={false} actions />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FiltersSkeleton({ count = 5 }) {
  return (
    <div className="sk-header">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Array.from({ length: count }).map((_, index) => (
          <Sk key={index} w={index === count - 1 ? 130 : 118} h={34} r={9} />
        ))}
      </div>
      <Sk w={120} h={34} r={9} />
    </div>
  );
}

export default {
  Sk,
  SkText,
  PageHeaderSkeleton,
  StatsSkeleton,
  TableSkeleton,
  TableLoadingSkeleton,
  ListSkeleton,
  CardSkeleton,
  ColumnsSkeleton,
  PageSkeleton,
  DashboardSkeleton,
  DetailSkeleton,
  ReportSkeleton,
  LedgerSkeleton,
  FiltersSkeleton,
};

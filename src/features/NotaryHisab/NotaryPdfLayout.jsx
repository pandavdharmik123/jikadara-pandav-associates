import dayjs from 'dayjs';
import { MONTH_NAMES } from '../../hooks/useNotaryHisab';

/**
 * Off-screen PDF layout that mirrors the office Notary Hisab.xlsx sheet,
 * wrapped in the same branded header as the other exported PDFs
 * (Office Ledger / Jantri / Invoice — logo + firm name + period + timestamp).
 *
 * Rendered hidden at 794 px (A4 width) and captured by html2pdf on export.
 */
export default function NotaryPdfLayout({ register, summary = [], unassignedSerials = [] }) {
  if (!register) return null;

  const rate = Number(register.ratePerEntry);
  const monthLabel = `${MONTH_NAMES[register.month - 1]} ${register.year}`;
  const shortMonth = `${MONTH_NAMES[register.month - 1].slice(0, 3).toUpperCase()}-${String(
    register.year
  ).slice(2)}`;
  const rangeLine = (register.ranges || [])
    .map((r) => `Sr No. ${r.startNumber} to ${r.endNumber}`)
    .join(',  ');

  const rows = summary.map((s) => ({
    key: s.userId || s.userName,
    userName: s.userName,
    serialNumbers: s.serialNumbers || [],
    totalEntries: s.totalEntries,
    assigned: true,
  }));
  if (unassignedSerials.length > 0) {
    rows.push({
      key: 'unassigned',
      userName: 'Unassigned',
      serialNumbers: unassignedSerials,
      totalEntries: unassignedSerials.length,
      assigned: false,
    });
  }

  const totalAssigned = summary.reduce((acc, s) => acc + s.totalEntries, 0);
  const totalSerials = (register.entries || []).length;
  const totalAmount = Math.round(totalAssigned * rate * 100) / 100;

  const stats = [
    { label: 'Total Serials', value: String(totalSerials), color: '#475569', background: '#f8fafc', border: '#e2e8f0' },
    { label: 'Assigned', value: String(totalAssigned), color: '#059669', background: '#ecfdf5', border: '#a7f3d0' },
    { label: 'Unassigned', value: String(totalSerials - totalAssigned), color: '#dc2626', background: '#fef2f2', border: '#fecaca' },
    { label: 'Per Entry', value: `₹${rate.toLocaleString('en-IN')}`, color: '#2563eb', background: '#eff6ff', border: '#bfdbfe' },
    { label: 'Notary Amount', value: `₹${totalAmount.toLocaleString('en-IN')}`, color: '#4f46e5', background: '#eef2ff', border: '#c7d2fe' },
  ];

  return (
    <div
      style={{
        width: '794px',
        minHeight: '1120px',
        padding: '32px 36px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        boxSizing: 'border-box',
        fontSize: '12px',
        lineHeight: 1.45,
        position: 'relative',
        margin: '0 auto',
      }}
    >
      {/* ── Standard branded header (same as Office Ledger / Invoice PDFs) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '14px',
          marginBottom: '16px',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '50px', width: 'auto' }} />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '19px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.3px',
              }}
            >
              JIKADARA &amp; PANDAV ASSOCIATES
            </h1>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
              Advocate &amp; Legal Consultants
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: '#2563eb',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Notary Register
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
            {monthLabel}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Generated: {dayjs().format('DD/MM/YYYY, hh:mm A')}
          </div>
        </div>
      </div>

      {/* ── Stat cards (same 5-card grid style as the ledger PDF) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '9px 10px',
              borderRadius: '6px',
              backgroundColor: stat.background,
              border: `1px solid ${stat.border}`,
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: '9px',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: stat.color,
                marginTop: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Excel-sheet section: NOTARY - NOV-26 ── */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: 1.1,
          borderTop: '2px solid #0f172a',
          borderBottom: '2px solid #0f172a',
          padding: '7px 0',
          marginBottom: 4,
        }}
      >
        NOTARY - {shortMonth}
      </div>

      {/* Range line + Total header — like "Sr No. 01 to 74" / "Total" */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          marginTop: 6,
          marginBottom: 2,
          borderBottom: '1.5px solid #0f172a',
          paddingBottom: 5,
        }}
      >
        <span style={{ fontWeight: 700 }}>{rangeLine}</span>
        <span style={{ fontWeight: 700, width: 76, textAlign: 'right' }}>Total</span>
      </div>

      {/* One block per user: name | serial numbers flowing like Excel cells | count */}
      {rows.map((row) => (
        <div
          key={row.key}
          style={{
            display: 'flex',
            alignItems: 'stretch',
            borderBottom: '1px solid #d9d9d9',
            pageBreakInside: 'avoid',
          }}
        >
          <div
            style={{
              width: 126,
              flexShrink: 0,
              fontWeight: 700,
              fontSize: 12.5,
              paddingTop: 7,
              color: row.assigned ? '#111111' : '#8a8a8a',
            }}
          >
            {row.userName}
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexWrap: 'wrap',
              alignContent: 'flex-start',
              padding: '5px 0',
              minWidth: 0,
            }}
          >
            {row.serialNumbers.map((n) => (
              <div
                key={n}
                style={{
                  width: 44,
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  fontSize: 11.5,
                  padding: '4px 0',
                  border: '1px solid #ececec',
                  marginLeft: 2,
                  marginBottom: 2,
                  background: row.assigned ? '#ffffff' : '#f5f5f5',
                  color: row.assigned ? '#111111' : '#9a9a9a',
                }}
              >
                {n}
              </div>
            ))}
          </div>
          <div
            style={{
              width: 70,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              fontWeight: 700,
              fontSize: 12.5,
              borderLeft: '1px solid #d9d9d9',
              paddingLeft: 8,
              paddingBottom: 2,
              color: row.assigned ? '#111111' : '#8a8a8a',
            }}
          >
            {row.totalEntries}
          </div>
        </div>
      ))}

      {/* Footer totals */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 10,
          fontSize: 11.5,
          fontWeight: 700,
        }}
      >
        <span>{rangeLine}</span>
        <span>
          {totalAssigned} × ₹{rate.toLocaleString('en-IN')} = ₹{totalAmount.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}

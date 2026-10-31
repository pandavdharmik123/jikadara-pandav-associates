import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/currency';
import { formatISTDate } from '../../utils/istDate';

export default function VerabillPrintLayout({
  entries = [],
  summary = {},
  filterLabel = '',
}) {
  const totalEntries = entries.length;
  const totalFees = entries.reduce((acc, e) => acc + (Number(e.totalFees) || 0), 0);
  const totalExpenses = entries.reduce((acc, e) => acc + (Number(e.totalExpenses) || 0), 0);
  const totalAddIncome = entries.reduce((acc, e) => acc + (Number(e.additionalIncome) || 0), 0);
  const totalNetProfit = totalFees - totalExpenses + totalAddIncome;

  const kpis = [
    {
      label: 'Total Entries',
      value: String(totalEntries),
      color: '#2563eb',
      background: '#eff6ff',
      border: '#bfdbfe',
    },
    {
      label: 'Fees Received',
      value: formatCurrency(totalFees),
      color: '#059669',
      background: '#ecfdf5',
      border: '#a7f3d0',
    },
    {
      label: 'Expenses',
      value: formatCurrency(totalExpenses),
      color: '#dc2626',
      background: '#fef2f2',
      border: '#fecaca',
    },
    {
      label: 'Add. Income',
      value: formatCurrency(totalAddIncome),
      color: '#0891b2',
      background: '#ecfeff',
      border: '#a5f3fc',
    },
    {
      label: 'Net Profit',
      value: formatCurrency(totalNetProfit),
      color: totalNetProfit >= 0 ? '#16a34a' : '#ea580c',
      background: totalNetProfit >= 0 ? '#f0fdf4' : '#fff7ed',
      border: totalNetProfit >= 0 ? '#bbf7d0' : '#fed7aa',
    },
  ];

  return (
    <div
      className="verabill-print-wrapper"
      style={{
        width: '794px',
        minHeight: '1120px',
        padding: '28px 32px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        boxSizing: 'border-box',
        fontSize: '11px',
        lineHeight: 1.4,
        position: 'relative',
        margin: '0 auto',
      }}
    >
      {/* ── Firm Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '12px',
          marginBottom: '14px',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '46px', width: 'auto' }} />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.3px',
              }}
            >
              JIKADARA & PANDAV ASSOCIATES
            </h1>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
              Advocate & Legal Consultants
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
            Verabill & Light Bill Report
          </div>
          {filterLabel && (
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
              {filterLabel}
            </div>
          )}
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Generated: {dayjs().format('DD/MM/YYYY, hh:mm A')}
          </div>
        </div>
      </div>

      {/* ── Top Metric Cards Strip ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              backgroundColor: kpi.background,
              border: `1px solid ${kpi.border}`,
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
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: kpi.color,
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={kpi.value}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Entries Table ── */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          marginBottom: '16px',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: '9.5px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ width: 28, padding: '6px 4px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>
                #
              </th>
              <th style={{ width: 62, padding: '6px 5px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                Date
              </th>
              <th style={{ width: 140, padding: '6px 6px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                Client Name
              </th>
              <th style={{ width: 130, padding: '6px 6px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                Property
              </th>
              <th style={{ padding: '6px 6px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                Work
              </th>
              <th style={{ width: 80, padding: '6px 6px', textAlign: 'right', color: '#047857', fontWeight: 700 }}>
                Fees (₹)
              </th>
              <th style={{ width: 80, padding: '6px 6px', textAlign: 'right', color: '#b91c1c', fontWeight: 700 }}>
                Expenses (₹)
              </th>
              <th style={{ width: 82, padding: '6px 6px', textAlign: 'right', color: '#0f172a', fontWeight: 800 }}>
                Net Profit
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ padding: '24px 8px', textAlign: 'center', color: '#94a3b8', fontSize: 11 }}
                >
                  No Verabill records found.
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => {
                const profit = Number(entry.netBalance) || 0;
                const isPositive = profit >= 0;

                // Format fees text
                const feesText = (entry.fees || [])
                  .map((f) => (f.receivedBy ? `${formatCurrency(f.amount)} (${f.receivedBy})` : formatCurrency(f.amount)))
                  .join(', ');

                // Format expenses text
                const expensesText = (entry.expenses || [])
                  .map((e) => (e.expensePerson ? `${formatCurrency(e.amount)} (${e.expensePerson})` : formatCurrency(e.amount)))
                  .join(', ');

                return (
                  <tr
                    key={entry.id || index}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: index % 2 === 1 ? '#fafafa' : '#ffffff',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    <td
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontWeight: 600,
                      }}
                    >
                      {index + 1}
                    </td>
                    <td
                      style={{
                        padding: '6px 5px',
                        color: '#334155',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.startDate ? formatISTDate(entry.startDate) : '—'}
                    </td>
                    <td
                      style={{
                        padding: '6px 6px',
                        color: '#0f172a',
                        fontWeight: 700,
                        wordBreak: 'break-word',
                      }}
                    >
                      {entry.clientName}
                    </td>
                    <td
                      style={{
                        padding: '6px 6px',
                        color: '#475569',
                        wordBreak: 'break-word',
                      }}
                    >
                      {entry.property || '—'}
                    </td>
                    <td
                      style={{
                        padding: '6px 6px',
                        color: '#334155',
                        wordBreak: 'break-word',
                      }}
                    >
                      {entry.workDescription || '—'}
                    </td>
                    <td
                      style={{
                        padding: '6px 6px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#065f46',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                      title={feesText}
                    >
                      {Number(entry.totalFees) > 0 ? formatCurrency(entry.totalFees) : '—'}
                    </td>
                    <td
                      style={{
                        padding: '6px 6px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#991b1b',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                      title={expensesText}
                    >
                      {Number(entry.totalExpenses) > 0 ? formatCurrency(entry.totalExpenses) : '—'}
                    </td>
                    <td
                      style={{
                        padding: '6px 6px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: isPositive ? '#166534' : '#dc2626',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {isPositive ? '+' : ''}
                      {formatCurrency(profit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

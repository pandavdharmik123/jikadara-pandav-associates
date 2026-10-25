import dayjs from 'dayjs';
import { formatCurrency, formatCurrencyPrecise } from '../../utils/currency';
import { formatISTDate } from '../../utils/istDate';

function PrintLedgerTable({ title, entries, total, accent, soft, border, showExpenseType = false }) {
  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '7px 10px',
          backgroundColor: soft,
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: accent }}>
          {title}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontSize: 10.5,
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ width: 76, padding: '6px 7px', textAlign: 'left', color: '#64748b', fontWeight: 700 }}>
              Date
            </th>
            <th style={{ padding: '6px 7px', textAlign: 'left', color: '#64748b', fontWeight: 700 }}>
              Details
            </th>
            <th style={{ width: 92, padding: '6px 7px', textAlign: 'right', color: '#64748b', fontWeight: 700 }}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                style={{ padding: '20px 8px', textAlign: 'center', color: '#94a3b8', fontSize: 10 }}
              >
                No {title.toLowerCase()} entries for this period.
              </td>
            </tr>
          ) : (
            entries.map((entry, index) => (
              <tr
                key={entry.id || index}
                style={{
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: index % 2 === 1 ? '#fafafa' : '#ffffff',
                  pageBreakInside: 'avoid',
                }}
              >
                <td style={{ padding: '6px 7px', color: '#475569', whiteSpace: 'nowrap' }}>
                  {formatISTDate(entry.entryDate)}
                </td>
                <td style={{ padding: '6px 7px', color: '#0f172a', wordBreak: 'break-word' }}>
                  {/* "અન્ય" is a generic bucket, so show only the description for it. */}
                  {showExpenseType && entry.expenseType && entry.expenseType !== 'અન્ય' ? (
                    <>
                      <span style={{ fontWeight: 700, color: accent }}>{entry.expenseType}</span>
                      <span style={{ color: '#94a3b8' }}> - </span>
                      {entry.details}
                    </>
                  ) : (
                    entry.details
                  )}
                </td>
                <td
                  style={{
                    padding: '6px 7px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: accent,
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(entry.amount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: soft, borderTop: `1px solid ${border}` }}>
            <td colSpan={2} style={{ padding: '7px 7px', fontWeight: 800, color: '#334155', fontSize: 11 }}>
              Total {title}
            </td>
            <td style={{ padding: '7px 7px', textAlign: 'right', fontWeight: 800, color: accent, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function OfficeLedgerPrintLayout({
  entries = [],
  balance = {},
  splitUsers = [],
  periodLabel = '',
  fyLabel = '',
}) {
  const incomeEntries = entries.filter((entry) => entry.entryType === 'INCOME');
  const expenseEntries = entries.filter((entry) => entry.entryType === 'EXPENSE');
  const hasShortfall = Number(balance.shortfall) > 0;

  const kpis = [
    {
      label: 'Opening Balance',
      value: formatCurrency(balance.openingBalance),
      color: '#475569',
      background: '#f8fafc',
      border: '#e2e8f0',
    },
    {
      label: 'Total Income',
      value: formatCurrency(balance.periodIncome),
      color: '#059669',
      background: '#ecfdf5',
      border: '#a7f3d0',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(balance.periodExpense),
      color: '#dc2626',
      background: '#fef2f2',
      border: '#fecaca',
    },
    {
      label: 'Net Savings',
      value: formatCurrency(balance.periodNet),
      color: Number(balance.periodNet) >= 0 ? '#2563eb' : '#dc2626',
      background: Number(balance.periodNet) >= 0 ? '#eff6ff' : '#fef2f2',
      border: Number(balance.periodNet) >= 0 ? '#bfdbfe' : '#fecaca',
    },
    {
      label: 'Closing Balance',
      value: formatCurrency(balance.closingBalance),
      color: '#4f46e5',
      background: '#eef2ff',
      border: '#c7d2fe',
    },
  ];

  return (
    <div
      className="office-ledger-print-wrapper"
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
            Office Income & Expenses
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
            {periodLabel}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {periodLabel !== fyLabel ? `${fyLabel} • ` : ''}
            Generated: {dayjs().format('DD/MM/YYYY, hh:mm A')}
          </div>
        </div>
      </div>

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
              padding: '9px 10px',
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
                fontSize: '13.5px',
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

      {hasShortfall && (
        <div
          style={{
            marginBottom: '16px',
            padding: '9px 11px',
            borderRadius: '7px',
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: splitUsers.length > 0 ? '7px' : 0,
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#9a3412' }}>
              Expense Shortfall Split
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#c2410c', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrencyPrecise(balance.shortfall)}
            </div>
          </div>

          {splitUsers.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
              <thead>
                <tr style={{ backgroundColor: '#ffedd5' }}>
                  <th style={{ padding: '5px 7px', textAlign: 'left', color: '#9a3412', fontWeight: 700 }}>
                    User
                  </th>
                  <th style={{ padding: '5px 7px', textAlign: 'right', color: '#9a3412', fontWeight: 700 }}>
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {splitUsers.map((user) => (
                  <tr key={user.id} style={{ borderTop: '1px solid #fed7aa' }}>
                    <td style={{ padding: '5px 7px', color: '#7c2d12' }}>{user.name}</td>
                    <td style={{ padding: '5px 7px', textAlign: 'right', fontWeight: 700, color: '#c2410c', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrencyPrecise(user.splitAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 10.5, color: '#9a3412' }}>
              No split users added for this period.
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <PrintLedgerTable
          title="Income"
          entries={incomeEntries}
          total={balance.periodIncome}
          accent="#059669"
          soft="#ecfdf5"
          border="#a7f3d0"
        />
        <PrintLedgerTable
          title="Expenses"
          entries={expenseEntries}
          total={balance.periodExpense}
          accent="#dc2626"
          soft="#fef2f2"
          border="#fecaca"
          showExpenseType
        />
      </div>

      <div
        style={{
          marginTop: '20px',
          paddingTop: '10px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: '10px',
          color: '#64748b',
        }}
      />
    </div>
  );
}

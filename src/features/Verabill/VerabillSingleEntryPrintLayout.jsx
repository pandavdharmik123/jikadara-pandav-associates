import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/currency';
import { formatISTDate } from '../../utils/istDate';

export default function VerabillSingleEntryPrintLayout({ entry = {} }) {
  if (!entry || !entry.id) return null;

  const fees = entry.fees || [];
  const expenses = entry.expenses || [];
  const totalFees = Number(entry.totalFees) || 0;
  const totalExpenses = Number(entry.totalExpenses) || 0;
  const additionalIncome = Number(entry.additionalIncome) || 0;
  const netBalance = Number(entry.netBalance) || 0;

  return (
    <div
      className="verabill-single-print-wrapper"
      style={{
        width: '794px',
        minHeight: '1120px',
        padding: '36px 40px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        boxSizing: 'border-box',
        fontSize: '11.5px',
        lineHeight: 1.45,
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
          paddingBottom: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '52px', width: 'auto' }} />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.3px',
              }}
            >
              JIKADARA & PANDAV ASSOCIATES
            </h1>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
              Advocate & Legal Consultants
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#2563eb',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Verabill Work Statement
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Date: {dayjs().format('DD/MM/YYYY, hh:mm A')}
          </div>
        </div>
      </div>

      {/* ── Client & Work Information Box ── */}
      <div
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          backgroundColor: '#f8fafc',
          padding: '14px 18px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Client Name
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {entry.clientName || '—'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Work / Start Date
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {entry.startDate ? formatISTDate(entry.startDate) : '—'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Property / Address
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
              {entry.property || '—'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Work Description
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
              {entry.workDescription || '—'}
            </div>
          </div>

          {entry.remarks && (
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Remarks
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                {entry.remarks}
              </div>
            </div>
          )}

          {entry.incomeDescription && (
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                Additional Income Note
              </div>
              <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '2px', fontWeight: 500 }}>
                {entry.incomeDescription}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Financial Summary Strip ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 7,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
            Fees Received
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>
            {formatCurrency(totalFees)}
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 7,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
            Expenses
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#991b1b', marginTop: '2px' }}>
            {formatCurrency(totalExpenses)}
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#ecfeff',
            border: '1px solid #a5f3fc',
            borderRadius: 7,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#0e7490', textTransform: 'uppercase' }}>
            Add. Income
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#155e75', marginTop: '2px' }}>
            {additionalIncome > 0 ? formatCurrency(additionalIncome) : '—'}
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            backgroundColor: netBalance >= 0 ? '#f0fdf4' : '#fff7ed',
            border: `1px solid ${netBalance >= 0 ? '#bbf7d0' : '#fed7aa'}`,
            borderRadius: 7,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '9.5px',
              fontWeight: 700,
              color: netBalance >= 0 ? '#15803d' : '#c2410c',
              textTransform: 'uppercase',
            }}
          >
            Net Profit
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: netBalance >= 0 ? '#166534' : '#9a3412',
              marginTop: '2px',
            }}
          >
            {netBalance >= 0 ? '+' : ''}
            {formatCurrency(netBalance)}
          </div>
        </div>
      </div>

      {/* ── Fees Receipts Breakdown ── */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#065f46',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          Fees Received ({fees.length} {fees.length === 1 ? 'Receipt' : 'Receipts'})
        </div>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
              <th style={{ width: 80, padding: '7px 9px', textAlign: 'left', color: '#065f46', fontWeight: 700 }}>
                Date
              </th>
              <th style={{ width: 140, padding: '7px 9px', textAlign: 'left', color: '#065f46', fontWeight: 700 }}>
                Received By
              </th>
              <th style={{ padding: '7px 9px', textAlign: 'left', color: '#065f46', fontWeight: 700 }}>
                Description
              </th>
              <th style={{ width: 110, padding: '7px 9px', textAlign: 'right', color: '#065f46', fontWeight: 700 }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                  No fees recorded for this entry.
                </td>
              </tr>
            ) : (
              fees.map((fee, idx) => (
                <tr key={fee.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '7px 9px', color: '#475569' }}>
                    {fee.transactionDate ? formatISTDate(fee.transactionDate) : '—'}
                  </td>
                  <td style={{ padding: '7px 9px', fontWeight: 600, color: '#0f172a' }}>
                    {fee.receivedBy || '—'}
                  </td>
                  <td style={{ padding: '7px 9px', color: '#475569' }}>
                    {fee.description || '—'}
                  </td>
                  <td
                    style={{
                      padding: '7px 9px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#047857',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCurrency(fee.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {fees.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <td colSpan={3} style={{ padding: '8px 9px', fontWeight: 800, color: '#0f172a' }}>
                  Total Fees
                </td>
                <td
                  style={{
                    padding: '8px 9px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: '#047857',
                    fontSize: '12px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(totalFees)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Expenses Breakdown ── */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#991b1b',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          Expenses ({expenses.length} {expenses.length === 1 ? 'Record' : 'Records'})
        </div>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <th style={{ width: 80, padding: '7px 9px', textAlign: 'left', color: '#991b1b', fontWeight: 700 }}>
                Date
              </th>
              <th style={{ width: 140, padding: '7px 9px', textAlign: 'left', color: '#991b1b', fontWeight: 700 }}>
                Paid By / Person
              </th>
              <th style={{ padding: '7px 9px', textAlign: 'left', color: '#991b1b', fontWeight: 700 }}>
                Description
              </th>
              <th style={{ width: 110, padding: '7px 9px', textAlign: 'right', color: '#991b1b', fontWeight: 700 }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                  No expenses recorded for this entry.
                </td>
              </tr>
            ) : (
              expenses.map((expense, idx) => (
                <tr key={expense.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '7px 9px', color: '#475569' }}>
                    {expense.expenseDate ? formatISTDate(expense.expenseDate) : '—'}
                  </td>
                  <td style={{ padding: '7px 9px', fontWeight: 600, color: '#0f172a' }}>
                    {expense.expensePerson || '—'}
                  </td>
                  <td style={{ padding: '7px 9px', color: '#475569' }}>
                    {expense.description || '—'}
                  </td>
                  <td
                    style={{
                      padding: '7px 9px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#b91c1c',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <td colSpan={3} style={{ padding: '8px 9px', fontWeight: 800, color: '#0f172a' }}>
                  Total Expenses
                </td>
                <td
                  style={{
                    padding: '8px 9px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: '#b91c1c',
                    fontSize: '12px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(totalExpenses)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Signature Block ── */}
      <div
        style={{
          marginTop: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingTop: '20px',
          borderTop: '1px solid #cbd5e1',
        }}
      >
        <div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
            System Generated Statement • Jikadara & Pandav Associates
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '160px', borderBottom: '1px solid #64748b', marginBottom: '6px' }}></div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
            Authorized Signature
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/currency';

export default function FinancialReportPrintLayout({
  reportType,
  selectedMonth,
  selectedYear,
  activeFinancialYear,
  monthlyData,
  yearlyData,
  generalExpenses,
  tasksNetProfit,
  totalGeneralExpense,
  finalNetProfit,
}) {
  const periodLabel =
    reportType === 'MONTHLY'
      ? `${dayjs().month(selectedMonth - 1).format('MMMM')} ${selectedYear}`
      : (activeFinancialYear?.name || `FY ${selectedYear}`);

  const monthlyTasks = monthlyData?.tasks || [];
  const yearlyMonths = (yearlyData?.months || []).filter((m) => m.taskCount > 0);
  const expenseItems = generalExpenses || [];

  return (
    <div
      className="report-print-wrapper"
      style={{
        width: '794px',
        minHeight: '1120px',
        padding: '32px 36px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        boxSizing: 'border-box',
        fontSize: '12px',
        lineHeight: 1.4,
        position: 'relative',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '14px',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '48px', width: 'auto' }} />
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
            Financial Report
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
            {periodLabel}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Generated: {dayjs().format('DD/MM/YYYY, hh:mm A')}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            padding: '10px 14px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#166534',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginBottom: '3px',
            }}
          >
            Total Profit (Tasks)
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>
            {formatCurrency(tasksNetProfit)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '10px 14px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#991b1b',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginBottom: '3px',
            }}
          >
            General Expenses
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#b91c1c' }}>
            {formatCurrency(totalGeneralExpense)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: finalNetProfit >= 0 ? '#eff6ff' : '#fef2f2',
            border: `1px solid ${finalNetProfit >= 0 ? '#bfdbfe' : '#fecaca'}`,
            borderRadius: '6px',
            padding: '10px 14px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: finalNetProfit >= 0 ? '#1e40af' : '#991b1b',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginBottom: '3px',
            }}
          >
            Final Net Profit
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: finalNetProfit >= 0 ? '#1d4ed8' : '#b91c1c',
            }}
          >
            {formatCurrency(finalNetProfit)}
          </div>
        </div>
      </div>

      {/* Income List Section */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Income List (Completed Tasks)</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
            {reportType === 'MONTHLY' ? `${monthlyTasks.length} Tasks` : `${yearlyMonths.length} Months`}
          </span>
        </div>

        {reportType === 'MONTHLY' ? (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              textAlign: 'left',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '7px 6px', fontWeight: 700, color: '#334155', width: '36px', textAlign: 'center' }}>Sr.</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', width: '75px' }}>Date</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', width: '125px' }}>Document Type</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', width: '80px' }}>Place</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', width: '150px' }}>Client</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', width: '130px' }}>Reference</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', textAlign: 'right', width: '95px' }}>
                  Net Profit
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyTasks.length > 0 ? (
                monthlyTasks.map((t, idx) => (
                  <tr
                    key={t.id || idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: '6px 6px', color: '#64748b', textAlign: 'center' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '6px 8px', color: '#475569', wordBreak: 'break-word' }}>
                      {dayjs(t.completedDate || t.startDate).format('DD/MM/YYYY')}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>
                      {t.documentType}
                    </td>
                    <td style={{ padding: '6px 8px', color: '#475569', wordBreak: 'break-word' }}>{t.place || '-'}</td>
                    <td style={{ padding: '6px 8px', color: '#0f172a', wordBreak: 'break-word' }}>{t.client?.name || '-'}</td>
                    <td style={{ padding: '6px 8px', color: '#475569', wordBreak: 'break-word' }}>{t.referenceName || '-'}</td>
                    <td
                      style={{
                        padding: '6px 8px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: Number(t.netAmount) >= 0 ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {formatCurrency(t.netAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                    No completed tasks found for this period.
                  </td>
                </tr>
              )}
            </tbody>
            {monthlyTasks.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={6} style={{ padding: '7px 8px', fontWeight: 800, color: '#0f172a' }}>
                    Total Tasks Net Profit
                  </td>
                  <td
                    style={{
                      padding: '7px 8px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: Number(tasksNetProfit) >= 0 ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {formatCurrency(tasksNetProfit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              textAlign: 'left',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '7px 6px', fontWeight: 700, color: '#334155', width: '45px', textAlign: 'center' }}>Sr.</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155' }}>Month</th>
                <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', textAlign: 'center', width: '130px' }}>
                  Completed Tasks
                </th>
                <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', textAlign: 'right', width: '130px' }}>
                  Net Profit
                </th>
              </tr>
            </thead>
            <tbody>
              {yearlyMonths.length > 0 ? (
                yearlyMonths.map((m, idx) => (
                  <tr
                    key={m.key || idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: '6px 6px', color: '#64748b', textAlign: 'center' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>
                      {dayjs().month(m.month - 1).year(m.year || dayjs().year()).format('MMMM YYYY')}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#475569' }}>
                      {m.taskCount}
                    </td>
                    <td
                      style={{
                        padding: '6px 8px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: Number(m.netAmount) >= 0 ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {formatCurrency(m.netAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                    No completed tasks found for this financial year.
                  </td>
                </tr>
              )}
            </tbody>
            {yearlyMonths.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={2} style={{ padding: '7px 8px', fontWeight: 800, color: '#0f172a' }}>Total</td>
                  <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                    {yearlyData?.yearlyTotals?.taskCount || 0}
                  </td>
                  <td
                    style={{
                      padding: '7px 8px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: Number(tasksNetProfit) >= 0 ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {formatCurrency(tasksNetProfit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* General Expenses Section */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>General Expenses</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
            {expenseItems.length} Expenses
          </span>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            textAlign: 'left',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '7px 6px', fontWeight: 700, color: '#334155', width: '36px', textAlign: 'center' }}>Sr.</th>
              <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', width: '85px' }}>Date</th>
              <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155' }}>Description</th>
              <th style={{ padding: '7px 8px', fontWeight: 700, color: '#334155', textAlign: 'right', width: '110px' }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {expenseItems.length > 0 ? (
              expenseItems.map((exp, idx) => (
                <tr
                  key={exp.id || idx}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                  }}
                >
                  <td style={{ padding: '6px 6px', color: '#64748b', textAlign: 'center' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#475569' }}>
                    {dayjs(exp.date).format('DD/MM/YYYY')}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#0f172a', wordBreak: 'break-word' }}>{exp.description}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                    {formatCurrency(exp.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                  No general expenses recorded for this period.
                </td>
              </tr>
            )}
          </tbody>
          {expenseItems.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                <td colSpan={3} style={{ padding: '7px 8px', fontWeight: 800, color: '#0f172a' }}>
                  Total General Expenses
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, color: '#b91c1c' }}>
                  {formatCurrency(totalGeneralExpense)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          color: '#94a3b8',
        }}
      >
        <div>✦ JIKADARA & PANDAV ASSOCIATES • Confidential Legal Document</div>
        <div>Computer Generated Report</div>
      </div>
    </div>
  );
}

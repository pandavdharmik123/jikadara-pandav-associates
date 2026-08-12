import React from 'react';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/currency';

export default function UpadReportPrintLayout({
  activeFinancialYear,
  totalUpad,
  netProfit,
  remainingProfit,
  groupedData,
}) {
  const periodLabel = activeFinancialYear?.name
    ? `FY ${activeFinancialYear.name}`
    : `FY ${dayjs().format('YYYY')}`;

  return (
    <div
      className="upad-print-wrapper"
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
          <img src="/logo.png" alt="Logo" style={{ height: '44px', width: 'auto' }} />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '17px',
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
              color: '#4f46e5',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Upad Report
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
            padding: '10px 14px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #dcfce7',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#16a34a',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Net Profit
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#064e3b', marginTop: '3px' }}>
            {formatCurrency(netProfit)}
          </div>
        </div>

        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#eef2ff',
            border: '1px solid #e0e7ff',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#4f46e5',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Total Upad
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e1b4b', marginTop: '3px' }}>
            {formatCurrency(totalUpad)}
          </div>
        </div>

        <div
          style={{
            padding: '10px 14px',
            backgroundColor: remainingProfit >= 0 ? '#eff6ff' : '#fef2f2',
            border: remainingProfit >= 0 ? '1px solid #dbeafe' : '1px solid #fee2e2',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: remainingProfit >= 0 ? '#2563eb' : '#dc2626',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Remaining Profit
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: remainingProfit >= 0 ? '#1e3a8a' : '#991b1b',
              marginTop: '3px',
            }}
          >
            {formatCurrency(remainingProfit)}
          </div>
        </div>
      </div>

      {/* User Wise Grouped Tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {groupedData.length === 0 ? (
          <div
            style={{
              padding: '30px',
              textAlign: 'center',
              color: '#94a3b8',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
            }}
          >
            No Upad records found for this period.
          </div>
        ) : (
          groupedData.map((userGroup) => (
            <div
              key={userGroup.key}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
                pageBreakInside: 'avoid',
              }}
            >
              {/* User Header */}
              <div
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#faf5ff',
                  borderBottom: '1px solid #e9d5ff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e1b4b' }}>
                  {userGroup.userName}
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', marginLeft: '8px' }}>
                    ({userGroup.records.length} {userGroup.records.length === 1 ? 'entry' : 'entries'})
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#6d28d9',
                    backgroundColor: '#f5f3ff',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    border: '1px solid #ddd6fe',
                  }}
                >
                  Total Upad: {formatCurrency(userGroup.totalAmount)}
                </div>
              </div>

              {/* Table */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11px',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '6px 10px', width: '35px', color: '#64748b', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '6px 10px', width: '100px', color: '#64748b', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '6px 10px', color: '#64748b', fontWeight: 600 }}>Description / Reason</th>
                    <th style={{ padding: '6px 10px', width: '120px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {userGroup.records.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 1 ? '#fafaf9' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 10px', color: '#334155', fontWeight: 500 }}>
                        {dayjs(item.date).format('DD/MM/YYYY')}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#1e293b' }}>
                        {item.description || '-'}
                      </td>
                      <td
                        style={{
                          padding: '6px 10px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#4f46e5',
                        }}
                      >
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '36px',
          right: '36px',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          color: '#94a3b8',
        }}
      >
        <span>Jikadara & Pandav Associates - Confidential Upad Ledger</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

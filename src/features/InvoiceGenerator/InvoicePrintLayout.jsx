import React from 'react';

const formatMoney = (val) => Math.round(Number(val || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const InvoicePrintLayout = React.forwardRef(({
  clientName,
  invoiceNo,
  displayDate,
  items,
  subTotal,
  discountVal,
  total,
  jamaAmount,
  balance
}, ref) => {
  return (
    <div ref={ref} className="invoice-print-wrapper" style={{
      width: '794px',
      height: '1122px',
      minHeight: '1122px',
      maxHeight: '1122px',
      backgroundColor: '#ffffff',
      color: '#1e293b',
      fontFamily: "'Anek Gujarati', 'Noto Sans Gujarati', 'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
      margin: '0 auto',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      padding: '50px',
      overflow: 'hidden',
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
    }}>
      {/* ─── Framed Inner Container with 50px outer margin on page ─── */}
      <div style={{
        flex: 1,
        height: '100%',
        border: '2px solid #0f172a',
        borderRadius: 6,
        padding: '18px 24px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}>
        {/* Background Watermark */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 0 }}>
          <img src="/logo.png" alt="Watermark" style={{ width: '340px', height: 'auto', opacity: 0.1 }} />
        </div>

        {/* Content Wrapper */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, height: '100%', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column' }}>

          {/* ─── Header Top Bar ─── */}
          <div className="pdf-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 6, marginLeft: 60 }}>
              <img
                alt="Header Text"
                className="pdf-heading-text-img"
                src="/headingText.png"
                style={{ maxWidth: 115, height: 'auto', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginBottom: 4 }}>
              <img
                alt="Company Logo"
                className="pdf-logo-img"
                src="/logo.png"
                style={{ height: 75, width: 'auto', objectFit: 'contain' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'center', width: '100%' }}>
                <h1 className="invoice-firm-title" style={{ margin: 0, fontSize: 26, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.5px', textAlign: 'center', width: '100%', fontWeight: 700, fontFamily: '"Roboto Slab", serif' }}>
                  JIKADARA & PANDAV ASSOCIATES
                </h1>
                <span className="invoice-firm-subtitle" style={{ fontSize: 21, fontWeight: 600, color: '#475569', marginTop: 2, width: '100%', fontFamily: '"Roboto Slab", serif' }}>
                  Advocate and Legal Consultants
                </span>
              </div>
            </div>
            <p className="pdf-calculator-title" style={{
              margin: '10px 0 12px',
              fontSize: 20,
              fontWeight: 800,
              fontFamily: 'Cambria, Cochin, Georgia, Times, "Times New Roman", serif',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              textAlign: 'center',
              padding: '4px 8px',
              borderTop: '2px solid #0f172a',
              width: '100%',
              backgroundColor: 'rgb(248, 250, 252)',
              borderBottom: '2px solid rgb(203, 213, 225)',
              boxSizing: 'border-box',
            }}>
              INVOICE
            </p>
          </div>

          {/* ─── Info Block: Date, Invoice No, Client Name ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0 2px 10px', borderBottom: '2px solid #0f172a', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Date :</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{displayDate}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Invoice No. :</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{invoiceNo}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ color: '#475569', fontSize: 14, fontWeight: 600 }}>નામ (Name) :</span>
              <span style={{ color: '#0f172a', fontSize: 16, fontWeight: 700 }}>{clientName || '-'}</span>
            </div>
          </div>

          {/* ─── Table: Items ─── */}
          <div style={{ width: '100%', marginBottom: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ textAlign: 'center', padding: '7px 6px', color: '#0f172a', fontWeight: 700, width: '45px' }}>No.</th>
                  <th style={{ textAlign: 'left', padding: '7px 10px', color: '#0f172a', fontWeight: 700 }}>Subject</th>
                  <th style={{ textAlign: 'center', padding: '7px 8px', color: '#0f172a', fontWeight: 700, width: '95px' }}>Fees</th>
                  <th style={{ textAlign: 'center', padding: '7px 6px', color: '#0f172a', fontWeight: 700, width: '55px' }}>Qty.</th>
                  <th style={{ textAlign: 'right', padding: '7px 10px', color: '#0f172a', fontWeight: 700, width: '105px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item, index) => (
                  <tr key={item.id || index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ textAlign: 'center', padding: '7px 6px', color: '#475569' }}>{index + 1}</td>
                    <td style={{ textAlign: 'left', padding: '7px 10px', color: '#0f172a', fontWeight: 500 }}>{item.description || '-'}</td>
                    <td style={{ textAlign: 'center', padding: '7px 8px', color: '#475569' }}>₹{formatMoney(item.price)}</td>
                    <td style={{ textAlign: 'center', padding: '7px 6px', color: '#475569' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right', padding: '7px 10px', color: '#0f172a', fontWeight: 600 }}>₹{formatMoney((item.price || 0) * (item.qty || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── Footer Section: Totals & Summary ─── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginTop: 'auto', paddingTop: 10, marginBottom: 14 }}>
            <div style={{ width: '280px', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, padding: '0 4px' }}>
                <span style={{ fontWeight: 600, color: '#64748b' }}>Sub Total</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{formatMoney(subTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
                <span style={{ fontWeight: 600, color: '#64748b' }}>Discount</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>₹{formatMoney(discountVal)}</span>
              </div>

              <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderRadius: 5 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 15 }}>₹{formatMoney(total)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, padding: '0 4px' }}>
                <span style={{ fontWeight: 600, color: '#64748b' }}>જમા (Paid)</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>₹{formatMoney(jamaAmount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px 0', borderTop: '2px solid #e2e8f0' }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>બાકી (Balance)</span>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 15 }}>₹{formatMoney(balance)}</span>
              </div>
            </div>
          </div>

          {/* ─── Bottom Signature Line ─── */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', fontSize: 12, fontWeight: 600, color: '#334155', paddingLeft: 6, marginTop: 'auto', marginBottom: 2 }}>
            <div style={{ textAlign: 'center', borderTop: '2px solid #0f172a', paddingTop: 5, width: '160px' }}>
              Authorised Sign
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

export default InvoicePrintLayout;

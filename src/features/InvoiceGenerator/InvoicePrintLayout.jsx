import React from 'react';

const formatMoney = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const themeBlue = '#333333';
const tableHeaderBg = '#f4f4f4';

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
      minHeight: '1120px',
      backgroundColor: '#fff',
      color: '#333',
      fontFamily: "'Anek Gujarati', sans-serif",
      position: 'relative',
      margin: '0 auto',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 8,
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
      border: '2px solid black'
    }}>
      {/* Background Watermark */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 0 }}>
        <img src="/logo.png" alt="Watermark" style={{ width: '400px', height: 'auto', opacity: 0.3 }} />
      </div>

      {/* Content Wrapper */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, backgroundColor: 'transparent', display: 'flex', flexDirection: 'column' }}>
        {/* Header Top Bar */}
        <div style={{ padding: '40px 40px 20px 40px', textAlign: 'center' }}>
          <h1 style={{ color: themeBlue, fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>JIKADARA & PANDAV ASSOCIATES</h1>
          <span style={{ color: '#333', fontSize: 18, fontWeight: 700 }}>Advocate and Legal Consultants</span>
        </div>

        {/* Solid Blue Bar */}
        <div style={{ textAlign: 'center', width: '100%', height: 24, color: 'white', backgroundColor: themeBlue, alignContent: 'center' }}>ઓફિસ :- બી-૨૯ બીજો માળ, દાનેવ આશિષ સોસાયટી,ચીકુવાડી રોડ, કતારગામ, સુરત - ૩૯૫૦૦૪.</div>

        {/* Info Block */}
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', borderBottom: '3px solid #333333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'right', fontSize: 15 }}>
            <div style={{ display: 'flex', gap: 12, }}>
              <span style={{ color: '#333', fontWeight: 600 }}>Date :</span>
              <span style={{ minWidth: 80, fontWeight: 700 }}>{displayDate}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8, textAlign: 'left' }}>
              <span style={{ color: '#333', fontWeight: 600 }}>Invoice No. :</span>
              <span style={{ minWidth: 80, fontWeight: 700 }}>{invoiceNo}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, color: themeBlue, fontSize: 16, fontWeight: 700 }}>નામ :</h3>
            <h2 style={{ margin: '4px 0', color: themeBlue, fontSize: 18, fontWeight: 700 }}>{clientName || ''}</h2>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: '0 40px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 18 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', padding: '12px 8px', color: themeBlue, fontWeight: 700, borderBottom: `2px solid ${tableHeaderBg}` }}>No.</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: themeBlue, fontWeight: 700, borderBottom: `2px solid ${tableHeaderBg}` }}>Subject</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', color: themeBlue, fontWeight: 700, borderBottom: `2px solid ${tableHeaderBg}` }}>Fees</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', color: themeBlue, fontWeight: 700, borderBottom: `2px solid ${tableHeaderBg}` }}>Qty.</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: themeBlue, fontWeight: 700, borderBottom: `2px solid ${tableHeaderBg}` }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item, index) => (
                <tr key={item.id || index} style={{ backgroundColor: 'transparent', borderBottom: '1px solid #c5c5c5' }}>
                  <td style={{ textAlign: 'center', padding: '12px 8px', color: '#333' }}>{index + 1}</td>
                  <td style={{ textAlign: 'left', padding: '12px 8px', color: '#333' }}>{item.description}</td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', color: '#333' }}>₹{formatMoney(item.price)}</td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', color: '#333' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', color: '#333', fontWeight: 500 }}>₹{formatMoney((item.price || 0) * (item.qty || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Section */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'end', alignItems: 'flex-start', marginTop: 'auto', marginBottom: '20px' }}>
          {/* Right Footer Calculations */}
          <div style={{ width: '40%', fontSize: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingRight: 10, paddingLeft: 10 }}>
              <span style={{ fontWeight: 600, color: '#333' }}>Sub Total</span>
              <span style={{ fontWeight: 700 }}>₹{formatMoney(subTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingRight: 10, paddingLeft: 10 }}>
              <span style={{ fontWeight: 600, color: '#333' }}>Discount</span>
              <span style={{ fontWeight: 700 }}>₹{formatMoney(discountVal)}</span>
            </div>

            <div style={{ backgroundColor: themeBlue, color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 18 }}>₹{formatMoney(total)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingRight: 10, paddingLeft: 10 }}>
              <span style={{ fontWeight: 600, color: '#333' }}>જમા (Paid)</span>
              <span style={{ fontWeight: 700, color: '#52c41a' }}>₹{formatMoney(jamaAmount)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 10, paddingLeft: 10, paddingTop: 12, borderTop: '2px solid #e0e0e0' }}>
              <span style={{ fontWeight: 700, color: themeBlue, fontSize: 18 }}>બાકી (Balance)</span>
              <span style={{ fontWeight: 800, color: themeBlue, fontSize: 18 }}>₹{formatMoney(balance)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Signature Line */}
        <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: 15, fontWeight: 600, color: '#333', marginLeft: 12 }}>
          <div style={{ textAlign: 'center', margin: '0px 20px 20px 0', borderTop: '2px solid #333', paddingTop: 8, width: '200px' }}>Authorised Sign</div>
        </div>
      </div>
    </div>
  );
});

export default InvoicePrintLayout;

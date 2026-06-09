import React, { useState, useRef } from 'react';
import { Card, Col, Row, Typography, Input, InputNumber, Button, Divider, message, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { FilePdfOutlined, PlusOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import html2pdf from 'html2pdf.js';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function InvoiceGenerator({ currentAccentColor }) {
  const componentRef = useRef();

  // Client Details
  const [clientName, setClientName] = useState('');
  // const [clientAddress, setClientAddress] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');

  // Date Picker state
  const [invoiceDate, setInvoiceDate] = useState(dayjs());
  const displayDate = invoiceDate ? invoiceDate.format('DD/MM/YYYY') : '';

  // Items
  const [items, setItems] = useState([
    { id: 1, description: '', qty: 1, price: 0 }
  ]);

  // Footer & Financials
  const [discountAmount, setDiscountAmount] = useState(0);
  const [jamaAmount, setJamaAmount] = useState(0); // Paid amount
  const [paymentInfo, setPaymentInfo] = useState('Account No: 0123456789\nA/C Name: your name\nBank Detail: add your bank details');

  // Calculations
  const subTotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0);
  const discountVal = parseFloat(discountAmount) || 0;
  const total = subTotal - discountVal;
  const balance = total - (jamaAmount || 0);

  const formatMoney = (val) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const addItem = () => setItems([...items, { id: Date.now(), description: '', qty: 1, price: 0 }]);
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const handleGeneratePDF = async () => {
    const element = componentRef.current;
    if (!element) return;

    const clone = element.cloneNode(true);
    clone.classList.add('pdf-mode');

    const container = document.createElement('div');
    container.className = 'pdf-export-container';
    Object.assign(container.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '794px', // A4 pixel width at 96 DPI
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: '-1',
    });

    Object.assign(clone.style, {
      overflow: 'visible',
      height: 'auto',
      maxHeight: 'none',
    });

    // remove .no-print elements from clone
    clone.querySelectorAll('.no-print').forEach(el => el.remove());

    container.appendChild(clone);
    document.body.appendChild(container);

    // wait for layout
    await new Promise((r) => setTimeout(r, 300));

    // A4 dimensions in inches
    const A4_WIDTH_IN = 8.27;
    const A4_HEIGHT_IN = 11.69;
    const PAGE_WIDTH_PX = A4_WIDTH_IN * 96;

    let captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight);

    if (captureHeight === 0) {
      document.body.removeChild(container);
      message.error('Error calculating PDF size.');
      return;
    }

    const captureWidth = Math.max(clone.scrollWidth, clone.offsetWidth, PAGE_WIDTH_PX);

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';

    const filename = clientName ? `${clientName}_Invoice.pdf` : 'Invoice.pdf';

    const opt = {
      margin: 0,
      filename,
      image: { type: 'png' },
      html2canvas: {
        scale: 4,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        onclone: (doc) => {
          const clonedRoot = doc.querySelector('.invoice-print-wrapper.pdf-mode');
          if (!clonedRoot) return;
          clonedRoot.style.overflow = 'visible';
          clonedRoot.style.height = 'auto';
          clonedRoot.style.maxHeight = 'none';
        },
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    try {
      await html2pdf().set(opt).from(clone).save();
      message.success('Invoice Generated successfully!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      message.error('Failed to generate Invoice PDF.');
    } finally {
      document.body.removeChild(container);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    }
  };

  // Theme colors (black & gray)
  const themeBlue = '#333333';
  const tableHeaderBg = '#f4f4f4';

  return (
    <div className="invoice-generator-wrap" style={{ padding: '4px 0 12px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FormOutlined style={{ fontSize: 20, color: currentAccentColor }} />
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>Invoice Generator</Title>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ position: 'relative', zIndex: 10 }}>
        {/* Left Column: Editor Inputs */}
        <Col xs={24} lg={10}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>


            <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Invoice Details</span>} style={{ position: 'relative', zIndex: 99 }}>
              <Row gutter={[8, 8]}>
                <Col xs={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Invoice To (Name)</Text>
                  <IndicTransliterate
                    containerClassName="transliterate-wrapper"
                    renderComponent={(props) => <input {...props} className="custom-transliterate-input" style={{ width: '100%', padding: '4px 8px', height: '28px' }} />}
                    value={clientName}
                    onChangeText={setClientName}
                    lang="gu"
                  />
                </Col>
                {/* <Col xs={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Address</Text>
                  <IndicTransliterate
                    containerClassName="transliterate-wrapper"
                    renderComponent={(props) => <textarea {...props} className="custom-transliterate-input" style={{ width: '100%', padding: '4px 8px', minHeight: '60px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }} />}
                    value={clientAddress}
                    onChangeText={setClientAddress}
                    lang="gu"
                  />
                </Col> */}
                <Col xs={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Invoice #</Text>
                  <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} style={{ height: '28px' }} />
                </Col>
                <Col xs={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Date</Text>
                  <DatePicker value={invoiceDate} onChange={setInvoiceDate} format="DD/MM/YYYY" style={{ width: '100%', height: '28px' }} />
                </Col>
              </Row>
            </Card>

            <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Items</span>} style={{ position: 'relative', zIndex: 98 }}>
              {items.map((item, index) => (
                <Row gutter={8} key={item.id} style={{ marginBottom: 8 }} align="middle">
                  <Col xs={24} style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>#{index + 1}</Text>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeItem(item.id)} style={{ float: 'right' }} />
                  </Col>
                  <Col xs={24}>
                    <IndicTransliterate
                      containerClassName="transliterate-wrapper"
                      renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Item Description" style={{ width: '100%', padding: '4px 8px', height: '28px', marginBottom: 4 }} />}
                      value={item.description}
                      onChangeText={(text) => updateItem(item.id, 'description', text)}
                      lang="gu"
                    />
                  </Col>
                  <Col xs={12}>
                    <Input type="number" placeholder="Price" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} prefix="₹" />
                  </Col>
                  <Col xs={12}>
                    <Input type="number" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} />
                  </Col>
                  <Col xs={24}>
                    <Divider style={{ margin: '8px 0' }} />
                  </Col>
                </Row>
              ))}
              <Button type="dashed" block onClick={addItem} icon={<PlusOutlined />}>Add Item</Button>
            </Card>

            <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Calculations & Footer</span>} style={{ position: 'relative', zIndex: 97 }}>
              <Row gutter={[8, 8]}>
                <Col xs={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Discount Amount</Text>
                  <InputNumber value={discountAmount} onChange={setDiscountAmount} style={{ width: '100%' }} min={0} />
                </Col>
                <Col xs={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>જમા (Paid)</Text>
                  <InputNumber value={jamaAmount} onChange={setJamaAmount} style={{ width: '100%' }} min={0} />
                </Col>
                <Col xs={8}>
                  <Text type="secondary" style={{ fontSize: 12 }}>બાકી (Balance)</Text>
                  <Input value={formatMoney(balance)} disabled style={{ width: '100%' }} />
                </Col>
              </Row>
            </Card>
          </div>
        </Col>

        {/* Right Column: PDF Preview */}
        <Col xs={24} lg={14} style={{ position: 'relative', zIndex: 5 }}>
          <Card
            size="small"
            className="glass-panel"
            bordered={false}
            title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Preview</span>}
            extra={<Button type="primary" size="small" icon={<FilePdfOutlined />} onClick={handleGeneratePDF} style={{ backgroundColor: currentAccentColor }}>Print</Button>}
          >
            <div style={{ overflowX: 'auto', background: '#e0e0e0', padding: 20, borderRadius: 8, display: 'flex', justifyContent: 'center' }}>

              {/* Invoice A4 Container */}
              <div ref={componentRef} className="invoice-print-wrapper" style={{
                width: '794px',
                minHeight: '1120px',
                backgroundColor: '#fff',
                color: '#333',
                fontFamily: "'Inter', sans-serif",
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                margin: '0 auto',
                border: '3px solid #333333',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 8
              }}>
                {/* Background Watermark */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 0 }}>
                  <img src="/logo.png" alt="Watermark" style={{ width: '400px', height: 'auto', opacity: 0.3 }} />
                </div>

                {/* Content Wrapper */}
                <div style={{ position: 'relative', zIndex: 1, flex: 1, backgroundColor: 'transparent', display: 'flex', flexDirection: 'column' }}>
                  {/* Header Top Bar */}
                  <div style={{ padding: '40px 40px 20px 40px', textAlign: 'center' }}>
                    <h1 style={{ margin: '0 0 8px 0', color: themeBlue, fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>JIKADARA & PANDAV ASSOCIATES</h1>
                    <span style={{ color: '#333', fontSize: 18, fontWeight: 700 }}>Advocate and Legal Consultants</span>
                  </div>

                  {/* Solid Blue Bar */}
                  <div style={{ textAlign: 'center', width: '100%', height: 24, color: 'white', backgroundColor: themeBlue }}>ઓફિસ :- બી-૨૯ બીજો માળ, દાનેવ આશિષ સોસાયટી,ચીકુવાડી રોડ, કતારગામ, સુરત - ૩૯૫૦૦૪.</div>

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
                      {/* <p style={{ margin: 0, color: '#666', fontSize: 13, whiteSpace: 'pre-wrap', maxWidth: 250 }}>{clientAddress || 'Client Address'}</p> */}
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
                        {items.map((item, index) => (
                          <tr key={item.id} style={{ backgroundColor: 'transparent', borderBottom: '1px solid #c5c5c5' }}>
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
                    {/* <div style={{ textAlign: 'center', flex: 1, borderTop: '1px solid #ccc', paddingTop: 8, marginRight: 20 }}>Phone</div>
                    <div style={{ textAlign: 'center', flex: 1, borderTop: '1px solid #ccc', paddingTop: 8, marginRight: 20 }}>Address</div>
                    <div style={{ textAlign: 'center', flex: 1, borderTop: '1px solid #ccc', paddingTop: 8, marginRight: 20 }}>Website</div> */}
                    <div style={{ textAlign: 'center', margin: '0px 20px 20px 0', borderTop: '2px solid #333', paddingTop: 8, width: '200px' }}>Authorised Sign</div>
                  </div>

                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

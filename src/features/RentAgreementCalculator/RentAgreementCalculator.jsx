import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Typography,
  Input,
  Select,
  Button,
  Row,
  Col,
  Space,
  Divider,
  Form,
  message
} from 'antd';
import { Download, RefreshCw, Calculator, FileText, Plus, Trash2 } from 'lucide-react';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import html2pdf from 'html2pdf.js';

const { Title, Text } = Typography;

export default function RentAgreementCalculator({ themeMode, currentAccentColor }) {
  const [form] = Form.useForm();
  const componentRef = useRef();

  // State for calculations
  const [rentAmount, setRentAmount] = useState(0);
  const [years, setYears] = useState(0);
  const [increasePercent, setIncreasePercent] = useState(10);
  const [agreementType, setAgreementType] = useState('Residence');
  const [deposit, setDeposit] = useState(0);
  const [gstInput, setGstInput] = useState(0);
  const [taxInput, setTaxInput] = useState(0);
  const [noOfPages, setNoOfPages] = useState(0);
  const [advocateFee, setAdvocateFee] = useState(5000);
  const [partyName, setPartyName] = useState('');

  const [customFields, setCustomFields] = useState([]);

  const addCustomField = () => setCustomFields([...customFields, { id: Date.now(), name: '', value: '' }]);
  const updateCustomField = (id, key, val) => setCustomFields(customFields.map(f => f.id === id ? { ...f, [key]: val } : f));
  const removeCustomField = (id) => setCustomFields(customFields.filter(f => f.id !== id));

  useEffect(() => {
    form.setFieldsValue({
      increasePercent: 10,
      agreementType: 'Residence',
      advocateFee: 5000
    });
  }, [form]);

  const handleValuesChange = (_, allValues) => {
    setRentAmount(parseFloat(allValues.rentAmount) || 0);
    setYears(parseInt(allValues.years) || 0);
    setIncreasePercent(parseFloat(allValues.increasePercent) || 0);
    setAgreementType(allValues.agreementType || 'Residence');
    setDeposit(parseFloat(allValues.deposit) || 0);
    setGstInput(parseFloat(allValues.gstInput) || 0);
    setTaxInput(parseFloat(allValues.taxInput) || 0);
    setNoOfPages(parseInt(allValues.noOfPages) || 0);
    setAdvocateFee(parseFloat(allValues.advocateFee) || 0);
  };

  const handleReset = () => {
    form.resetFields();
    setRentAmount(0);
    setYears(0);
    setIncreasePercent(10);
    setAgreementType('Residence');
    setDeposit(0);
    setGstInput(0);
    setTaxInput(0);
    setNoOfPages(0);
    setAdvocateFee(5000);
    setPartyName('');
  };

  // Helper for formatting currency
  const formatCurrency = (val) => {
    if (isNaN(val)) return '0';
    return Number(val.toFixed(2)).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
  };

  // --- Calculations ---
  let yearlyData = [];
  let currentRent = rentAmount;
  let totalRentForYears = 0;

  for (let i = 1; i <= years; i++) {
    if (i > 1) {
      currentRent = currentRent + (currentRent * increasePercent / 100);
    }
    const totalPerYear = currentRent * 12;
    totalRentForYears += totalPerYear;

    yearlyData.push({
      year: i,
      rentOnMonth: currentRent,
      totalPerYear: totalPerYear
    });
  }

  const avgNYear = years > 0 ? totalRentForYears / years : 0;
  const totalRentForDeedAvej = avgNYear + deposit + gstInput + taxInput;

  const regFee = totalRentForDeedAvej * 0.01;
  const stampDutyDeposit = deposit * 0.049;

  let stampDutyRentPercent = 0;
  let minStampDuty = 0;

  if (years >= 1 && years <= 5) {
    stampDutyRentPercent = 1.4;
    minStampDuty = agreementType === 'Residence' ? 1400 : 7000;
  } else if (years > 5 && years <= 15) {
    stampDutyRentPercent = 2.8;
    minStampDuty = 14000;
  } else if (years > 15 && years <= 30) {
    stampDutyRentPercent = 4.2;
    minStampDuty = 28000;
  } else if (years > 30 && years <= 99) {
    stampDutyRentPercent = 3.5;
    minStampDuty = 0;
  } else if (years > 99) {
    stampDutyRentPercent = 4.9;
    minStampDuty = 0;
  }

  const calculatedStampDutyRent = (avgNYear + gstInput + taxInput) * (stampDutyRentPercent / 100);
  const finalStampDutyRent = Math.max(calculatedStampDutyRent, minStampDuty);

  // const gstAbove20Lakh = totalRentForDeedAvej > 2000000 ? totalRentForDeedAvej * 0.18 : 0;

  const totalStampDuty = finalStampDutyRent + stampDutyDeposit;
  const pageFeeAmount = noOfPages * 20;
  const indexCopy = 600;
  const administrativeExp = 1000;
  const customFieldsTotal = customFields.reduce((sum, f) => sum + (Number(f.value) || 0), 0);
  const totalCost = totalStampDuty + regFee + pageFeeAmount + indexCopy + administrativeExp + advocateFee + customFieldsTotal;

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
      width: '794px',
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

    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    // Shrink to fit one A4 page if content is just slightly too tall, to avoid awkward clipping
    const PAGE_WIDTH_PX = 794;
    const PDF_MARGIN_IN = 0.15;
    const A4_HEIGHT_IN = 11.69;
    const maxContentHeightPx = (A4_HEIGHT_IN - PDF_MARGIN_IN * 2) * 96 * 0.97;

    let captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight);
    let captureWidth = Math.max(clone.scrollWidth, clone.offsetWidth, PAGE_WIDTH_PX);

    // Only shrink if it's less than 2 pages worth of content. If it's a huge 30-year lease, we let it span multiple pages.
    if (captureHeight > maxContentHeightPx && captureHeight < maxContentHeightPx * 1.5) {
      const scale = maxContentHeightPx / captureHeight;
      clone.style.transform = `scale(${scale})`;
      clone.style.transformOrigin = 'top center';

      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      captureHeight = maxContentHeightPx;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';

    const filename = partyName ? `${partyName}_ExpDetails.pdf` : 'ExpDetails.pdf';

    const opt = {
      margin: [PDF_MARGIN_IN, 0.2, PDF_MARGIN_IN, 0.2],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        onclone: (doc) => {
          const clonedRoot = doc.querySelector('.pdf-container.pdf-mode');
          if (!clonedRoot) return;
          clonedRoot.style.overflow = 'visible';
          clonedRoot.style.height = 'auto';
          clonedRoot.style.maxHeight = 'none';
          clonedRoot.querySelectorAll('.ant-card, .ant-row, .ant-col, .table-responsive').forEach((node) => {
            node.style.overflow = 'visible';
          });
        },
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.ant-card-head', '.ant-card-body'] },
    };

    try {
      await html2pdf().set(opt).from(clone).save();
      message.success('PDF Generated successfully!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      message.error('Failed to generate PDF.');
    } finally {
      document.body.removeChild(container);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    }
  };

  // Render Table Style
  const tableBorderColor = themeMode === 'dark' ? '#30363d' : '#d9d9d9';
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    border: `1px solid ${tableBorderColor}`
  };
  const thStyle = {
    border: `1px solid ${tableBorderColor}`,
    padding: '8px',
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#fafafa'
  };
  const tdStyle = {
    border: `1px solid ${tableBorderColor}`,
    padding: '8px',
    textAlign: 'center'
  };
  const tdRightStyle = {
    ...tdStyle,
    textAlign: 'right'
  };

  return (
    <div style={{ padding: '0', maxWidth: '100%' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={16} style={{ fontSize: 20, color: currentAccentColor }} />
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>Rent Agreement Calculator</Title>
        </div>
        <div>
          {/* <Button
            type="primary"
            icon={<RefreshCw size={16} />}
            onClick={handleReset}
            style={{ backgroundColor: currentAccentColor }}
          >
            Reset
          </Button> */}
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ position: 'relative', zIndex: 10 }}>
        <Col xs={24} lg={12}>
          <Card
            size="small"
            className="glass-panel"
            bordered={false}
            title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Agreement Details</span>}
          >
            <Form
              form={form}
              layout="vertical"
              onValuesChange={handleValuesChange}
              initialValues={{
                increasePercent: 10,
                agreementType: 'Residence',
                advocateFee: 5000
              }}
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item label="પાર્ટીનું નામ (Party Name)" style={{ marginBottom: 8 }}>
                    <IndicTransliterate
                      containerClassName="transliterate-wrapper"
                      renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Enter party name" style={{ width: '100%', padding: '4px 11px', height: '32px', borderRadius: '8px', border: '1px solid #d9d9d9' }} />}
                      value={partyName}
                      onChangeText={(text) => setPartyName(text)}
                      lang="gu"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="ભાડા ની રકમ (Rent Amount)" name="rentAmount" style={{ marginBottom: 8 }}>
                    <Input type="number" placeholder="Enter rent amount" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="વર્ષ (Years)" name="years" style={{ marginBottom: 8 }}>
                    <Input type="number" placeholder="Enter total years" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="વધારો ટકા (%) (Increase %)" name="increasePercent" style={{ marginBottom: 8 }}>
                    <Input type="number" placeholder="Enter increase % (Default 10)" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="એગ્રીમેન્ટ પ્રકાર (Agreement Type)" name="agreementType" style={{ marginBottom: 8 }}>
                    <Select>
                      <Select.Option value="Residence">રહેણાંક (Residence)</Select.Option>
                      <Select.Option value="Commercial">વાણિજ્ય (Commercial)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="ડિપોઝિટ (Deposit)" name="deposit" style={{ marginBottom: 8 }}>
                    <Input type="number" placeholder="Enter deposit amount" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="GST (Optional)" name="gstInput" style={{ marginBottom: 8 }}>
                    <Input type="number" placeholder="Enter GST amount" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="Tax (Optional)" name="taxInput" style={{ marginBottom: 8 }}>
                    <Input type="number" placeholder="Enter Tax amount" />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Divider style={{ margin: '8px 0 16px' }} />
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="પેજ સંખ્યા (No of Pages)" name="noOfPages" style={{ marginBottom: 8 }}>
                    <Input type="number" placeholder="Enter no of pages" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item label="એડવોકેટ ફી (Advocate Fee)" name="advocateFee" style={{ marginBottom: 8 }}>
                    <Input type="number" placeholder="Enter advocate fee" />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong style={{ color: currentAccentColor, fontSize: 13 }}>અન્ય ખર્ચ (Extra Expenses)</Text>
                    <Button className="no-print" type="dashed" size="small" icon={<Plus size={16} />} onClick={addCustomField}>
                      Add Field
                    </Button>
                  </div>
                  {customFields.map((field) => (
                    <Row gutter={8} key={field.id} style={{ marginBottom: 8 }} align="middle">
                      <Col xs={11}>
                        <IndicTransliterate
                          containerClassName="transliterate-wrapper"
                          renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Field Name (e.g. Other Exp)" style={{ width: '100%', padding: '4px 11px', height: '32px', borderRadius: '8px', border: '1px solid #d9d9d9' }} />}
                          value={field.name}
                          onChangeText={(text) => updateCustomField(field.id, 'name', text)}
                          lang="gu"
                        />
                      </Col>
                      <Col xs={11}>
                        <Input type="number" placeholder="Value" value={field.value} onChange={(e) => updateCustomField(field.id, 'value', e.target.value)} />
                      </Col>
                      <Col xs={2}>
                        <Button className="no-print" type="text" danger icon={<Trash2 size={16} />} onClick={() => removeCustomField(field.id)} />
                      </Col>
                    </Row>
                  ))}
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          {years > 0 && (
            <Card
              size="small"
              className="glass-panel"
              bordered={false}
              title="Final Calculation"
              extra={<Button type="primary" size="small" icon={<FileText size={16} />} className="no-print" onClick={handleGeneratePDF} style={{ backgroundColor: currentAccentColor }}>Print</Button>}
            >
              <div className="table-responsive pdf-container" ref={componentRef}>
                {/* PDF Only Header */}
                <div className="pdf-header">
                  <img src="/logo.png" alt="Company Logo" style={{ height: 50, marginBottom: 12 }} />
                  <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Advocate and Legal Consultants</Title>
                  <Divider style={{ margin: '12px 0 20px' }} />
                  <Text type="secondary" style={{ fontSize: 16, fontWeight: 'bold' }}>Rent Agreement Calculation</Text>
                  <Divider style={{ margin: '12px 0 20px' }} />
                </div>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th colSpan={2} style={{ ...thStyle, backgroundColor: currentAccentColor, color: '#fff' }}>
                        પાર્ટીનું નામ (Party Name): {partyName || 'Party Name'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdStyle}>સ્ટેમ્પ ડયુટી (Stamp Duty)</td>
                      <td style={tdRightStyle}>{formatCurrency(totalStampDuty)}</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}>રજી. ફી (Reg. Fee)</td>
                      <td style={tdRightStyle}>{formatCurrency(regFee)}</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}>પેજ ફી (Page Fee)</td>
                      <td style={tdRightStyle}>{formatCurrency(pageFeeAmount)}</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}>ઇન્ડેક્ષ ફી (Index Copy)</td>
                      <td style={tdRightStyle}>{formatCurrency(indexCopy)}</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}>સબ-રજિસ્ટ્રાર(Administrative Fee)</td>
                      <td style={tdRightStyle}>{formatCurrency(administrativeExp)}</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}>વકીલ ફી (Advocate Fee)</td>
                      <td style={tdRightStyle}>{formatCurrency(advocateFee)}</td>
                    </tr>
                    {customFields.map((field) => field.name ? (
                      <tr key={field.id}>
                        <td style={tdStyle}>{field.name}</td>
                        <td style={tdRightStyle}>{formatCurrency(Number(field.value) || 0)}</td>
                      </tr>
                    ) : null)}
                    <tr>
                      <td style={{ ...thStyle, backgroundColor: currentAccentColor, color: '#fff' }}>કુલ ખર્ચ (Total Cost)</td>
                      <td style={{ ...thStyle, backgroundColor: currentAccentColor, color: '#fff', textAlign: 'right' }}>{formatCurrency(totalCost)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16, position: 'relative', zIndex: 5 }}>
        <Col xs={24} lg={24}>
          <Card
            size="small"
            className="glass-panel"
            bordered={false}
            title={<span style={{ color: currentAccentColor, fontSize: 13 }}>Calculation Results</span>}
            style={{ overflowX: 'auto' }}
          >
            {years > 0 ? (
              <div className="table-responsive" style={{ marginBottom: 16 }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th colSpan={3} style={thStyle}>{years} - Year Lease Deed</th>
                    </tr>
                    <tr>
                      <th style={thStyle}>Rent</th>
                      <th style={thStyle}>{formatCurrency(rentAmount)}</th>
                      <th style={thStyle}>{increasePercent} % Inc Per Year</th>
                    </tr>
                    <tr>
                      <th style={thStyle}>Year</th>
                      <th style={thStyle}>Rent On Month</th>
                      <th style={thStyle}>Total Per Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyData.map((data) => (
                      <tr key={data.year}>
                        <td style={tdStyle}>{data.year}</td>
                        <td style={tdRightStyle}>{formatCurrency(data.rentOnMonth)}</td>
                        <td style={tdRightStyle}>{formatCurrency(data.totalPerYear)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} style={{ ...thStyle, textAlign: 'right' }}>Total Rent For {years} Year</td>
                      <td style={{ ...thStyle, textAlign: 'right' }}>{formatCurrency(totalRentForYears)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>Avg. {years} Year</td>
                      <td style={tdRightStyle}>{formatCurrency(avgNYear)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>Deposit +</td>
                      <td style={tdRightStyle}>{formatCurrency(deposit)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>GST</td>
                      <td style={tdRightStyle}>{gstInput > 0 ? formatCurrency(gstInput) : '-'}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>Tax</td>
                      <td style={tdRightStyle}>{taxInput > 0 ? formatCurrency(taxInput) : '-'}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ ...thStyle, textAlign: 'right' }}>Total Rent For Deed Avej</td>
                      <td style={{ ...thStyle, textAlign: 'right' }}>{formatCurrency(totalRentForDeedAvej)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                Please enter Rent Amount and Years to see the yearly breakdown.
              </div>
            )}

            {years > 0 && (
              <div className="table-responsive">
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>*</th>
                      <th style={thStyle}>Reg. Fee + Stamp Duty Calculation</th>
                      <th style={thStyle}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdStyle}>1</td>
                      <td style={tdStyle}>Reg. Fee For Total Rent For Deed Avej = 1 %</td>
                      <td style={tdRightStyle}><strong>{formatCurrency(regFee)}</strong></td>
                    </tr>
                    <tr>
                      <td style={tdStyle}>2</td>
                      <td style={tdStyle}>Stamp Duty For Deposit Amount = 4.9 %</td>
                      <td style={tdRightStyle}><strong>{formatCurrency(stampDutyDeposit)}</strong></td>
                    </tr>
                    <tr>
                      <td style={tdStyle}>3</td>
                      <td style={tdStyle}>Stamp Duty For Avg. {years} Year Rent + Tax + Gst Amount = {stampDutyRentPercent} % {minStampDuty > 0 ? `(Min ${minStampDuty})` : ''}</td>
                      <td style={tdRightStyle}><strong>{formatCurrency(finalStampDutyRent)}</strong></td>
                    </tr>
                    {/* {totalRentForDeedAvej > 2000000 && (
                      <tr>
                        <td style={tdStyle}>4</td>
                        <td style={tdStyle}>GST For Total Rent Above 20 Lakh = 18 % For Total Rent For Deed Avej</td>
                        <td style={tdRightStyle}><strong>{formatCurrency(gstAbove20Lakh)}</strong></td>
                      </tr>
                    )} */}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

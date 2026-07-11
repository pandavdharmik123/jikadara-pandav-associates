import React, { useState, useRef, useEffect } from 'react';
import { Card, Col, Row, Typography, InputNumber, Divider, Statistic, Space, Select, Input, Button, message } from 'antd';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import { Calculator, FileText, Plus, Trash2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const { Title, Text } = Typography;

export default function JantriCalculator({ currentAccentColor }) {
  const componentRef = useRef();

  const syncCloneFormState = (original, clone) => {
    const originalInputs = original.querySelectorAll('input, textarea, select');
    const clonedInputs = clone.querySelectorAll('input, textarea, select');
    originalInputs.forEach((input, index) => {
      const target = clonedInputs[index];
      if (!target) return;
      if (input.type === 'checkbox' || input.type === 'radio') {
        target.checked = input.checked;
      } else {
        target.value = input.value;
        target.setAttribute('value', input.value);
      }
    });

    const originalSelects = original.querySelectorAll('.ant-select');
    const clonedSelects = clone.querySelectorAll('.ant-select');
    originalSelects.forEach((select, index) => {
      const selectionItem = select.querySelector('.ant-select-selection-item');
      const cloneItem = clonedSelects[index]?.querySelector('.ant-select-selection-item');
      if (selectionItem && cloneItem) {
        cloneItem.textContent = selectionItem.textContent;
      }
    });
  };

  const handleGeneratePDF = async (isSummary = false) => {
    const element = componentRef.current;
    if (!element) return;

    const clone = element.cloneNode(true);
    syncCloneFormState(element, clone);
    clone.classList.add('pdf-mode');

    // Remove elements that shouldn't be printed
    clone.querySelectorAll('.no-print').forEach(el => el.remove());

    if (isSummary) {
      const leftCol = clone.querySelector('.main-print-col-left');
      if (leftCol) leftCol.remove();
      const rightCol = clone.querySelector('.main-print-col-right');
      if (rightCol) {
        rightCol.style.setProperty('width', '100%', 'important');
        rightCol.style.setProperty('max-width', '100%', 'important');
        rightCol.style.setProperty('flex', '0 0 100%', 'important');
      }
    }

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
    container.appendChild(clone);
    document.body.appendChild(container);

    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    // Shrink to fit one A4 page if content is still too tall after compact CSS
    const PAGE_WIDTH_PX = 794;
    const PDF_MARGIN_IN = 0.15;
    const A4_HEIGHT_IN = 11.69;
    const maxContentHeightPx = (A4_HEIGHT_IN - PDF_MARGIN_IN * 2) * 96 * 0.97;

    let captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight);
    let captureWidth = Math.max(clone.scrollWidth, clone.offsetWidth, PAGE_WIDTH_PX);

    if (captureHeight > maxContentHeightPx) {
      const scale = maxContentHeightPx / captureHeight;
      clone.style.transform = `scale(${scale})`;
      clone.style.transformOrigin = 'top center';

      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
      // Keeping captureHeight unscaled ensures html2canvas captures the full bounding box of the unscaled original
      // Since it's scaled down visually, it will fit into the original captureHeight with empty space at the bottom
      // But we want the canvas to be cropped at the scaled height so it doesn't leave huge blank space at the bottom on the PDF!
      captureHeight = maxContentHeightPx;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';

    const filename = buyerName ? `${buyerName}_Jantri.pdf` : 'Jantri.pdf';

    const opt = {
      margin: [PDF_MARGIN_IN, 0.2, PDF_MARGIN_IN, 0.2],
      filename,
      image: { type: 'jpeg', quality: 1.0 },
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
          const clonedRoot = doc.querySelector('.pdf-container.pdf-mode');
          if (!clonedRoot) return;
          clonedRoot.style.overflow = 'visible';
          clonedRoot.style.height = 'auto';
          clonedRoot.style.maxHeight = 'none';
          clonedRoot.querySelectorAll('.ant-card, .ant-row, .ant-col').forEach((node) => {
            node.style.overflow = 'visible';
          });
        },
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
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

  // --- Inputs ---
  const [plotArea, setPlotArea] = useState(241.84);
  const [plotRate, setPlotRate] = useState(25500);

  const [buildArea, setBuildArea] = useState(150);
  const [buildRate, setBuildRate] = useState(10395);

  const [depAge, setDepAge] = useState(0); // ઘસારો મિ. ઉમર
  const [totalPages, setTotalPages] = useState(0); // ટોટલ પેજ

  const [vahiwatFee, setVahiwatFee] = useState(1000); // વહીવટ
  const [vakilFee, setVakilFee] = useState(3500); // વકીલ ફી
  const [gender, setGender] = useState('male'); // લિંગ (ખરીદનાર)

  const [buyerName, setBuyerName] = useState(''); // ખરીદનાર નું નામ
  const [propertyDetails, setPropertyDetails] = useState(''); // મિલકત ની વિગત
  const [village, setVillage] = useState(''); // મોજે. ગામ
  const [tp, setTp] = useState(''); // TP
  const [fp, setFp] = useState(''); // FP
  const [propertyType, setPropertyType] = useState('ખુલ્લો પ્લોટ'); // મિલકત નો પ્રકાર
  const [gunthaSelection, setGunthaSelection] = useState(16); // ગુંઠા પસંદગી
  const [customFinalValue, setCustomFinalValue] = useState(null); // Custom user-entered final value
  const [customRegFee, setCustomRegFee] = useState(null); // Custom user-entered reg fee
  const [asrDeduction, setAsrDeduction] = useState(10); // ASR Deduction for flats

  const [customFields, setCustomFields] = useState([]);

  const addCustomField = () => setCustomFields([...customFields, { id: Date.now(), name: '', value: '' }]);
  const updateCustomField = (id, key, val) => setCustomFields(customFields.map(f => f.id === id ? { ...f, [key]: val } : f));
  const removeCustomField = (id) => setCustomFields(customFields.filter(f => f.id !== id));

  // --- Calculations ---
  // પ્લોટ નો અવેજ = ખુલ્લો પ્લોટ ક્ષેત્રફળ * ખુલ્લો પ્લોટ જંત્રી ભાવ
  let plotValue = (plotArea || 0) * (plotRate || 0);
  if (propertyType === 'ફ્લેટ' && asrDeduction) {
    plotValue = plotValue - (plotValue * (asrDeduction / 100));
  }

  // બાંધકામ નો અવેજ = બાંધકામ ક્ષેત્રફળ ચો.મી * બાંધકામ જંત્રી ભાવ
  const buildValue = (propertyType === 'ફ્લેટ' || propertyType === 'દુકાન' || propertyType === 'ખેતી ની જમીન') ? 0 : ((buildArea || 0) * (buildRate || 0));

  // પાર્કિંગ ની ગણતરી 
  const parkingValue = propertyType === 'ફ્લેટ' ? ((plotRate || 0) * 0.8) : (propertyType === 'દુકાન' ? ((plotRate || 0) * 1.6) : 0);

  // ટોટલ અવેજ = પ્લોટ નો અવેજ + બાંધકામ નો અવેજ + પાર્કિંગ નો અવેજ
  const totalValue = plotValue + buildValue + parkingValue;

  const getSection1Title = () => {
    switch (propertyType) {
      case 'ફ્લેટ': return 'ફ્લેટ (Flat)';
      case 'દુકાન': return 'દુકાન (Shop)';
      case 'ખેતી ની જમીન': return 'ખેતી ની જમીન (Agriculture Land)';
      default: return 'ખુલ્લો પ્લોટ (Open Plot)';
    }
  };

  const getSection1ValueTitle = () => {
    switch (propertyType) {
      case 'ફ્લેટ': return 'ફ્લેટ નો અવેજ (Flat Value)';
      case 'દુકાન': return 'દુકાન નો અવેજ (Shop Value)';
      case 'ખેતી ની જમીન': return 'ખેતી ની જમીન અવેજ (Plot Value)';
      default: return 'પ્લોટ નો અવેજ (Plot Value)';
    }
  };

  // ઘસારાની રકમ = (ઘસારો મિ. ઉમર*બાંધકામ નો અવેજ*1.2)/100
  const depBaseValue = (propertyType === 'ફ્લેટ' || propertyType === 'દુકાન') ? plotValue : buildValue;
  const depAmount = propertyType === 'ખેતી ની જમીન' ? 0 : (((depAge || 0) * depBaseValue * 1.2) / 100);

  // ઘસારા બાદ અવેજ = ટોટલ અવેજ - ઘસારાની રકમ
  const calculatedFinalValue = totalValue - depAmount;

  useEffect(() => {
    setCustomFinalValue(null);
  }, [calculatedFinalValue]);

  const finalValue = customFinalValue !== null ? customFinalValue : calculatedFinalValue;

  // સ્ટેમ્પ ડયુટી = ઘસારા બાદ અવેજ * 4.9 / 100
  const stampDuty = (finalValue * 4.9) / 100;

  // રજી. ફી = ઘસારા બાદ અવેજ / 100 (પુરુષ માટે 1%, સ્ત્રી માટે 0%)
  const calculatedRegFee = gender === 'male' ? finalValue / 100 : 0;

  useEffect(() => {
    setCustomRegFee(null);
  }, [calculatedRegFee]);

  const regFee = customRegFee !== null ? customRegFee : calculatedRegFee;

  // પેજ ફી = ટોટલ પેજ * 20
  const pageFee = (totalPages || 0) * 20;

  // ઇન્ડેક્ષ ફી = 600 fixed
  const indexFee = 600;

  // ટોટલ ફી = સ્ટેમ્પ ડયુટી + રજી. ફી + પેજ ફી + ઇન્ડેક્ષ ફી + વહીવટ + વકીલ ફી
  const customFieldsTotal = customFields.reduce((sum, f) => sum + (Number(f.value) || 0), 0);
  const totalFee = stampDuty + regFee + pageFee + indexFee + (vahiwatFee || 0) + (vakilFee || 0) + customFieldsTotal;

  // Formatter for currency
  const formatMoney = (val) => {
    return Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="jantri-calculator-wrap" style={{ padding: '4px 0 12px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={16} style={{ fontSize: 20, color: currentAccentColor }} />
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>Jantri & Stamp Duty Calculator</Title>
        </div>
        <Button
          type="primary"
          icon={<FileText size={16} />}
          onClick={() => handleGeneratePDF(false)}
          style={{ backgroundColor: currentAccentColor, height: '32px' }}
        >
          Generate PDF
        </Button>
      </div>

      <div ref={componentRef} className="pdf-container" style={{ padding: '0px' }}>
        {/* PDF Only Header */}
        <div className="pdf-header">
          <img src="/logo.png" alt="Company Logo" style={{ height: 50, marginBottom: 12 }} />
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Advocate and Legal Consultants</Title>
          <Divider style={{ margin: '12px 0 20px' }} />
          <Text type="secondary" style={{ fontSize: 16, fontWeight: 'bold' }}>Jantri & Stamp Duty Calculation</Text>
          <Divider style={{ margin: '12px 0 20px' }} />
        </div>

        <Row gutter={[12, 12]} className="main-print-row">
          {/* Left Column: Inputs */}
          <Col xs={24} lg={16} className="main-print-col-left">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Section 0: Buyer Details */}
              <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>ખરીદનાર ની વિગત (Buyer Details)</span>} style={{ position: 'relative', zIndex: 100 }}>
                <Row gutter={[8, 8]} align="middle">
                  {/* First Row */}
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ખરીદનાર નું નામ (Name)</Text>
                    <IndicTransliterate
                      containerClassName="transliterate-wrapper"
                      renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Enter name" style={{ padding: '2px 8px', height: '28px' }} />}
                      value={buyerName}
                      onChangeText={(text) => setBuyerName(text)}
                      lang="gu"
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>મિલકત ની વિગત (Property Details)</Text>
                    <IndicTransliterate
                      renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Enter details" style={{ padding: '2px 8px', height: '28px' }} />}
                      value={propertyDetails}
                      onChangeText={(text) => setPropertyDetails(text)}
                      lang="gu"
                    />
                  </Col>

                  {/* Second Row */}
                  <Col xs={12} sm={4}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>
                      {propertyType === 'ખેતી ની જમીન' ? 'સર્વે નંબર (Survey No)' : 'TP'}
                    </Text>
                    <Input
                      value={tp}
                      onChange={(e) => setTp(e.target.value)}
                      placeholder={propertyType === 'ખેતી ની જમીન' ? 'Enter Survey No' : 'Enter TP'}
                      style={{ height: '28px' }}
                    />
                  </Col>
                  <Col xs={12} sm={4}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>
                      {propertyType === 'ખેતી ની જમીન' ? 'બ્લોક નંબર (Block No)' : 'FP'}
                    </Text>
                    <Input
                      value={fp}
                      onChange={(e) => setFp(e.target.value)}
                      placeholder={propertyType === 'ખેતી ની જમીન' ? 'Enter Block No' : 'Enter FP'}
                      style={{ height: '28px' }}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>મોજે. ગામ</Text>
                    <IndicTransliterate
                      containerClassName="transliterate-wrapper"
                      renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Enter village" style={{ padding: '2px 8px', height: '28px' }} />}
                      value={village}
                      onChangeText={(text) => setVillage(text)}
                      lang="gu"
                    />
                  </Col>
                  <Col xs={24} sm={5}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>મિલકત નો પ્રકાર</Text>
                    <Select
                      value={propertyType}
                      onChange={setPropertyType}
                      style={{ width: '100%', height: '28px' }}
                      options={[
                        { value: 'ખુલ્લો પ્લોટ', label: 'મકાન' },
                        { value: 'ફ્લેટ', label: 'ફ્લેટ' },
                        { value: 'દુકાન', label: 'દુકાન' },
                        { value: 'ખેતી ની જમીન', label: 'ખેતી ની જમીન' },
                      ]}
                    />
                  </Col>
                  <Col xs={24} sm={5}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>લિંગ (Gender)</Text>
                    <Select
                      value={gender}
                      onChange={setGender}
                      style={{ width: '100%', height: '28px' }}
                      options={[
                        { value: 'male', label: 'પુરુષ (Male)' },
                        { value: 'female', label: 'સ્ત્રી (Female)' },
                      ]}
                    />
                  </Col>
                </Row>
              </Card>

              {/* Section 1: Plot Details */}
              <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>{getSection1Title()}</span>} style={{ position: 'relative', zIndex: 99 }}>
                <Row gutter={[8, 8]} align="middle">
                  <Col xs={24} sm={propertyType === 'ફ્લેટ' ? 6 : 8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ક્ષેત્રફળ ચો.મી (Area)</Text>
                    <InputNumber
                      style={{ width: '100%', height: '28px' }}
                      value={plotArea}
                      onChange={setPlotArea}
                      min={0}
                    />
                  </Col>
                  <Col xs={24} sm={propertyType === 'ફ્લેટ' ? 6 : 8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>જંત્રી ભાવ (Rate)</Text>
                    <InputNumber
                      style={{ width: '100%', height: '28px' }}
                      value={plotRate}
                      onChange={setPlotRate}
                      min={0}
                    />
                  </Col>
                  {propertyType === 'ફ્લેટ' && (
                    <Col xs={24} sm={6}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>એ. એસ. આર. ડિડકશન(%)</Text>
                      <InputNumber
                        style={{ width: '100%', height: '28px' }}
                        value={asrDeduction}
                        onChange={setAsrDeduction}
                        min={0}
                        max={100}
                        formatter={value => `${value}%`}
                        parser={value => value.replace('%', '')}
                      />
                    </Col>
                  )}
                  <Col xs={24} sm={propertyType === 'ફ્લેટ' ? 6 : 8}>
                    <Statistic
                      title={<span style={{ fontSize: 12 }}>{getSection1ValueTitle()}</span>}
                      value={formatMoney(plotValue)}
                      precision={2}
                      valueStyle={{ color: 'var(--text-primary)', fontSize: 16 }}
                    />
                  </Col>
                  {propertyType === 'ખેતી ની જમીન' && (
                    <>
                      <Col xs={24} sm={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ગુંઠા પસંદગી</Text>
                        <Select
                          value={gunthaSelection}
                          onChange={setGunthaSelection}
                          style={{ width: '100%', height: '28px' }}
                          options={[
                            { value: 16, label: '16' },
                            { value: 18, label: '18' },
                            { value: 23.78, label: '23.78' },
                          ]}
                        />
                      </Col>
                      <Col xs={24} sm={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>કુલ ગુંઠા</Text>
                        <InputNumber
                          style={{ width: '100%', height: '28px' }}
                          value={plotArea ? (plotArea / 100) : 0}
                          disabled
                        />
                      </Col>
                      <Col xs={24} sm={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>વીઘા</Text>
                        <InputNumber
                          style={{ width: '100%', height: '28px' }}
                          value={plotArea ? Math.floor((plotArea / 100) / gunthaSelection) : 0}
                          disabled
                        />
                      </Col>
                      <Col xs={24} sm={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ગુંઠા</Text>
                        <InputNumber
                          style={{ width: '100%', height: '28px' }}
                          value={plotArea ? ((plotArea / 100) % gunthaSelection) : 0}
                          disabled
                        />
                      </Col>
                    </>
                  )}
                </Row>
              </Card>

              {/* Section 2: Construction Details */}
              {propertyType !== 'ફ્લેટ' && propertyType !== 'દુકાન' && propertyType !== 'ખેતી ની જમીન' && (
                <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>બાંધકામ (Construction)</span>} style={{ position: 'relative', zIndex: 98 }}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col xs={24} sm={8}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ક્ષેત્રફળ ચો.મી (Area)</Text>
                      <InputNumber
                        style={{ width: '100%', height: '28px' }}
                        value={buildArea}
                        onChange={setBuildArea}
                        min={0}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>જંત્રી ભાવ (Rate)</Text>
                      <InputNumber
                        style={{ width: '100%', height: '28px' }}
                        value={buildRate}
                        onChange={setBuildRate}
                        min={0}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Statistic
                        title={<span style={{ fontSize: 12 }}>બાંધકામ નો અવેજ (Build Value)</span>}
                        value={formatMoney(buildValue)}
                        precision={2}
                        valueStyle={{ color: 'var(--text-primary)', fontSize: 16 }}
                      />
                    </Col>
                  </Row>
                </Card>
              )}

              {/* Section: Parking (Conditional) */}
              {(propertyType === 'ફ્લેટ' || propertyType === 'દુકાન') && (
                <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>પાર્કિંગ (Parking)</span>} style={{ position: 'relative', zIndex: 97 }}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col xs={24} sm={8}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>જંત્રી ભાવ (Calculated Rate)</Text>
                      <InputNumber
                        style={{ width: '100%', height: '28px' }}
                        value={parkingValue}
                        disabled
                      />
                    </Col>
                  </Row>
                </Card>
              )}

              {/* Section 3: Depreciation */}
              {propertyType !== 'ખેતી ની જમીન' && (
                <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>ઘસારો (Depreciation)</span>} style={{ position: 'relative', zIndex: 96 }}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col xs={24} sm={8}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>મિલકત ની ઉંમર (Age in Years)</Text>
                      <InputNumber
                        style={{ width: '100%', height: '28px' }}
                        value={depAge}
                        onChange={setDepAge}
                        min={0}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Statistic
                        title={<span style={{ fontSize: 12 }}>ઘસારાની રકમ (Depreciation Amount)</span>}
                        value={depAmount}
                        precision={2}
                        valueStyle={{ color: 'var(--text-secondary)', fontSize: 16 }}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <div style={{ background: `${currentAccentColor}1A`, padding: '6px 12px', borderRadius: 6, border: `1px solid ${currentAccentColor}33` }}>
                        <Statistic
                          title={<span style={{ fontSize: 12, color: currentAccentColor, fontWeight: 600 }}>કુલ અવેજ (Total Base Value)</span>}
                          value={formatMoney(totalValue)}
                          precision={2}
                          valueStyle={{ fontSize: 16, color: currentAccentColor, fontWeight: 'bold' }}
                        />
                      </div>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  {/* <Row>
                    <Col span={24}>
                      <Statistic
                        title={<span style={{ fontSize: 12 }}>ઘસારા બાદ અવેજ (Value After Depreciation)</span>}
                        value={finalValue}
                        precision={2}
                        valueStyle={{ color: currentAccentColor, fontWeight: 'bold', fontSize: 16 }}
                      />
                    </Col>
                  </Row> */}
                </Card>
              )}

              {/* Section 4: Fees and Expenses Inputs */}
              <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>ખર્ચની વિગત (Additional Details)</span>}>
                <Row gutter={[8, 8]}>
                  <Col xs={24} sm={6}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>અવેજ (as per જંત્રી)</Text>
                    <InputNumber
                      style={{ width: '100%', height: '28px' }}
                      value={formatMoney(calculatedFinalValue)}
                      // onChange={setCustomFinalValue}
                      disabled
                      min={0}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>અવેજ (Final Value)</Text>
                    <InputNumber
                      style={{ width: '100%', height: '28px' }}
                      value={finalValue}
                      onChange={setCustomFinalValue}
                      min={0}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>રજી. ફી (1%)</Text>
                    <InputNumber
                      style={{ width: '100%', height: '28px' }}
                      value={formatMoney(calculatedRegFee)}
                      disabled
                      min={0}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>રજી. ફી (Final)</Text>
                    <InputNumber
                      style={{ width: '100%', height: '28px' }}
                      value={regFee}
                      onChange={setCustomRegFee}
                      min={0}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ટોટલ પેજ (Total Pages)</Text>
                    <InputNumber
                      style={{ width: '100%', height: '28px' }}
                      value={totalPages}
                      onChange={setTotalPages}
                      min={0}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>સબ-રજિસ્ટ્રાર(Administrative Fee)</Text>
                    <InputNumber
                      style={{ width: '100%', height: '28px' }}
                      value={vahiwatFee}
                      onChange={setVahiwatFee}
                      min={0}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>વકીલ ફી (Vakil Fee)</Text>
                    <InputNumber
                      style={{ width: '100%', height: '28px' }}
                      value={vakilFee}
                      onChange={setVakilFee}
                      min={0}
                    />
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
                            renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Field Name (e.g. Other Exp)" style={{ width: '100%', padding: '2px 8px', height: '28px' }} />}
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
              </Card>
            </div>
          </Col>

          {/* Right Column: Final Calculation Summary */}
          <Col xs={24} lg={8} className="main-print-col-right">
            <Card size="small" className="glass-panel pdf-final-calculation" bordered={false} style={{ position: 'sticky', top: 88, borderTop: `4px solid ${currentAccentColor}` }}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 12, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Final Calculation</span>
                <Button type="primary" size="small" icon={<FileText size={16} />} className="no-print" onClick={() => handleGeneratePDF(true)} style={{ backgroundColor: currentAccentColor }}>Print</Button>
              </Title>

              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong style={{ fontSize: 13 }}>{formatMoney(calculatedFinalValue)}</Text>
                </div> */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>અવેજ (Final Value)</Text>
                  <Text strong style={{ fontSize: 13 }}>{formatMoney(finalValue)}</Text>
                </div>

                <Divider style={{ margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>સ્ટેમ્પ ડયુટી (Stamp Duty)</Text>
                  <Text style={{ fontSize: 13 }}>{formatMoney(stampDuty)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>રજી. ફી (Reg. Fee)</Text>
                  <Text style={{ fontSize: 13 }}>{formatMoney(regFee)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>પેજ ફી (Page Fee)</Text>
                  <Text style={{ fontSize: 13 }}>{formatMoney(pageFee)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>ઇન્ડેક્ષ ફી (Index Fee)</Text>
                  <Text style={{ fontSize: 13 }}>{formatMoney(indexFee)}</Text>
                </div>

                <Divider style={{ margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>સબ-રજિસ્ટ્રાર(Administrative Fee)</Text>
                  <Text style={{ fontSize: 13 }}>{formatMoney(vahiwatFee)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>વકીલ ફી (Vakil Fee)</Text>
                  <Text style={{ fontSize: 13 }}>{formatMoney(vakilFee)}</Text>
                </div>
                {customFields.map((field) => field.name ? (
                  <div key={field.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>{field.name}</Text>
                    <Text style={{ fontSize: 13 }}>{formatMoney(Number(field.value) || 0)}</Text>
                  </div>
                ) : null)}

                <div className="pdf-total-cost-box" style={{
                  marginTop: 8,
                  padding: '8px',
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>કુલ ખર્ચ (Total Cost)</Text>
                  <Text strong style={{ fontSize: 22, color: currentAccentColor }}>
                    ₹ {formatMoney(totalFee)}
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* PDF Only Footer
        <div className="pdf-footer">
          <div className="pdf-footer-content">
            <span style={{ fontStyle: 'italic' }}>Generated on: {new Date().toLocaleDateString('en-GB')}</span>
            <span style={{ fontWeight: 600 }}>Jikadara & Pandav Associates © 2026</span>
          </div>
        </div> */}

      </div>
    </div>
  );
}

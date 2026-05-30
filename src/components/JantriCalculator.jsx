import React, { useState, useRef } from 'react';
import { Card, Col, Row, Typography, InputNumber, Divider, Statistic, Space, Select, Input, Button } from 'antd';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import { CalculatorOutlined, PrinterOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';

const { Title, Text } = Typography;

export default function JantriCalculator({ currentAccentColor }) {
  const componentRef = useRef();

  const printCSS = `
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      body { -webkit-print-color-adjust: exact; }
      .ant-card { page-break-inside: avoid; border: 1px solid #ddd !important; margin-bottom: 4px !important; box-shadow: none !important; }
      .ant-card-head { min-height: 24px !important; padding: 2px 8px !important; border-bottom: 1px solid #eee !important; }
      .ant-card-head-title { padding: 4px 0 !important; font-size: 12px !important; }
      .ant-card-body { padding: 6px 8px !important; }
      .ant-row { row-gap: 4px !important; }
      .ant-col { padding-top: 2px !important; padding-bottom: 2px !important; }
      .ant-typography { font-size: 10px !important; margin-bottom: 2px !important; }
      .ant-statistic-title { font-size: 10px !important; margin-bottom: 2px !important; }
      .ant-statistic-content { font-size: 14px !important; }
      .ant-statistic-content-value { font-size: 14px !important; }
      .ant-input-number, .ant-select-selector, .ant-input, .custom-transliterate-input { height: 26px !important; min-height: 26px !important; font-size: 11px !important; }
      .ant-input-number-input { height: 24px !important; padding: 0 4px !important; }
      .ant-select-selection-item { line-height: 24px !important; }
      .ant-divider { margin: 6px 0 !important; }
      .no-print { display: none !important; }
      .glass-panel { background: white !important; }
      /* Final Calculation Box */
      .ant-space-item > div { margin-bottom: 2px !important; }
      .ant-space { gap: 4px !important; }
      h5.ant-typography { margin-bottom: 8px !important; font-size: 14px !important; }
      /* Force side-by-side layout in print to prevent the right column from stacking onto page 2 */
      .main-print-row { display: flex !important; flex-wrap: nowrap !important; }
      .main-print-col-left { width: 68% !important; max-width: 68% !important; flex: 0 0 68% !important; padding-right: 8px !important; }
      .main-print-col-right { width: 32% !important; max-width: 32% !important; flex: 0 0 32% !important; }
    }
  `;

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Jantri_Calculations',
    pageStyle: printCSS
  });

  const legacyPrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'Jantri_Calculations',
    pageStyle: printCSS
  });

  const doPrint = handlePrint || legacyPrint;

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
  const [tp, setTp] = useState(''); // TP
  const [fp, setFp] = useState(''); // FP
  const [propertyType, setPropertyType] = useState('ખુલ્લો પ્લોટ'); // મિલકત નો પ્રકાર
  const [gunthaSelection, setGunthaSelection] = useState(16); // ગુંઠા પસંદગી

  // --- Calculations ---
  // પ્લોટ નો અવેજ = ખુલ્લો પ્લોટ ક્ષેત્રફળ * ખુલ્લો પ્લોટ જંત્રી ભાવ
  const plotValue = (plotArea || 0) * (plotRate || 0);

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
  const finalValue = totalValue - depAmount;

  // સ્ટેમ્પ ડયુટી = ઘસારા બાદ અવેજ * 4.9 / 100
  const stampDuty = (finalValue * 4.9) / 100;

  // રજી. ફી = ઘસારા બાદ અવેજ / 100 (પુરુષ માટે 1%, સ્ત્રી માટે 0%)
  const regFee = gender === 'male' ? finalValue / 100 : 0;

  // પેજ ફી = ટોટલ પેજ * 20
  const pageFee = (totalPages || 0) * 20;

  // ઇન્ડેક્ષ ફી = 600 fixed
  const indexFee = 600;

  // ટોટલ ફી = સ્ટેમ્પ ડયુટી + રજી. ફી + પેજ ફી + ઇન્ડેક્ષ ફી + વહીવટ + વકીલ ફી
  const totalFee = stampDuty + regFee + pageFee + indexFee + (vahiwatFee || 0) + (vakilFee || 0);

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
          <CalculatorOutlined style={{ fontSize: 20, color: currentAccentColor }} />
          <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>Jantri & Stamp Duty Calculator</Title>
        </div>
        <Button 
          type="primary" 
          icon={<PrinterOutlined />} 
          onClick={doPrint}
          style={{ backgroundColor: currentAccentColor, height: '32px' }}
        >
          Generate PDF / Print
        </Button>
      </div>

      <div ref={componentRef} style={{ padding: '0px' }}>
        <Row gutter={[12, 12]} className="main-print-row">
        {/* Left Column: Inputs */}
        <Col xs={24} lg={16} className="main-print-col-left">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Section 0: Buyer Details */}
            <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>ખરીદનાર ની વિગત (Buyer Details)</span>} style={{ position: 'relative', zIndex: 100 }}>
              <Row gutter={[8, 8]} align="middle">
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ખરીદનાર નું નામ (Name)</Text>
                  <IndicTransliterate
                    renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Enter name" style={{ padding: '2px 8px', height: '28px' }} />}
                    value={buyerName}
                    onChangeText={(text) => setBuyerName(text)}
                    lang="gu"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>મિલકત ની વિગત (Property Details)</Text>
                  <IndicTransliterate
                    renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Enter details" style={{ padding: '2px 8px', height: '28px' }} />}
                    value={propertyDetails}
                    onChangeText={(text) => setPropertyDetails(text)}
                    lang="gu"
                  />
                </Col>
                <Col xs={12} sm={3}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>TP</Text>
                  <Input
                    value={tp}
                    onChange={(e) => setTp(e.target.value)}
                    placeholder="Enter TP"
                    style={{ height: '28px' }}
                  />
                </Col>
                <Col xs={12} sm={3}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>FP</Text>
                  <Input
                    value={fp}
                    onChange={(e) => setFp(e.target.value)}
                    placeholder="Enter FP"
                    style={{ height: '28px' }}
                  />
                </Col>
                <Col xs={24} sm={4}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>મિલકત નો પ્રકાર</Text>
                  <Select
                    value={propertyType}
                    onChange={setPropertyType}
                    style={{ width: '100%', height: '28px' }}
                    options={[
                      { value: 'ખુલ્લો પ્લોટ', label: 'ખુલ્લો પ્લોટ' },
                      { value: 'ફ્લેટ', label: 'ફ્લેટ' },
                      { value: 'દુકાન', label: 'દુકાન' },
                      { value: 'ખેતી ની જમીન', label: 'ખેતી ની જમીન' },
                    ]}
                  />
                </Col>
                <Col xs={24} sm={4}>
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
            <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>{getSection1Title()}</span>}>
              <Row gutter={[8, 8]} align="middle">
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ક્ષેત્રફળ ચો.મી (Area)</Text>
                  <InputNumber
                    style={{ width: '100%', height: '28px' }}
                    value={plotArea}
                    onChange={setPlotArea}
                    min={0}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>જંત્રી ભાવ (Rate)</Text>
                  <InputNumber
                    style={{ width: '100%', height: '28px' }}
                    value={plotRate}
                    onChange={setPlotRate}
                    min={0}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title={<span style={{ fontSize: 12 }}>{getSection1ValueTitle()}</span>}
                    value={plotValue}
                    precision={2}
                    valueStyle={{ color: 'var(--text-primary)', fontSize: 16 }}
                  />
                </Col>
                {propertyType === 'ખેતી ની જમીન' && (
                  <>
                    <Col xs={24} sm={8}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ગુંઠા પસંદગી</Text>
                      <Select
                        value={gunthaSelection}
                        onChange={setGunthaSelection}
                        style={{ width: '100%', height: '28px' }}
                        options={[
                          { value: 16, label: '16' },
                          { value: 18, label: '18' },
                          { value: 24, label: '24' },
                        ]}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>વીઘા</Text>
                      <InputNumber
                        style={{ width: '100%', height: '28px' }}
                        value={plotArea ? (plotArea / gunthaSelection) : 0}
                        disabled
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ગુંઠા</Text>
                      <InputNumber
                        style={{ width: '100%', height: '28px' }}
                        value={plotArea ? ((plotArea / gunthaSelection) * gunthaSelection) : 0}
                        disabled
                      />
                    </Col>
                  </>
                )}
              </Row>
            </Card>

            {/* Section 2: Construction Details */}
            {propertyType !== 'ફ્લેટ' && propertyType !== 'દુકાન' && propertyType !== 'ખેતી ની જમીન' && (
              <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>બાંધકામ (Construction)</span>}>
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
                      value={buildValue}
                      precision={2}
                      valueStyle={{ color: 'var(--text-primary)', fontSize: 16 }}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* Section: Parking (Conditional) */}
            {(propertyType === 'ફ્લેટ' || propertyType === 'દુકાન') && (
              <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>પાર્કિંગ (Parking)</span>}>
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
              <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>ઘસારો (Depreciation)</span>}>
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
                    <Statistic
                      title={<span style={{ fontSize: 12 }}>કુલ અવેજ (Total Base Value)</span>}
                      value={totalValue}
                      precision={2}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row>
                  <Col span={24}>
                    <Statistic
                      title={<span style={{ fontSize: 12 }}>ઘસારા બાદ અવેજ (Value After Depreciation)</span>}
                      value={finalValue}
                      precision={2}
                      valueStyle={{ color: currentAccentColor, fontWeight: 'bold', fontSize: 16 }}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* Section 4: Fees and Expenses Inputs */}
            <Card size="small" className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor, fontSize: 13 }}>ખર્ચની વિગત (Additional Details)</span>}>
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>ટોટલ પેજ (Total Pages)</Text>
                  <InputNumber
                    style={{ width: '100%', height: '28px' }}
                    value={totalPages}
                    onChange={setTotalPages}
                    min={0}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>વહીવટ (Vahiwat Fee)</Text>
                  <InputNumber
                    style={{ width: '100%', height: '28px' }}
                    value={vahiwatFee}
                    onChange={setVahiwatFee}
                    min={0}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 2, fontSize: 12 }}>વકીલ ફી (Vakil Fee)</Text>
                  <InputNumber
                    style={{ width: '100%', height: '28px' }}
                    value={vakilFee}
                    onChange={setVakilFee}
                    min={0}
                  />
                </Col>
              </Row>
            </Card>
          </div>
        </Col>

        {/* Right Column: Final Calculation Summary */}
        <Col xs={24} lg={8} className="main-print-col-right">
          <Card size="small" className="glass-panel" bordered={false} style={{ position: 'sticky', top: 12, borderTop: `4px solid ${currentAccentColor}` }}>
            <Title level={5} style={{ marginTop: 0, marginBottom: 12, fontSize: 14 }}>Final Calculation</Title>

            <Space direction="vertical" style={{ width: '100%' }} size="small">
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
                <Text type="secondary" style={{ fontSize: 13 }}>વહીવટ (Vahiwat)</Text>
                <Text style={{ fontSize: 13 }}>{formatMoney(vahiwatFee)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>વકીલ ફી (Vakil Fee)</Text>
                <Text style={{ fontSize: 13 }}>{formatMoney(vakilFee)}</Text>
              </div>

              <div style={{
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
      </div>
    </div>
  );
}

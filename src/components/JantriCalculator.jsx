import React, { useState } from 'react';
import { Card, Col, Row, Typography, InputNumber, Divider, Statistic, Space, Select, Input } from 'antd';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import { CalculatorOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function JantriCalculator({ currentAccentColor }) {
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

  // --- Calculations ---
  // પ્લોટ નો અવેજ = ખુલ્લો પ્લોટ ક્ષેત્રફળ * ખુલ્લો પ્લોટ જંત્રી ભાવ
  const plotValue = (plotArea || 0) * (plotRate || 0);

  // બાંધકામ નો અવેજ = બાંધકામ ક્ષેત્રફળ ચો.મી * બાંધકામ જંત્રી ભાવ
  const buildValue = (propertyType === 'ફ્લેટ' || propertyType === 'દુકાન') ? 0 : ((buildArea || 0) * (buildRate || 0));

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
      case 'ખેતી ની જમીન': return 'જમીન નો અવેજ (Land Value)';
      default: return 'પ્લોટ નો અવેજ (Plot Value)';
    }
  };

  // ઘસારાની રકમ = (ઘસારો મિ. ઉમર*બાંધકામ નો અવેજ*1.2)/100
  const depBaseValue = (propertyType === 'ફ્લેટ' || propertyType === 'દુકાન') ? plotValue : buildValue;
  const depAmount = ((depAge || 0) * depBaseValue * 1.2) / 100;

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
    <div className="jantri-calculator-wrap" style={{ padding: '8px 0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <CalculatorOutlined style={{ fontSize: 24, color: currentAccentColor }} />
        <Title level={4} style={{ margin: 0, color: 'var(--text-primary)' }}>Jantri & Stamp Duty Calculator</Title>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left Column: Inputs */}
        <Col xs={24} lg={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Section 0: Buyer Details */}
            <Card className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor }}>ખરીદનાર ની વિગત (Buyer Details)</span>} style={{ position: 'relative', zIndex: 100 }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>ખરીદનાર નું નામ (Name)</Text>
                  <IndicTransliterate
                    renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Enter name" />}
                    value={buyerName}
                    onChangeText={(text) => setBuyerName(text)}
                    lang="gu"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>મિલકત ની વિગત (Property Details)</Text>
                  <IndicTransliterate
                    renderComponent={(props) => <input {...props} className="custom-transliterate-input" placeholder="Enter details" />}
                    value={propertyDetails}
                    onChangeText={(text) => setPropertyDetails(text)}
                    lang="gu"
                  />
                </Col>
                <Col xs={12} sm={3}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>TP (Town Planning)</Text>
                  <Input
                    value={tp}
                    onChange={(e) => setTp(e.target.value)}
                    placeholder="Enter TP"
                  />
                </Col>
                <Col xs={12} sm={3}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>FP (Final Plot)</Text>
                  <Input
                    value={fp}
                    onChange={(e) => setFp(e.target.value)}
                    placeholder="Enter FP"
                  />
                </Col>
                <Col xs={24} sm={4}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>મિલકત નો પ્રકાર</Text>
                  <Select
                    value={propertyType}
                    onChange={setPropertyType}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'ખુલ્લો પ્લોટ', label: 'ખુલ્લો પ્લોટ' },
                      { value: 'ફ્લેટ', label: 'ફ્લેટ' },
                      { value: 'દુકાન', label: 'દુકાન' },
                      { value: 'ખેતી ની જમીન', label: 'ખેતી ની જમીન' },
                    ]}
                  />
                </Col>
                <Col xs={24} sm={4}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>લિંગ (Gender)</Text>
                  <Select
                    value={gender}
                    onChange={setGender}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'male', label: 'પુરુષ (Male)' },
                      { value: 'female', label: 'સ્ત્રી (Female)' },
                    ]}
                  />
                </Col>
              </Row>
            </Card>

            {/* Section 1: Plot Details */}
            <Card className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor }}>{getSection1Title()}</span>}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>ક્ષેત્રફળ ચો.મી (Area)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    value={plotArea}
                    onChange={setPlotArea}
                    min={0}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>જંત્રી ભાવ (Rate)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    value={plotRate}
                    onChange={setPlotRate}
                    min={0}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title={getSection1ValueTitle()}
                    value={plotValue}
                    precision={2}
                    valueStyle={{ color: 'var(--text-primary)' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* Section 2: Construction Details */}
            {propertyType !== 'ફ્લેટ' && propertyType !== 'દુકાન' && (
              <Card className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor }}>બાંધકામ (Construction)</span>}>
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>ક્ષેત્રફળ ચો.મી (Area)</Text>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={buildArea}
                      onChange={setBuildArea}
                      min={0}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>જંત્રી ભાવ (Rate)</Text>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={buildRate}
                      onChange={setBuildRate}
                      min={0}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <Statistic
                      title="બાંધકામ નો અવેજ (Build Value)"
                      value={buildValue}
                      precision={2}
                      valueStyle={{ color: 'var(--text-primary)' }}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* Section: Parking (Conditional) */}
            {(propertyType === 'ફ્લેટ' || propertyType === 'દુકાન') && (
              <Card className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor }}>પાર્કિંગ (Parking)</span>}>
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} sm={8}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>જંત્રી ભાવ (Calculated Rate)</Text>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={parkingValue}
                      disabled
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* Section 3: Depreciation */}
            <Card className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor }}>ઘસારો (Depreciation)</span>}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>મિલકત ની ઉંમર(Age in Years)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    value={depAge}
                    onChange={setDepAge}
                    min={0}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="ઘસારાની રકમ (Depreciation Amount)"
                    value={depAmount}
                    precision={2}
                    valueStyle={{ color: 'var(--text-secondary)' }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="કુલ અવેજ (Total Base Value)"
                    value={totalValue}
                    precision={2}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <Row>
                <Col span={24}>
                  <Statistic
                    title="ઘસારા બાદ અવેજ (Value After Depreciation)"
                    value={finalValue}
                    precision={2}
                    valueStyle={{ color: currentAccentColor, fontWeight: 'bold' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* Section 4: Fees and Expenses Inputs */}
            <Card className="glass-panel" bordered={false} title={<span style={{ color: currentAccentColor }}>ખર્ચની વિગત (Additional Details)</span>}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>ટોટલ પેજ (Total Pages)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    value={totalPages}
                    onChange={setTotalPages}
                    min={0}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>વહીવટ (Vahiwat Fee)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    value={vahiwatFee}
                    onChange={setVahiwatFee}
                    min={0}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>વકીલ ફી (Vakil Fee)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
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
        <Col xs={24} lg={8}>
          <Card className="glass-panel" bordered={false} style={{ position: 'sticky', top: 24, borderTop: `4px solid ${currentAccentColor}` }}>
            <Title level={5} style={{ marginTop: 0, marginBottom: 20 }}>Final Calculation</Title>

            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">અવેજ (Final Value)</Text>
                <Text strong>{formatMoney(finalValue)}</Text>
              </div>

              <Divider style={{ margin: 0 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">સ્ટેમ્પ ડયુટી (Stamp Duty)</Text>
                <Text>{formatMoney(stampDuty)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">રજી. ફી (Reg. Fee)</Text>
                <Text>{formatMoney(regFee)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">પેજ ફી (Page Fee)</Text>
                <Text>{formatMoney(pageFee)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">ઇન્ડેક્ષ ફી (Index Fee)</Text>
                <Text>{formatMoney(indexFee)}</Text>
              </div>

              <Divider style={{ margin: 0 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">વહીવટ (Vahiwat)</Text>
                <Text>{formatMoney(vahiwatFee)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">વકીલ ફી (Vakil Fee)</Text>
                <Text>{formatMoney(vakilFee)}</Text>
              </div>

              <div style={{
                marginTop: 16,
                padding: '16px',
                backgroundColor: 'rgba(0,0,0,0.04)',
                borderRadius: 8,
                textAlign: 'center'
              }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 16 }}>કુલ ખર્ચ (Total Cost)</Text>
                <Text strong style={{ fontSize: 28, color: currentAccentColor }}>
                  ₹ {formatMoney(totalFee)}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

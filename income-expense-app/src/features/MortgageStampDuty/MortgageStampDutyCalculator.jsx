import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Typography, InputNumber, Divider, Space, Button, message, Tag, DatePicker } from 'antd';
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import { Calculator, Plus, Save, FolderOpen, Percent } from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../services/api';
import SaveMortgageModal from './components/SaveMortgageModal';
import SavedMortgageModal from './components/SavedMortgageModal';

const { Title, Text } = Typography;

// Business rates from the reference sheet
const DUTY_RATE = 0.0035;      // Vaparva Parta Duty = Loan Amount × 0.35%
const PENALTY_RATE = 0.02;     // Monthly Penalty = Vaparva Duty × 2%
const FIVE_DANA_MULTIPLIER = 5; // 5 Dana Stamp Duty (with penalty) = Vaparva Duty × 5
const DEFAULT_VAKIL_FEE = 2500;

export default function MortgageStampDutyCalculator({ currentAccentColor }) {
  const accent = currentAccentColor || '#4f46e5';

  // --- Database Persistence State & Initial Data ---
  const initialData = React.useRef((() => {
    try {
      const saved = localStorage.getItem('mortgage_active_data');
      if (saved) return JSON.parse(saved);
    } catch (_) { }
    return {};
  })()).current;

  const [activeCalculationId, setActiveCalculationId] = useState(() => {
    return localStorage.getItem('mortgage_active_id') || null;
  });
  const [activeCalculationTitle, setActiveCalculationTitle] = useState(() => {
    return localStorage.getItem('mortgage_active_title') || '';
  });
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Inputs ---
  const [oldPartyName, setOldPartyName] = useState(initialData.oldPartyName ?? '');
  const [propertyDetails, setPropertyDetails] = useState(initialData.propertyDetails ?? '');
  const [loanAmount, setLoanAmount] = useState(initialData.loanAmount ?? 100000);
  const [sanctionDate, setSanctionDate] = useState(initialData.sanctionDate ?? null);
  const [vakilFee, setVakilFee] = useState(initialData.vakilFee ?? DEFAULT_VAKIL_FEE);

  // --- Computed values ---
  const vaparvaDuty = (Number(loanAmount) || 0) * DUTY_RATE;
  const monthlyPenalty = vaparvaDuty * PENALTY_RATE;
  const monthsElapsed = (() => {
    if (!sanctionDate) return 0;
    const start = dayjs(sanctionDate).startOf('day');
    const now = dayjs().startOf('day');
    if (!start.isValid() || start.isAfter(now)) return 0;
    let months = now.diff(start, 'month');
    // Count a partial month as a full month (matches the sheet's month count)
    if (start.add(months, 'month').isBefore(now)) months += 1;
    return months;
  })();
  const totalMonthlyPenalty = monthlyPenalty * monthsElapsed;
  const fiveDanaDuty = vaparvaDuty * FIVE_DANA_MULTIPLIER;
  const grandTotal = fiveDanaDuty + (Number(vakilFee) || 0);

  const formatMoney = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '0';
    return Math.round(Number(val)).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // --- Autosave active calculation state to localStorage ---
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('mortgage_active_data', JSON.stringify({
          oldPartyName,
          propertyDetails,
          loanAmount,
          sanctionDate,
          vakilFee,
          monthsElapsed,
          grandTotal
        }));
        localStorage.setItem('mortgage_active_id', activeCalculationId || '');
        localStorage.setItem('mortgage_active_title', activeCalculationTitle || '');
      } catch (_) { /* storage full — ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [oldPartyName, propertyDetails, loanAmount, sanctionDate, vakilFee, monthsElapsed, grandTotal, activeCalculationId, activeCalculationTitle]);

  // --- Calculation management ---
  const handleNewCalculation = () => {
    setOldPartyName('');
    setPropertyDetails('');
    setLoanAmount(100000);
    setSanctionDate(null);
    setVakilFee(DEFAULT_VAKIL_FEE);
    setActiveCalculationId(null);
    setActiveCalculationTitle('');
    localStorage.removeItem('mortgage_active_data');
    localStorage.removeItem('mortgage_active_id');
    localStorage.removeItem('mortgage_active_title');
    message.success('Started a new Mortgage calculation');
  };

  const handleSaveCalculation = async ({ title, saveAsNew = false }) => {
    setIsSaving(true);
    try {
      const payloadSnapshot = {
        oldPartyName,
        propertyDetails,
        loanAmount,
        sanctionDate,
        vakilFee,
        vaparvaDuty,
        monthlyPenalty,
        monthsElapsed,
        totalMonthlyPenalty,
        fiveDanaDuty,
        grandTotal,
        savedAt: new Date().toISOString()
      };

      let res;
      if (activeCalculationId && !activeCalculationId.startsWith('draft-') && !saveAsNew) {
        res = await api.put(`/mortgageStampDuty/${activeCalculationId}`, {
          title,
          clientName: oldPartyName,
          propertyDetails,
          loanAmount,
          sanctionDate,
          vakilFee,
          grandTotal,
          calculationData: payloadSnapshot
        });
      } else {
        res = await api.post('/mortgageStampDuty', {
          title,
          clientName: oldPartyName,
          propertyDetails,
          loanAmount,
          sanctionDate,
          vakilFee,
          grandTotal,
          calculationData: payloadSnapshot
        });
      }

      const saved = res.data?.calculation;
      if (saved) {
        setActiveCalculationId(saved.id);
        setActiveCalculationTitle(saved.title);
        localStorage.setItem('mortgage_active_id', saved.id);
        localStorage.setItem('mortgage_active_title', saved.title);
      }

      message.success(
        activeCalculationId && !saveAsNew
          ? 'Calculation updated successfully'
          : 'Calculation saved to database'
      );
      setSaveModalVisible(false);
    } catch (err) {
      console.error(err);
      message.error('Failed to save calculation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadCalculation = (calcData, title, id) => {
    if (!calcData) return;
    setOldPartyName(calcData.oldPartyName || '');
    setPropertyDetails(calcData.propertyDetails || '');
    setLoanAmount(calcData.loanAmount ?? 0);
    setSanctionDate(calcData.sanctionDate || null);
    setVakilFee(calcData.vakilFee ?? DEFAULT_VAKIL_FEE);
    setActiveCalculationId(id || null);
    setActiveCalculationTitle(title || '');
    localStorage.setItem('mortgage_active_id', id || '');
    localStorage.setItem('mortgage_active_title', title || '');
  };

  const summaryRow = (label, value, options = {}) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: options.strong ? 700 : 400, color: options.color || 'inherit' }}>
        {options.prefix || ''}{value}
      </Text>
    </div>
  );

  return (
    <div className="mortgage-stamp-duty-page" style={{ padding: '4px 0 12px' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(79, 70, 229, 0.1)',
            color: accent
          }}>
            <Calculator size={18} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16 }}>
              Mortgage Stamp Duty
            </Title>
            {activeCalculationTitle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Tag color="purple" style={{ fontSize: 11, margin: 0, padding: '0 6px' }}>
                  ☁️ {activeCalculationTitle}
                </Tag>
              </div>
            )}
          </div>
        </div>

        <Space size={8} wrap>
          <Button
            icon={<Plus size={14} />}
            onClick={handleNewCalculation}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            New
          </Button>

          <Button
            icon={<FolderOpen size={14} />}
            onClick={() => setSavedModalVisible(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            Saved
          </Button>

          <Button
            type="default"
            icon={<Save size={14} style={{ color: accent }} />}
            onClick={() => setSaveModalVisible(true)}
            loading={isSaving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            Save
          </Button>
        </Space>
      </div>

      <Row gutter={[12, 12]}>
        {/* Left Column: Inputs */}
        <Col xs={24} lg={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Card 1: Party & Property Details */}
            <Card
              size="small"
              className="glass-panel"
              bordered={false}
              title={<span style={{ color: accent, fontSize: 13 }}>જૂની પાર્ટી વિગત (Old Party & Property Details)</span>}
              style={{ position: 'relative', zIndex: 100 }}
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#334155' }}>
                    Old Party Name / જૂના પક્ષકારનું નામ
                  </Text>
                  <IndicTransliterate
                    containerClassName="transliterate-wrapper"
                    renderComponent={(props) => (
                      <input
                        {...props}
                        className="custom-transliterate-input"
                        placeholder="Enter party name"
                        style={{ width: '100%', padding: '4px 11px', height: 38, borderRadius: 8, border: '1px solid #d9d9d9', fontSize: 14 }}
                      />
                    )}
                    value={oldPartyName}
                    onChangeText={(text) => setOldPartyName(text)}
                    lang="gu"
                    enabled
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#334155' }}>
                    Property Details / મિલકતની વિગત
                  </Text>
                  <IndicTransliterate
                    containerClassName="transliterate-wrapper"
                    renderComponent={(props) => (
                      <input
                        {...props}
                        className="custom-transliterate-input"
                        placeholder="Survey No., area, location..."
                        style={{ width: '100%', padding: '4px 11px', height: 38, borderRadius: 8, border: '1px solid #d9d9d9', fontSize: 14 }}
                      />
                    )}
                    value={propertyDetails}
                    onChangeText={(text) => setPropertyDetails(text)}
                    lang="gu"
                    enabled
                  />
                </Col>
              </Row>
            </Card>

            {/* Card 2: Loan Details */}
            <Card
              size="small"
              className="glass-panel"
              bordered={false}
              title={<span style={{ color: accent, fontSize: 13 }}>લોન વિગત (Loan Details)</span>}
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#334155' }}>
                    Loan Amount / લોન રકમ
                  </Text>
                  <InputNumber
                    value={loanAmount}
                    onChange={(v) => setLoanAmount(v ?? 0)}
                    min={0}
                    max={999999999999}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value.replace(/,/g, '')}
                    style={{ width: '100%' }}
                    prefix="₹"
                  />
                </Col>
                <Col xs={24} md={12}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#334155' }}>
                    Loan Sanction Date / લોન મંજૂરી તારીખ
                  </Text>
                  <DatePicker
                    value={sanctionDate ? dayjs(sanctionDate) : null}
                    onChange={(d) => setSanctionDate(d ? d.format('YYYY-MM-DD') : null)}
                    format="DD-MM-YYYY"
                    style={{ width: '100%' }}
                    allowClear
                    disabledDate={(current) => current && current.isAfter(dayjs().endOf('day'))}
                  />
                </Col>
              </Row>

              <Divider style={{ margin: '14px 0 10px' }} />

              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#334155' }}>
                    <Percent size={11} style={{ verticalAlign: -1, marginRight: 2 }} />
                    Vaparva Parta Duty <Text type="secondary" style={{ fontWeight: 400 }}>(0.35%)</Text>
                  </Text>
                  <div style={{ padding: '6px 12px', backgroundColor: 'rgba(79,70,229,0.06)', borderRadius: 8, border: '1px solid rgba(79,70,229,0.15)' }}>
                    <Text strong style={{ fontSize: 15 }}>₹ {formatMoney(vaparvaDuty)}</Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#334155' }}>
                    Monthly Penalty <Text type="secondary" style={{ fontWeight: 400 }}>(2%)</Text>
                  </Text>
                  <div style={{ padding: '6px 12px', backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
                    <Text strong style={{ fontSize: 15, color: '#dc2626' }}>₹ {formatMoney(monthlyPenalty)}</Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#334155' }}>
                    Months till date <Text type="secondary" style={{ fontWeight: 400 }}>(sanction → today)</Text>
                  </Text>
                  <div style={{ padding: '6px 12px', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <Text strong style={{ fontSize: 15 }}>{monthsElapsed}</Text>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Card 3: 5 Dana Duty & Fees */}
            <Card
              size="small"
              className="glass-panel"
              bordered={false}
              title={<span style={{ color: accent, fontSize: 13 }}>સ્ટેમ્પ ડયુટી અને ફી (Stamp Duty & Fees)</span>}
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#334155' }}>
                    5 Dana Stamp Duty (with penalty) <Text type="secondary" style={{ fontWeight: 400 }}>= Duty × 5</Text>
                  </Text>
                  <div style={{ padding: '6px 12px', backgroundColor: 'rgba(79,70,229,0.06)', borderRadius: 8, border: '1px solid rgba(79,70,229,0.15)' }}>
                    <Text strong style={{ fontSize: 15 }}>₹ {formatMoney(fiveDanaDuty)}</Text>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#334155' }}>
                    Vakil Fee / વકીલ ફી
                  </Text>
                  <InputNumber
                    value={vakilFee}
                    onChange={(v) => setVakilFee(v ?? 0)}
                    min={0}
                    max={9999999}
                    style={{ width: '100%' }}
                    prefix="₹"
                  />
                </Col>
              </Row>
            </Card>
          </div>
        </Col>

        {/* Right Column: Summary (stacks below inputs on phones) */}
        <Col xs={24} lg={8}>
          <Card
            size="small"
            className="glass-panel mortgage-summary-card"
            bordered={false}
            style={{ borderTop: `4px solid ${accent}` }}
          >
            <Title level={5} style={{ marginTop: 0, marginBottom: 12, fontSize: 14 }}>
              Summary
            </Title>

            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {summaryRow('Old Party', oldPartyName || '-')}

              <Divider style={{ margin: '4px 0' }} />

              {summaryRow('Loan Amount', `₹ ${formatMoney(loanAmount)}`)}
              {summaryRow('Sanction Date', sanctionDate ? dayjs(sanctionDate).format('DD-MM-YYYY') : '-')}

              <Divider style={{ margin: '4px 0' }} />

              {summaryRow('Vaparva Parta Duty (0.35%)', `₹ ${formatMoney(vaparvaDuty)}`)}
              {summaryRow('Monthly Penalty (2%)', `₹ ${formatMoney(monthlyPenalty)}`)}
              {summaryRow('Months till date', String(monthsElapsed))}
              {summaryRow('Total Monthly Penalty', `₹ ${formatMoney(totalMonthlyPenalty)}`, { strong: true, color: '#dc2626' })}

              <Divider style={{ margin: '4px 0' }} />

              {summaryRow('5 Dana Stamp Duty (×5)', `₹ ${formatMoney(fiveDanaDuty)}`)}
              {summaryRow('Vakil Fee', `₹ ${formatMoney(vakilFee)}`)}

              <div
                style={{
                  marginTop: 8,
                  padding: '10px',
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  borderRadius: 8,
                  textAlign: 'center'
                }}
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
                  કુલ રકમ (Grand Total)
                </Text>
                <Text strong style={{ fontSize: 22, color: accent }}>
                  ₹ {formatMoney(grandTotal)}
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    = 5 Dana Duty {formatMoney(fiveDanaDuty)} + Vakil Fee {formatMoney(vakilFee)}
                  </Text>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Save to Database Modal */}
      <SaveMortgageModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        onSave={handleSaveCalculation}
        calculationData={{
          oldPartyName,
          propertyDetails,
          grandTotal
        }}
        currentDraftTitle={activeCalculationTitle}
        currentDraftId={activeCalculationId}
        isSaving={isSaving}
      />

      {/* Saved Calculations Modal */}
      <SavedMortgageModal
        visible={savedModalVisible}
        onClose={() => setSavedModalVisible(false)}
        onLoadCalculation={handleLoadCalculation}
        currentCalculationId={activeCalculationId}
      />
    </div>
  );
}

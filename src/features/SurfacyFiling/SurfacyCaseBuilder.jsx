import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileDown,
  FileText,
  FolderOpen,
  Landmark,
  Plus,
  RefreshCw,
  Save,
  Scale,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  fetchSurfacyTemplates,
  fetchSurfacyCase,
  createSurfacyCase,
  updateSurfacyCase,
  generatePreviewDocxBlob,
  downloadSurfacyDocx,
  downloadSurfacyPdf,
} from './surfacyApi';
import {
  buildDefaultPropertyDescription,
  validateSurfacyFormData,
} from './surfacyValidation';
import SurfacyPreviewPane from './components/SurfacyPreviewPane';
import SurfacyCaseListModal from './components/SurfacyCaseListModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

function toDatePickerVal(str) {
  if (!str) return null;
  const d = dayjs(str);
  return d.isValid() ? d : null;
}

function fromDatePickerVal(d) {
  return d && dayjs(d).isValid() ? dayjs(d).format('YYYY-MM-DD') : '';
}

export default function SurfacyCaseBuilder({ currentAccentColor }) {
  const accent = currentAccentColor || '#4f46e5';

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [pdfConverterAvailable, setPdfConverterAvailable] = useState(false);

  const [activeCaseId, setActiveCaseId] = useState(null);
  const [caseTitle, setCaseTitle] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [humanVerified, setHumanVerified] = useState(false);
  const [formData, setFormData] = useState(null);

  const [saving, setSaving] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewBuffer, setPreviewBuffer] = useState(null);
  const [caseListOpen, setCaseListOpen] = useState(false);
  const [activePanels, setActivePanels] = useState(['court', 'applicant', 'opponents']);

  const previewTimerRef = useRef(null);
  const verificationRef = useRef(null);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || templates[0] || null,
    [templates, selectedTemplateId]
  );

  const validation = useMemo(
    () => (formData ? validateSurfacyFormData(formData) : { isValid: false, errors: [], warnings: [], sectionCounts: {} }),
    [formData]
  );

  const refreshPreview = useCallback(async (dataToRender, tplFileName) => {
    if (!dataToRender) return;
    setPreviewLoading(true);
    try {
      const buf = await generatePreviewDocxBlob(dataToRender, tplFileName);
      setPreviewBuffer(buf);
    } catch (err) {
      console.error('Preview generation error:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // Load templates & default formData on mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const res = await fetchSurfacyTemplates();
        if (!mounted) return;
        const tpls = res.templates || [];
        setTemplates(tpls);
        if (tpls[0]) setSelectedTemplateId(tpls[0].id);
        setPdfConverterAvailable(Boolean(res.pdfConverterAvailable));
        if (res.defaultFormData) {
          setFormData(res.defaultFormData);
          refreshPreview(res.defaultFormData, tpls[0]?.fileName);
        }
      } catch {
        message.error('Failed to initialize Surfacy Case Filing builder');
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [refreshPreview]);

  // Debounced live preview update whenever formData changes
  useEffect(() => {
    if (!formData) return undefined;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      refreshPreview(formData, activeTemplate?.fileName);
    }, 650);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [formData, activeTemplate?.fileName, refreshPreview]);

  const updateSection = (sectionKey, patch) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        [sectionKey]: { ...(prev[sectionKey] || {}), ...patch },
      };

      // Auto-regenerate property description unless manually overridden
      if (sectionKey === 'property' && !updated.property.manualDescriptionOverride && !('completePropertyDescription' in patch)) {
        updated.property.completePropertyDescription = buildDefaultPropertyDescription(updated.property);
      }
      return updated;
    });
  };

  const handleNewCase = async () => {
    try {
      const res = await fetchSurfacyTemplates();
      setActiveCaseId(null);
      setCaseTitle('');
      setStatus('DRAFT');
      setHumanVerified(false);
      setFormData(res.defaultFormData);
      message.info('Started a new Surfacy Case Filing');
    } catch {
      message.error('Failed to reset form');
    }
  };

  const handleLoadCase = async (id) => {
    try {
      const res = await fetchSurfacyCase(id);
      const f = res.filing;
      setActiveCaseId(f.id);
      setSelectedTemplateId(f.templateId);
      setCaseTitle(f.caseTitle || '');
      setStatus(f.status || 'DRAFT');
      setHumanVerified(Boolean(f.humanVerified));
      setFormData(f.formData);
      message.success(`Loaded "${f.caseTitle}"`);
    } catch {
      message.error('Failed to load saved filing');
    }
  };

  const handleSaveCase = async (overrideStatus) => {
    if (!formData) return null;
    const targetStatus = overrideStatus || status;
    if (targetStatus === 'FINALIZED' && !humanVerified) {
      message.warning('Please check the Human Advocate Verification box before finalizing.');
      return null;
    }

    setSaving(true);
    try {
      const payload = {
        templateId: selectedTemplateId,
        caseTitle: caseTitle.trim() || undefined,
        status: targetStatus,
        humanVerified,
        formData,
      };

      const res = activeCaseId
        ? await updateSurfacyCase(activeCaseId, payload)
        : await createSurfacyCase(payload);

      const saved = res.filing;
      setActiveCaseId(saved.id);
      setCaseTitle(saved.caseTitle);
      setStatus(saved.status);
      message.success(activeCaseId ? 'Filing saved successfully' : 'New filing created & saved');
      return saved;
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to save filing');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      const saved = await handleSaveCase();
      if (!saved) return;
      await downloadSurfacyDocx(saved.id, saved.caseTitle);
      message.success('DOCX document generated & downloaded');
    } catch {
      message.error('Failed to download DOCX');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const saved = await handleSaveCase();
      if (!saved) return;
      await downloadSurfacyPdf(saved.id, saved.caseTitle);
      message.success('PDF document generated & downloaded');
    } catch (err) {
      const code = err?.response?.data?.code;
      const msgText = err?.response?.data?.error;
      if (code === 'PDF_CONVERTER_UNAVAILABLE') {
        message.warning(
          'Server-side LibreOffice PDF converter is not installed here. Use the "Print" button in the Live Preview toolbar to save as PDF cleanly.',
          6
        );
      } else {
        message.error(msgText || 'Failed to export PDF');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const syncAffidavitFromMain = () => {
    if (!formData) return;
    const totalSanc = (formData.loans || []).reduce((sum, l) => sum + (Number(String(l.sanctionedAmount || 0).replace(/[^0-9.-]/g, '')) || 0), 0);
    const totalOut = (formData.loans || []).reduce((sum, l) => sum + (Number(String(l.outstandingAmount || 0).replace(/[^0-9.-]/g, '')) || 0), 0);
    updateSection('affidavit', {
      deponentName: formData.applicant?.authorizedOfficerName || '',
      aggregateFinancialAssistance: totalSanc ? String(totalSanc) : '',
      totalOutstandingClaim: formData.proceedings?.demandNoticeAmount || (totalOut ? String(totalOut) : ''),
      npaDate: formData.proceedings?.npaDate || '',
      demandNoticeDate: formData.proceedings?.demandNoticeDate || '',
      executionPlace: formData.court?.courtLocation || '',
    });
    message.success('Affidavit synced with Applicant, Loans, and SARFAESI Proceedings');
  };

  const renderSectionBadge = (sectionId) => {
    const counts = validation.sectionCounts[sectionId];
    if (!counts) return <CheckCircle2 size={14} color="#16a34a" />;
    return (
      <Space size={4}>
        {counts.errors > 0 && <Badge count={counts.errors} style={{ backgroundColor: '#dc2626' }} />}
        {counts.warnings > 0 && <Badge count={counts.warnings} style={{ backgroundColor: '#d97706' }} />}
      </Space>
    );
  };

  if (!formData) {
    return (
      <Card loading bordered={false} style={{ borderRadius: 12 }}>
        Loading Surfacy Case Filing Builder...
      </Card>
    );
  }

  const opponents = formData.opponents || [];
  const loans = formData.loans || [];
  const advocates = formData.vakalatnama?.advocates || [];
  const annexures = formData.annexures || [];

  const moveAnnexure = (idx, dir) => {
    const next = [...annexures];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    const renumbered = next.map((item, i) => ({ ...item, serialNo: String(i + 1) }));
    setFormData((prev) => ({ ...prev, annexures: renumbered }));
  };

  const collapseItems = [
    {
      key: 'court',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text strong>A. Court & Case Information</Text>
          {renderSectionBadge('court')}
        </div>
      ),
      children: (
        <Row gutter={[10, 10]}>
          <Col xs={24} sm={14}>
            <Text style={{ fontSize: 12 }}>Court Name *</Text>
            <Input
              value={formData.court.courtName}
              onChange={(e) => updateSection('court', { courtName: e.target.value })}
              placeholder="ADDL. CHIEF JUDICIAL MAGISTRATE"
            />
          </Col>
          <Col xs={24} sm={10}>
            <Text style={{ fontSize: 12 }}>Court Location *</Text>
            <Input
              value={formData.court.courtLocation}
              onChange={(e) => updateSection('court', { courtLocation: e.target.value })}
              placeholder="e.g. NAVSARI"
            />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Application Number</Text>
            <Input
              value={formData.court.applicationNumber}
              onChange={(e) => updateSection('court', { applicationNumber: e.target.value })}
              placeholder="Leave blank if unnumbered"
            />
          </Col>
          <Col xs={12} sm={6}>
            <Text style={{ fontSize: 12 }}>Year *</Text>
            <Input
              value={formData.court.applicationYear}
              onChange={(e) => updateSection('court', { applicationYear: e.target.value })}
              placeholder="2026"
            />
          </Col>
          <Col xs={12} sm={5}>
            <Text style={{ fontSize: 12 }}>Filing Date</Text>
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              value={toDatePickerVal(formData.court.filingDate)}
              onChange={(d) => updateSection('court', { filingDate: fromDatePickerVal(d) })}
            />
          </Col>
          <Col xs={12} sm={5}>
            <Text style={{ fontSize: 12 }}>District *</Text>
            <Input
              value={formData.court.district}
              onChange={(e) => updateSection('court', { district: e.target.value })}
              placeholder="e.g. Navsari"
            />
          </Col>
        </Row>
      ),
    },
    {
      key: 'applicant',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text strong>B. Applicant / Financial Institution</Text>
          {renderSectionBadge('applicant')}
        </div>
      ),
      children: (
        <Row gutter={[10, 10]}>
          <Col xs={24} sm={12}>
            <Text style={{ fontSize: 12 }}>Financial Institution Name *</Text>
            <Input
              value={formData.applicant.institutionName}
              onChange={(e) => updateSection('applicant', { institutionName: e.target.value })}
              placeholder="e.g. Aavas Financiers Limited"
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text style={{ fontSize: 12 }}>Former Institution Name (Optional)</Text>
            <Input
              value={formData.applicant.formerInstitutionName}
              onChange={(e) => updateSection('applicant', { formerInstitutionName: e.target.value })}
              placeholder="e.g. AU Housing Finance Limited"
            />
          </Col>
          <Col xs={24}>
            <Text style={{ fontSize: 12 }}>Registered Office Address *</Text>
            <TextArea
              rows={2}
              value={formData.applicant.registeredOfficeAddress}
              onChange={(e) => updateSection('applicant', { registeredOfficeAddress: e.target.value })}
              placeholder="Full Registered Office Address"
            />
          </Col>
          <Col xs={24}>
            <Text style={{ fontSize: 12 }}>Branch Office Address *</Text>
            <TextArea
              rows={2}
              value={formData.applicant.branchOfficeAddress}
              onChange={(e) => updateSection('applicant', { branchOfficeAddress: e.target.value })}
              placeholder="Full Branch Office Address"
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text style={{ fontSize: 12 }}>Authorized Officer Name *</Text>
            <Input
              value={formData.applicant.authorizedOfficerName}
              onChange={(e) => updateSection('applicant', { authorizedOfficerName: e.target.value })}
              placeholder="e.g. Mr. Ashok Kumar"
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text style={{ fontSize: 12 }}>Authorized Officer Designation *</Text>
            <Input
              value={formData.applicant.authorizedOfficerDesignation}
              onChange={(e) => updateSection('applicant', { authorizedOfficerDesignation: e.target.value })}
              placeholder="Authorized Officer and Manager"
            />
          </Col>
        </Row>
      ),
    },
    {
      key: 'opponents',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text strong>C. Opponent / Borrower Information ({opponents.length})</Text>
          {renderSectionBadge('opponents')}
        </div>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {opponents.map((opp, idx) => (
            <Card
              key={opp.id || idx}
              size="small"
              title={`Opponent (${idx + 1})`}
              extra={
                opponents.length > 1 && (
                  <Button
                    size="small"
                    danger
                    type="text"
                    icon={<Trash2 size={14} />}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        opponents: prev.opponents.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    Remove
                  </Button>
                )
              }
            >
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={14}>
                  <Text style={{ fontSize: 12 }}>Full Name *</Text>
                  <Input
                    value={opp.fullName}
                    onChange={(e) => {
                      const next = [...opponents];
                      next[idx] = { ...next[idx], fullName: e.target.value };
                      setFormData((p) => ({ ...p, opponents: next }));
                    }}
                    placeholder="e.g. AVINASH KUMAR MAKWANA"
                  />
                </Col>
                <Col xs={24} sm={10}>
                  <Text style={{ fontSize: 12 }}>Role *</Text>
                  <Select
                    style={{ width: '100%' }}
                    value={opp.role}
                    onChange={(val) => {
                      const next = [...opponents];
                      next[idx] = { ...next[idx], role: val };
                      setFormData((p) => ({ ...p, opponents: next }));
                    }}
                    options={[
                      { value: 'Borrower', label: 'Borrower' },
                      { value: 'Co-borrower', label: 'Co-borrower' },
                      { value: 'Guarantor', label: 'Guarantor' },
                    ]}
                  />
                </Col>
                <Col xs={8} sm={6}>
                  <Text style={{ fontSize: 12 }}>Relation</Text>
                  <Select
                    style={{ width: '100%' }}
                    value={opp.relationship}
                    onChange={(val) => {
                      const next = [...opponents];
                      next[idx] = { ...next[idx], relationship: val };
                      setFormData((p) => ({ ...p, opponents: next }));
                    }}
                    options={[
                      { value: 'S/o', label: 'S/o' },
                      { value: 'W/o', label: 'W/o' },
                      { value: 'D/o', label: 'D/o' },
                      { value: 'C/o', label: 'C/o' },
                    ]}
                  />
                </Col>
                <Col xs={16} sm={18}>
                  <Text style={{ fontSize: 12 }}>Father / Husband Name</Text>
                  <Input
                    value={opp.relationName}
                    onChange={(e) => {
                      const next = [...opponents];
                      next[idx] = { ...next[idx], relationName: e.target.value };
                      setFormData((p) => ({ ...p, opponents: next }));
                    }}
                    placeholder="e.g. MANOJBHAI MAKWANA"
                  />
                </Col>
                <Col xs={24}>
                  <Text style={{ fontSize: 12 }}>Residential Address *</Text>
                  <TextArea
                    rows={2}
                    value={opp.residentialAddress}
                    onChange={(e) => {
                      const next = [...opponents];
                      next[idx] = { ...next[idx], residentialAddress: e.target.value };
                      setFormData((p) => ({ ...p, opponents: next }));
                    }}
                  />
                </Col>
                <Col xs={24}>
                  <Text style={{ fontSize: 12 }}>Alternate Address (Also At)</Text>
                  <Input
                    value={opp.alternateAddress}
                    onChange={(e) => {
                      const next = [...opponents];
                      next[idx] = { ...next[idx], alternateAddress: e.target.value };
                      setFormData((p) => ({ ...p, opponents: next }));
                    }}
                  />
                </Col>
              </Row>
            </Card>
          ))}
          <Button
            type="dashed"
            icon={<Plus size={14} />}
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                opponents: [
                  ...prev.opponents,
                  {
                    id: `opp-${Date.now()}`,
                    fullName: '',
                    relationship: 'W/o',
                    relationName: '',
                    role: 'Co-borrower',
                    residentialAddress: prev.opponents[0]?.residentialAddress || '',
                    alternateAddress: '',
                  },
                ],
              }))
            }
          >
            Add Opponent
          </Button>
        </div>
      ),
    },
    {
      key: 'loans',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text strong>D. Loan Information ({loans.length})</Text>
          {renderSectionBadge('loans')}
        </div>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loans.map((loan, idx) => (
            <Card
              key={loan.id || idx}
              size="small"
              title={`Loan Account #${idx + 1}`}
              extra={
                loans.length > 1 && (
                  <Button
                    size="small"
                    danger
                    type="text"
                    icon={<Trash2 size={14} />}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        loans: prev.loans.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    Remove
                  </Button>
                )
              }
            >
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={12}>
                  <Text style={{ fontSize: 12 }}>Loan Account Number *</Text>
                  <Input
                    value={loan.loanAccountNo}
                    onChange={(e) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], loanAccountNo: e.target.value };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Text style={{ fontSize: 12 }}>Loan Type *</Text>
                  <Input
                    value={loan.loanType}
                    onChange={(e) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], loanType: e.target.value };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                    placeholder="Housing Loan"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 12 }}>Application Date</Text>
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    value={toDatePickerVal(loan.applicationDate)}
                    onChange={(d) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], applicationDate: fromDatePickerVal(d) };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 12 }}>Sanction Date *</Text>
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    value={toDatePickerVal(loan.sanctionDate)}
                    onChange={(d) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], sanctionDate: fromDatePickerVal(d) };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text style={{ fontSize: 12 }}>Sanctioned Amount (₹) *</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    value={loan.sanctionedAmount ? Number(loan.sanctionedAmount) : null}
                    onChange={(val) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], sanctionedAmount: val !== null ? String(val) : '' };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 12 }}>Loan Agreement Date</Text>
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    value={toDatePickerVal(loan.loanAgreementDate)}
                    onChange={(d) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], loanAgreementDate: fromDatePickerVal(d) };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 12 }}>Deposit of Title Deeds Date</Text>
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    value={toDatePickerVal(loan.depositTitleDeedsDate)}
                    onChange={(d) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], depositTitleDeedsDate: fromDatePickerVal(d) };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Text style={{ fontSize: 12 }}>Sub-Registrar Office</Text>
                  <Input
                    value={loan.mortgageSubRegistrar}
                    onChange={(e) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], mortgageSubRegistrar: e.target.value };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                    placeholder="e.g. Jalalpor"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 12 }}>Mortgage Reg. Serial No.</Text>
                  <Input
                    value={loan.mortgageSerialNo}
                    onChange={(e) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], mortgageSerialNo: e.target.value };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                    placeholder="e.g. 7212/2025"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 12 }}>Mortgage Reg. Date</Text>
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    value={toDatePickerVal(loan.mortgageRegDate)}
                    onChange={(d) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], mortgageRegDate: fromDatePickerVal(d) };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 12 }}>Liability As On Date</Text>
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    value={toDatePickerVal(loan.liabilityDate)}
                    onChange={(d) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], liabilityDate: fromDatePickerVal(d) };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
                <Col xs={12} sm={12}>
                  <Text style={{ fontSize: 12 }}>Outstanding Amount (₹) *</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    value={loan.outstandingAmount ? Number(loan.outstandingAmount) : null}
                    onChange={(val) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], outstandingAmount: val !== null ? String(val) : '' };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Text style={{ fontSize: 12 }}>Interest Details</Text>
                  <Input
                    value={loan.interestDetails}
                    onChange={(e) => {
                      const next = [...loans];
                      next[idx] = { ...next[idx], interestDetails: e.target.value };
                      setFormData((p) => ({ ...p, loans: next }));
                    }}
                  />
                </Col>
              </Row>
            </Card>
          ))}
          <Button
            type="dashed"
            icon={<Plus size={14} />}
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                loans: [
                  ...prev.loans,
                  {
                    id: `loan-${Date.now()}`,
                    loanAccountNo: '',
                    loanType: 'Housing Loan',
                    sanctionDate: '',
                    sanctionedAmount: '',
                    outstandingAmount: '',
                    liabilityDate: '',
                  },
                ],
              }))
            }
          >
            Add Loan Record
          </Button>
        </div>
      ),
    },
    {
      key: 'property',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text strong>E. Secured Property Information</Text>
          {renderSectionBadge('property')}
        </div>
      ),
      children: (
        <Row gutter={[8, 8]}>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Flat / House No.</Text>
            <Input value={formData.property.flatHouseNo} onChange={(e) => updateSection('property', { flatHouseNo: e.target.value })} />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Built-up Area</Text>
            <Input value={formData.property.builtUpArea} onChange={(e) => updateSection('property', { builtUpArea: e.target.value })} />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Area Unit</Text>
            <Select
              style={{ width: '100%' }}
              value={formData.property.areaUnit}
              onChange={(val) => updateSection('property', { areaUnit: val })}
              options={[
                { value: 'Sq.fts', label: 'Sq.fts' },
                { value: 'Sq.mtr', label: 'Sq.mtr' },
                { value: 'Sq.yds', label: 'Sq.yds' },
              ]}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Floor Number</Text>
            <Input value={formData.property.floorNumber} onChange={(e) => updateSection('property', { floorNumber: e.target.value })} />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>New Property No.</Text>
            <Input value={formData.property.newPropertyNo} onChange={(e) => updateSection('property', { newPropertyNo: e.target.value })} />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Old Property No.</Text>
            <Input value={formData.property.oldPropertyNo} onChange={(e) => updateSection('property', { oldPropertyNo: e.target.value })} />
          </Col>
          <Col xs={24} sm={12}>
            <Text style={{ fontSize: 12 }}>Building / Complex Name</Text>
            <Input value={formData.property.buildingName} onChange={(e) => updateSection('property', { buildingName: e.target.value })} />
          </Col>
          <Col xs={12} sm={6}>
            <Text style={{ fontSize: 12 }}>Plot No.</Text>
            <Input value={formData.property.plotNo} onChange={(e) => updateSection('property', { plotNo: e.target.value })} />
          </Col>
          <Col xs={12} sm={6}>
            <Text style={{ fontSize: 12 }}>Plot Area</Text>
            <Input value={formData.property.plotArea} onChange={(e) => updateSection('property', { plotArea: e.target.value })} />
          </Col>
          <Col xs={12} sm={12}>
            <Text style={{ fontSize: 12 }}>Block / Revenue Survey No.</Text>
            <Input value={formData.property.blockSurveyNo} onChange={(e) => updateSection('property', { blockSurveyNo: e.target.value })} />
          </Col>
          <Col xs={12} sm={12}>
            <Text style={{ fontSize: 12 }}>New Survey No.</Text>
            <Input value={formData.property.newSurveyNo} onChange={(e) => updateSection('property', { newSurveyNo: e.target.value })} />
          </Col>
          <Col xs={8}>
            <Text style={{ fontSize: 12 }}>Village / Moje</Text>
            <Input value={formData.property.villageMoje} onChange={(e) => updateSection('property', { villageMoje: e.target.value })} />
          </Col>
          <Col xs={8}>
            <Text style={{ fontSize: 12 }}>Taluka / Sub-District</Text>
            <Input value={formData.property.talukaSubDistrict} onChange={(e) => updateSection('property', { talukaSubDistrict: e.target.value })} />
          </Col>
          <Col xs={8}>
            <Text style={{ fontSize: 12 }}>District</Text>
            <Input value={formData.property.district} onChange={(e) => updateSection('property', { district: e.target.value })} />
          </Col>

          <Col xs={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text strong style={{ fontSize: 12 }}>Complete Legal Property Description *</Text>
              <Space size={6}>
                <Text type="secondary" style={{ fontSize: 11 }}>Manual Edit</Text>
                <Switch
                  size="small"
                  checked={formData.property.manualDescriptionOverride}
                  onChange={(checked) => updateSection('property', { manualDescriptionOverride: checked })}
                />
              </Space>
            </div>
            <TextArea
              rows={4}
              value={formData.property.completePropertyDescription}
              onChange={(e) =>
                updateSection('property', {
                  manualDescriptionOverride: true,
                  completePropertyDescription: e.target.value,
                })
              }
              placeholder="Auto-generated from property fields above, or toggle Manual Edit to customize..."
            />
          </Col>

          <Col xs={24}>
            <Divider style={{ margin: '6px 0' }} />
            <Text strong style={{ fontSize: 12 }}>Property Boundaries (Appears in Application, Prayer & Affidavit)</Text>
          </Col>
          {['north', 'south', 'east', 'west'].map((dir) => (
            <Col xs={12} key={dir}>
              <Text style={{ fontSize: 12, textTransform: 'capitalize' }}>{dir} *</Text>
              <Input
                value={formData.property.boundaries?.[dir]}
                onChange={(e) =>
                  updateSection('property', {
                    boundaries: { ...(formData.property.boundaries || {}), [dir]: e.target.value },
                  })
                }
              />
            </Col>
          ))}
        </Row>
      ),
    },
    {
      key: 'proceedings',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text strong>F. SARFAESI Proceedings</Text>
          {renderSectionBadge('proceedings')}
        </div>
      ),
      children: (
        <Row gutter={[8, 8]}>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>NPA Classification Date *</Text>
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              value={toDatePickerVal(formData.proceedings.npaDate)}
              onChange={(d) => updateSection('proceedings', { npaDate: fromDatePickerVal(d) })}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Demand Notice Date (13(2)) *</Text>
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              value={toDatePickerVal(formData.proceedings.demandNoticeDate)}
              onChange={(d) => updateSection('proceedings', { demandNoticeDate: fromDatePickerVal(d) })}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Demand Notice Amount (₹) *</Text>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              value={formData.proceedings.demandNoticeAmount ? Number(formData.proceedings.demandNoticeAmount) : null}
              onChange={(val) => updateSection('proceedings', { demandNoticeAmount: val !== null ? String(val) : '' })}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Notice Service Date</Text>
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              value={toDatePickerVal(formData.proceedings.demandNoticeServiceDate)}
              onChange={(d) => updateSection('proceedings', { demandNoticeServiceDate: fromDatePickerVal(d) })}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Statutory Notice Period</Text>
            <Input
              value={formData.proceedings.statutoryNoticePeriod}
              onChange={(e) => updateSection('proceedings', { statutoryNoticePeriod: e.target.value })}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Text style={{ fontSize: 12 }}>Symbolic Possession Date *</Text>
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              value={toDatePickerVal(formData.proceedings.symbolicPossessionDate)}
              onChange={(d) => updateSection('proceedings', { symbolicPossessionDate: fromDatePickerVal(d) })}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text style={{ fontSize: 12 }}>Newspaper Publication Details</Text>
            <Input
              value={formData.proceedings.newspaperPublicationDetails}
              onChange={(e) => updateSection('proceedings', { newspaperPublicationDetails: e.target.value })}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text style={{ fontSize: 12 }}>Police Station Details</Text>
            <Input
              value={formData.proceedings.policeStationDetails}
              onChange={(e) => updateSection('proceedings', { policeStationDetails: e.target.value })}
            />
          </Col>
        </Row>
      ),
    },
    {
      key: 'affidavit',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text strong>G. Affidavit Details</Text>
          {renderSectionBadge('affidavit')}
        </div>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 10 }}>
            <Button size="small" icon={<RefreshCw size={13} />} onClick={syncAffidavitFromMain}>
              Sync from Main Application
            </Button>
          </div>
          <Row gutter={[8, 8]}>
            <Col xs={24} sm={12}>
              <Text style={{ fontSize: 12 }}>Authorized Officer Name</Text>
              <Input
                value={formData.affidavit.deponentName}
                onChange={(e) => updateSection('affidavit', { deponentName: e.target.value })}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Text style={{ fontSize: 12 }}>Age</Text>
              <Input value={formData.affidavit.age} onChange={(e) => updateSection('affidavit', { age: e.target.value })} />
            </Col>
            <Col xs={12} sm={6}>
              <Text style={{ fontSize: 12 }}>Occupation</Text>
              <Input value={formData.affidavit.occupation} onChange={(e) => updateSection('affidavit', { occupation: e.target.value })} />
            </Col>
            <Col xs={12} sm={8}>
              <Text style={{ fontSize: 12 }}>Total Claim (₹)</Text>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                value={formData.affidavit.totalOutstandingClaim ? Number(formData.affidavit.totalOutstandingClaim) : null}
                onChange={(val) => updateSection('affidavit', { totalOutstandingClaim: val !== null ? String(val) : '' })}
              />
            </Col>
            <Col xs={12} sm={8}>
              <Text style={{ fontSize: 12 }}>Affidavit NPA Date</Text>
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                value={toDatePickerVal(formData.affidavit.npaDate)}
                onChange={(d) => updateSection('affidavit', { npaDate: fromDatePickerVal(d) })}
              />
            </Col>
            <Col xs={12} sm={8}>
              <Text style={{ fontSize: 12 }}>Affidavit Demand Date</Text>
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                value={toDatePickerVal(formData.affidavit.demandNoticeDate)}
                onChange={(d) => updateSection('affidavit', { demandNoticeDate: fromDatePickerVal(d) })}
              />
            </Col>
            <Col xs={12} sm={12}>
              <Text style={{ fontSize: 12 }}>Execution Date</Text>
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                value={toDatePickerVal(formData.affidavit.executionDate)}
                onChange={(d) => updateSection('affidavit', { executionDate: fromDatePickerVal(d) })}
              />
            </Col>
            <Col xs={12} sm={12}>
              <Text style={{ fontSize: 12 }}>Execution Place</Text>
              <Input
                value={formData.affidavit.executionPlace}
                onChange={(e) => updateSection('affidavit', { executionPlace: e.target.value })}
              />
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'vakalatnama',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text strong>H. Vakalatnama Details ({advocates.length})</Text>
          {renderSectionBadge('vakalatnama')}
        </div>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {advocates.map((adv, idx) => (
            <div key={adv.id || idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                value={adv.name}
                placeholder={`Advocate #${idx + 1} Name`}
                onChange={(e) => {
                  const next = [...advocates];
                  next[idx] = { ...next[idx], name: e.target.value };
                  updateSection('vakalatnama', { advocates: next });
                }}
              />
              {advocates.length > 1 && (
                <Button
                  danger
                  size="small"
                  icon={<Trash2 size={14} />}
                  onClick={() =>
                    updateSection('vakalatnama', {
                      advocates: advocates.filter((_, i) => i !== idx),
                    })
                  }
                />
              )}
            </div>
          ))}
          <Button
            type="dashed"
            size="small"
            icon={<Plus size={14} />}
            onClick={() =>
              updateSection('vakalatnama', {
                advocates: [...advocates, { id: `adv-${Date.now()}`, name: '', isPrimary: false }],
              })
            }
          >
            Add Advocate
          </Button>
          <Row gutter={[8, 8]}>
            <Col xs={24}>
              <Text style={{ fontSize: 12 }}>Office Address</Text>
              <TextArea
                rows={2}
                value={formData.vakalatnama.officeAddress}
                onChange={(e) => updateSection('vakalatnama', { officeAddress: e.target.value })}
              />
            </Col>
            <Col xs={12} sm={8}>
              <Text style={{ fontSize: 12 }}>Mobile Number</Text>
              <Input
                value={formData.vakalatnama.mobileNumber}
                onChange={(e) => updateSection('vakalatnama', { mobileNumber: e.target.value })}
              />
            </Col>
            <Col xs={12} sm={8}>
              <Text style={{ fontSize: 12 }}>Enrollment No. *</Text>
              <Input
                value={formData.vakalatnama.enrollmentNumber}
                onChange={(e) => updateSection('vakalatnama', { enrollmentNumber: e.target.value })}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Text style={{ fontSize: 12 }}>Execution Date</Text>
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                value={toDatePickerVal(formData.vakalatnama.executionDate)}
                onChange={(d) => updateSection('vakalatnama', { executionDate: fromDatePickerVal(d) })}
              />
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'annexures',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text strong>I. List of Documents / Annexures ({annexures.length})</Text>
          {renderSectionBadge('annexures')}
        </div>
      ),
      children: (
        <div>
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={annexures}
            columns={[
              {
                title: 'Sr.',
                dataIndex: 'serialNo',
                width: 48,
                render: (val, _, idx) => val || idx + 1,
              },
              {
                title: 'Particulars',
                dataIndex: 'particulars',
                render: (val, _, idx) => (
                  <TextArea
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    value={val}
                    onChange={(e) => {
                      const next = [...annexures];
                      next[idx] = { ...next[idx], particulars: e.target.value };
                      setFormData((p) => ({ ...p, annexures: next }));
                    }}
                  />
                ),
              },
              {
                title: 'Page',
                dataIndex: 'pageNo',
                width: 72,
                render: (val, _, idx) => (
                  <Input
                    value={val}
                    placeholder="1-5"
                    onChange={(e) => {
                      const next = [...annexures];
                      next[idx] = { ...next[idx], pageNo: e.target.value };
                      setFormData((p) => ({ ...p, annexures: next }));
                    }}
                  />
                ),
              },
              {
                title: '',
                width: 90,
                render: (_, __, idx) => (
                  <Space size={2}>
                    <Button size="small" icon={<ArrowUp size={12} />} disabled={idx === 0} onClick={() => moveAnnexure(idx, -1)} />
                    <Button size="small" icon={<ArrowDown size={12} />} disabled={idx === annexures.length - 1} onClick={() => moveAnnexure(idx, 1)} />
                    <Button
                      size="small"
                      danger
                      icon={<Trash2 size={12} />}
                      disabled={annexures.length <= 1}
                      onClick={() => {
                        const filtered = annexures
                          .filter((_, i) => i !== idx)
                          .map((a, i) => ({ ...a, serialNo: String(i + 1) }));
                        setFormData((p) => ({ ...p, annexures: filtered }));
                      }}
                    />
                  </Space>
                ),
              },
            ]}
          />
          <Button
            type="dashed"
            icon={<Plus size={14} />}
            style={{ marginTop: 10, width: '100%' }}
            onClick={() =>
              setFormData((p) => ({
                ...p,
                annexures: [
                  ...p.annexures,
                  {
                    id: `annex-${Date.now()}`,
                    serialNo: String(p.annexures.length + 1),
                    annexureName: '',
                    particulars: '',
                    pageNo: '',
                  },
                ],
              }))
            }
          >
            Add Document / Annexure
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top Action Header */}
      <Card bordered={false} style={{ borderRadius: 12, borderTop: `3px solid ${accent}` }} styles={{ body: { padding: '14px 18px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space align="center" size={10}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eef2ff', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={20} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0 }}>Surfacy Case Filing</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                SARFAESI Section 14 Application, Affidavit, Vakalatnama &amp; Index Builder
              </Text>
            </div>
          </Space>

          <Space wrap>
            <Button icon={<Plus size={14} />} onClick={handleNewCase}>New Case</Button>
            <Button icon={<FolderOpen size={14} />} onClick={() => setCaseListOpen(true)}>Saved Cases</Button>
            <Button icon={<Save size={14} />} loading={saving} onClick={() => handleSaveCase()}>Save Draft</Button>
            <Button type="primary" icon={<FileText size={14} />} loading={downloadingDocx} onClick={handleDownloadDocx}>
              Download DOCX
            </Button>
            <Button
              icon={<FileDown size={14} />}
              loading={downloadingPdf}
              onClick={handleDownloadPdf}
              title={pdfConverterAvailable ? 'Convert finalized DOCX to PDF' : 'Requires LibreOffice on server (or use Print in Preview)'}
            >
              Download PDF
            </Button>
          </Space>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <Row gutter={[12, 10]} align="middle">
          <Col xs={24} md={7}>
            <Text style={{ fontSize: 11.5, color: '#64748b' }}>Case Title</Text>
            <Input
              value={caseTitle}
              onChange={(e) => setCaseTitle(e.target.value)}
              placeholder="Auto-generated from Opponent & Court if blank"
            />
          </Col>
          <Col xs={24} md={8}>
            <Text style={{ fontSize: 11.5, color: '#64748b' }}>Document Template</Text>
            <Select
              style={{ width: '100%' }}
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              options={templates.map((t) => ({ value: t.id, label: `${t.name} (v${t.version})` }))}
            />
          </Col>
          <Col xs={12} md={4}>
            <Text style={{ fontSize: 11.5, color: '#64748b' }}>Case Status</Text>
            <Select
              style={{ width: '100%' }}
              value={status}
              onChange={setStatus}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'READY_FOR_REVIEW', label: 'Ready for Review' },
                { value: 'FINALIZED', label: 'Finalized', disabled: !humanVerified },
              ]}
            />
          </Col>
          <Col xs={12} md={5}>
            <div style={{ paddingTop: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Checkbox checked={humanVerified} onChange={(e) => setHumanVerified(e.target.checked)}>
                <Text style={{ fontSize: 12, fontWeight: 600 }}>Advocate Verified</Text>
              </Checkbox>
              <span
                onClick={() => verificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                style={{ cursor: 'pointer', display: 'inline-flex', gap: 4 }}
                title="Click to jump to Verification & Discrepancy Checks"
              >
                {validation.errors.length > 0 && <Tag color="error" style={{ margin: 0 }}>{validation.errors.length} Missing</Tag>}
                {validation.warnings.length > 0 && <Tag color="warning" style={{ margin: 0 }}>{validation.warnings.length} Warnings</Tag>}
                {validation.errors.length === 0 && validation.warnings.length === 0 && <Tag color="success" style={{ margin: 0 }}>Ready</Tag>}
              </span>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Two-Panel Workspace */}
      <Row gutter={[14, 14]} align="stretch">
        <Col xs={24} lg={11}>
          <div style={{ maxHeight: '78vh', overflowY: 'auto', paddingRight: 4 }}>
            <Collapse
              activeKey={activePanels}
              onChange={setActivePanels}
              items={collapseItems}
              style={{ background: '#ffffff', borderRadius: 12 }}
            />
          </div>
        </Col>

        <Col xs={24} lg={13}>
          <div style={{ height: '78vh' }}>
            <SurfacyPreviewPane
              docxBuffer={previewBuffer}
              loading={previewLoading}
              formData={formData}
              onRefresh={() => refreshPreview(formData, activeTemplate?.fileName)}
            />
          </div>
        </Col>
      </Row>

      {/* Legal Disclaimer & Verification Warnings (below workspace) */}
      <div ref={verificationRef}>
        <Alert
          type={validation.warnings.length > 0 ? 'warning' : 'info'}
          showIcon
          icon={validation.warnings.length > 0 ? <AlertTriangle size={18} /> : <ShieldAlert size={18} />}
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span>
                <strong>Advocate Verification Required:</strong> Generated documents preserve statutory text and require review by the responsible advocate before filing.
              </span>
              <Space size={6}>
                {validation.errors.length > 0 && <Tag color="error">{validation.errors.length} Missing Field(s)</Tag>}
                {validation.warnings.length > 0 && <Tag color="warning">{validation.warnings.length} Discrepancy Warning(s)</Tag>}
                {validation.errors.length === 0 && validation.warnings.length === 0 && <Tag color="success">All Checks Passed</Tag>}
              </Space>
            </div>
          }
          description={
            (validation.warnings.length > 0 || validation.errors.length > 0) && (
              <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: 12 }}>
                {validation.warnings.map((w, i) => (
                  <li key={`w-${i}`} style={{ color: '#b45309' }}><strong>[Discrepancy]</strong> {w.message}</li>
                ))}
                {validation.errors.slice(0, 6).map((e, i) => (
                  <li key={`e-${i}`} style={{ color: '#b91c1c' }}><strong>[Missing]</strong> {e.message}</li>
                ))}
                {validation.errors.length > 6 && (
                  <li style={{ color: '#b91c1c' }}>...and {validation.errors.length - 6} more missing required fields.</li>
                )}
              </ul>
            )
          }
        />
      </div>

      <SurfacyCaseListModal
        open={caseListOpen}
        onClose={() => setCaseListOpen(false)}
        onSelectCase={handleLoadCase}
        onCreateNew={handleNewCase}
      />
    </div>
  );
}

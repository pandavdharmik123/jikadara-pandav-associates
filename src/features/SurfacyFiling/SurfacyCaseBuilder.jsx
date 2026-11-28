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
  Modal,
  Popconfirm,
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
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Edit,
  FileText,
  FolderOpen,
  Landmark,
  Plus,
  RefreshCw,
  Save,
  Scale,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  fetchSurfacyTemplates,
  fetchSurfacyCases,
  fetchSurfacyCase,
  createSurfacyCase,
  updateSurfacyCase,
  duplicateSurfacyCase,
  deleteSurfacyCase,
  generatePreviewDocxBlob,
  downloadSurfacyDocx,
} from './surfacyApi';
import {
  buildDefaultPropertyDescription,
  validateSurfacyFormData,
} from './surfacyValidation';
import SurfacyPreviewPane from './components/SurfacyPreviewPane';
import SurfacyCaseListModal from './components/SurfacyCaseListModal';
import './surfacy.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

function Field({ label, required, children }) {
  return (
    <div className="surfacy-field">
      <span className="surfacy-field-label" title={label}>
        <span>{label}</span>
        {required && <span className="req">*</span>}
      </span>
      {children}
    </div>
  );
}

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

  const [mode, setMode] = useState('list'); // 'list' | 'builder'
  const [casesList, setCasesList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [listStatus, setListStatus] = useState('ALL');

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [pdfConverterAvailable, setPdfConverterAvailable] = useState(false);

  const [activeCaseId, setActiveCaseId] = useState(null);
  const [caseTitle, setCaseTitle] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [humanVerified, setHumanVerified] = useState(false);
  const [formData, setFormData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const [saving, setSaving] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewBuffer, setPreviewBuffer] = useState(null);
  const [caseListOpen, setCaseListOpen] = useState(false);
  const [activePanels, setActivePanels] = useState(['court', 'applicant', 'opponents']);

  const previewTimerRef = useRef(null);
  const verificationRef = useRef(null);
  const skipNextDirtyRef = useRef(true);

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
        message.error('Failed to initialize SARFAESI Case Filing builder');
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [refreshPreview]);

  const loadCasesList = useCallback(async () => {
    setListLoading(true);
    try {
      const params = {};
      if (listSearch.trim()) params.search = listSearch.trim();
      if (listStatus !== 'ALL') params.status = listStatus;
      const res = await fetchSurfacyCases(params);
      setCasesList(res.cases || []);
    } catch {
      message.error('Failed to load saved SARFAESI filings');
    } finally {
      setListLoading(false);
    }
  }, [listSearch, listStatus]);

  useEffect(() => {
    if (mode === 'list') loadCasesList();
  }, [mode, loadCasesList]);

  useEffect(() => {
    if (mode !== 'builder' || !formData) return;
    if (skipNextDirtyRef.current) {
      skipNextDirtyRef.current = false;
      return;
    }
    setIsDirty(true);
  }, [formData, mode]);

  // Debounced live preview update whenever formData changes in builder mode
  useEffect(() => {
    if (mode !== 'builder' || !formData) return undefined;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      refreshPreview(formData, activeTemplate?.fileName);
    }, 650);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [mode, formData, activeTemplate?.fileName, refreshPreview]);

  const updateFormDataDirty = (updater) => {
    setIsDirty(true);
    setFormData(updater);
  };

  const updateSection = (sectionKey, patch) => {
    setIsDirty(true);
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

  const handleBackToList = () => {
    if (!isDirty) {
      setMode('list');
      return;
    }
    Modal.confirm({
      title: 'Unsaved Changes',
      content: 'If you go back, any unsaved changes will be lost. Do you really want to go back?',
      okText: 'Yes, Go Back',
      cancelText: 'Stay',
      okButtonProps: { danger: true },
      onOk: () => {
        setIsDirty(false);
        setMode('list');
      },
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
      skipNextDirtyRef.current = true;
      setIsDirty(false);
      setActivePanels(['court', 'applicant', 'opponents']);
      setMode('builder');
      refreshPreview(res.defaultFormData, activeTemplate?.fileName);
    } catch {
      message.error('Failed to initialize new SARFAESI Case Filing');
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
      skipNextDirtyRef.current = true;
      setIsDirty(false);
      setActivePanels(['court', 'applicant', 'opponents']);
      setMode('builder');
      refreshPreview(f.formData, f.template?.fileName);
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
      setIsDirty(false);
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
        Loading SARFAESI Case Filing Builder...
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
        <Row gutter={[12, 10]}>
          <Col xs={24} sm={12}>
            <Field label="Court Name" required>
              <Input
                value={formData.court.courtName}
                onChange={(e) => updateSection('court', { courtName: e.target.value })}
                placeholder="ADDL. CHIEF JUDICIAL MAGISTRATE"
              />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Court Location" required>
              <Input
                value={formData.court.courtLocation}
                onChange={(e) => updateSection('court', { courtLocation: e.target.value })}
                placeholder="e.g. NAVSARI"
              />
            </Field>
          </Col>
          <Col xs={12} sm={12}>
            <Field label="Application Number">
              <Input
                value={formData.court.applicationNumber}
                onChange={(e) => updateSection('court', { applicationNumber: e.target.value })}
                placeholder="Leave blank if unnumbered"
              />
            </Field>
          </Col>
          <Col xs={12} sm={12}>
            <Field label="Application Year" required>
              <Input
                value={formData.court.applicationYear}
                onChange={(e) => updateSection('court', { applicationYear: e.target.value })}
                placeholder="2026"
              />
            </Field>
          </Col>
          <Col xs={12} sm={12}>
            <Field label="Filing Date">
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                value={toDatePickerVal(formData.court.filingDate)}
                onChange={(d) => updateSection('court', { filingDate: fromDatePickerVal(d) })}
              />
            </Field>
          </Col>
          <Col xs={12} sm={12}>
            <Field label="District" required>
              <Input
                value={formData.court.district}
                onChange={(e) => updateSection('court', { district: e.target.value })}
                placeholder="e.g. Navsari"
              />
            </Field>
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
              className="surfacy-subcard"
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
              <Row gutter={[12, 10]}>
                <Col xs={24}>
                  <div className="surfacy-subhead" style={{ marginTop: 0 }}>Basic Loan Details</div>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Loan Account Number" required>
                    <Input
                      value={loan.loanAccountNo}
                      placeholder="e.g. 251216205171752"
                      onChange={(e) => {
                        const next = [...loans];
                        next[idx] = { ...next[idx], loanAccountNo: e.target.value };
                        setFormData((p) => ({ ...p, loans: next }));
                      }}
                    />
                  </Field>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Loan Type" required>
                    <Input
                      value={loan.loanType}
                      onChange={(e) => {
                        const next = [...loans];
                        next[idx] = { ...next[idx], loanType: e.target.value };
                        setFormData((p) => ({ ...p, loans: next }));
                      }}
                      placeholder="Housing Loan"
                    />
                  </Field>
                </Col>

                <Col xs={24}>
                  <div className="surfacy-subhead">Application &amp; Sanction</div>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Application Date">
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
                  </Field>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Sanction Date" required>
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
                  </Field>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Sanctioned Amount (₹)" required>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      placeholder="e.g. 942000"
                      value={loan.sanctionedAmount ? Number(loan.sanctionedAmount) : null}
                      onChange={(val) => {
                        const next = [...loans];
                        next[idx] = { ...next[idx], sanctionedAmount: val !== null ? String(val) : '' };
                        setFormData((p) => ({ ...p, loans: next }));
                      }}
                    />
                  </Field>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Loan Agreement Date">
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
                  </Field>
                </Col>

                <Col xs={24}>
                  <div className="surfacy-subhead">Mortgage Registration</div>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Deposit of Title Deeds Date">
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
                  </Field>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Sub-Registrar Office">
                    <Input
                      value={loan.mortgageSubRegistrar}
                      onChange={(e) => {
                        const next = [...loans];
                        next[idx] = { ...next[idx], mortgageSubRegistrar: e.target.value };
                        setFormData((p) => ({ ...p, loans: next }));
                      }}
                      placeholder="e.g. Jalalpor"
                    />
                  </Field>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Mortgage Reg. Serial No.">
                    <Input
                      value={loan.mortgageSerialNo}
                      onChange={(e) => {
                        const next = [...loans];
                        next[idx] = { ...next[idx], mortgageSerialNo: e.target.value };
                        setFormData((p) => ({ ...p, loans: next }));
                      }}
                      placeholder="e.g. 7212/2025"
                    />
                  </Field>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Mortgage Reg. Date">
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
                  </Field>
                </Col>

                <Col xs={24}>
                  <div className="surfacy-subhead">Current Liability</div>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Liability As On Date">
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
                  </Field>
                </Col>
                <Col xs={24} sm={12}>
                  <Field label="Outstanding Amount (₹)" required>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      placeholder="e.g. 968990"
                      value={loan.outstandingAmount ? Number(loan.outstandingAmount) : null}
                      onChange={(val) => {
                        const next = [...loans];
                        next[idx] = { ...next[idx], outstandingAmount: val !== null ? String(val) : '' };
                        setFormData((p) => ({ ...p, loans: next }));
                      }}
                    />
                  </Field>
                </Col>
                <Col xs={24}>
                  <Field label="Interest Details">
                    <Input
                      value={loan.interestDetails}
                      placeholder="Rate of interest / remarks (optional)"
                      onChange={(e) => {
                        const next = [...loans];
                        next[idx] = { ...next[idx], interestDetails: e.target.value };
                        setFormData((p) => ({ ...p, loans: next }));
                      }}
                    />
                  </Field>
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
        <Row gutter={[12, 10]}>
          <Col xs={24}>
            <div className="surfacy-subhead" style={{ marginTop: 0 }}>Unit &amp; Building Details</div>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Flat / House No.">
              <Input value={formData.property.flatHouseNo} placeholder="e.g. Flat No-303" onChange={(e) => updateSection('property', { flatHouseNo: e.target.value })} />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Floor Number">
              <Input value={formData.property.floorNumber} placeholder="e.g. 3rd Floor" onChange={(e) => updateSection('property', { floorNumber: e.target.value })} />
            </Field>
          </Col>
          <Col xs={14} sm={12}>
            <Field label="Built-up Area">
              <Input value={formData.property.builtUpArea} placeholder="e.g. 559.52" onChange={(e) => updateSection('property', { builtUpArea: e.target.value })} />
            </Field>
          </Col>
          <Col xs={10} sm={12}>
            <Field label="Area Unit">
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
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="New Property No.">
              <Input value={formData.property.newPropertyNo} placeholder="e.g. 2248" onChange={(e) => updateSection('property', { newPropertyNo: e.target.value })} />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Old Property No.">
              <Input value={formData.property.oldPropertyNo} placeholder="e.g. 1885" onChange={(e) => updateSection('property', { oldPropertyNo: e.target.value })} />
            </Field>
          </Col>
          <Col xs={24}>
            <Field label="Building / Complex Name">
              <Input value={formData.property.buildingName} placeholder="e.g. L.D. Complex" onChange={(e) => updateSection('property', { buildingName: e.target.value })} />
            </Field>
          </Col>

          <Col xs={24}>
            <div className="surfacy-subhead">Land &amp; Survey Details</div>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Plot No.">
              <Input value={formData.property.plotNo} placeholder="e.g. Plot No-2" onChange={(e) => updateSection('property', { plotNo: e.target.value })} />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Plot Area">
              <Input value={formData.property.plotArea} placeholder="e.g. 3600.00 Sq.ft" onChange={(e) => updateSection('property', { plotArea: e.target.value })} />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Block / Revenue Survey No.">
              <Input value={formData.property.blockSurveyNo} placeholder="e.g. 382+383/2 Paikee" onChange={(e) => updateSection('property', { blockSurveyNo: e.target.value })} />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="New Survey No. (After Promulgation)">
              <Input value={formData.property.newSurveyNo} placeholder="e.g. 1005" onChange={(e) => updateSection('property', { newSurveyNo: e.target.value })} />
            </Field>
          </Col>

          <Col xs={24}>
            <div className="surfacy-subhead">Location</div>
          </Col>
          <Col xs={24} sm={8}>
            <Field label="Village / Moje">
              <Input value={formData.property.villageMoje} placeholder="e.g. Eru" onChange={(e) => updateSection('property', { villageMoje: e.target.value })} />
            </Field>
          </Col>
          <Col xs={24} sm={8}>
            <Field label="Taluka / Sub-District">
              <Input value={formData.property.talukaSubDistrict} placeholder="e.g. Jalalpore" onChange={(e) => updateSection('property', { talukaSubDistrict: e.target.value })} />
            </Field>
          </Col>
          <Col xs={24} sm={8}>
            <Field label="District">
              <Input value={formData.property.district} placeholder="e.g. Navsari" onChange={(e) => updateSection('property', { district: e.target.value })} />
            </Field>
          </Col>

          <Col xs={24}>
            <div className="surfacy-subhead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                Complete Legal Property Description <span style={{ color: '#dc2626' }}>*</span>
              </span>
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
            <div className="surfacy-subhead">Property Boundaries (Application, Prayer &amp; Affidavit)</div>
          </Col>
          {['north', 'south', 'east', 'west'].map((dir) => (
            <Col xs={12} key={dir}>
              <Field label={dir.charAt(0).toUpperCase() + dir.slice(1)} required>
                <Input
                  value={formData.property.boundaries?.[dir]}
                  placeholder={`e.g. ${dir === 'east' ? 'Road' : 'Adj. Property'}`}
                  onChange={(e) =>
                    updateSection('property', {
                      boundaries: { ...(formData.property.boundaries || {}), [dir]: e.target.value },
                    })
                  }
                />
              </Field>
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
        <Row gutter={[12, 10]}>
          <Col xs={24} sm={12}>
            <Field label="NPA Classification Date" required>
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                value={toDatePickerVal(formData.proceedings.npaDate)}
                onChange={(d) => updateSection('proceedings', { npaDate: fromDatePickerVal(d) })}
              />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Demand Notice Date (u/s 13(2))" required>
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                value={toDatePickerVal(formData.proceedings.demandNoticeDate)}
                onChange={(d) => updateSection('proceedings', { demandNoticeDate: fromDatePickerVal(d) })}
              />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Demand Notice Amount (₹)" required>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                value={formData.proceedings.demandNoticeAmount ? Number(formData.proceedings.demandNoticeAmount) : null}
                onChange={(val) => updateSection('proceedings', { demandNoticeAmount: val !== null ? String(val) : '' })}
              />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Notice Service Date">
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                value={toDatePickerVal(formData.proceedings.demandNoticeServiceDate)}
                onChange={(d) => updateSection('proceedings', { demandNoticeServiceDate: fromDatePickerVal(d) })}
              />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Statutory Notice Period">
              <Input
                value={formData.proceedings.statutoryNoticePeriod}
                onChange={(e) => updateSection('proceedings', { statutoryNoticePeriod: e.target.value })}
              />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Symbolic Possession Date" required>
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                value={toDatePickerVal(formData.proceedings.symbolicPossessionDate)}
                onChange={(d) => updateSection('proceedings', { symbolicPossessionDate: fromDatePickerVal(d) })}
              />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Newspaper Publication Details">
              <Input
                value={formData.proceedings.newspaperPublicationDetails}
                onChange={(e) => updateSection('proceedings', { newspaperPublicationDetails: e.target.value })}
              />
            </Field>
          </Col>
          <Col xs={24} sm={12}>
            <Field label="Police Station Details">
              <Input
                value={formData.proceedings.policeStationDetails}
                onChange={(e) => updateSection('proceedings', { policeStationDetails: e.target.value })}
              />
            </Field>
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
          <Row gutter={[12, 10]}>
            <Col xs={24}>
              <Field label="Authorized Officer Name">
                <Input
                  value={formData.affidavit.deponentName}
                  onChange={(e) => updateSection('affidavit', { deponentName: e.target.value })}
                />
              </Field>
            </Col>
            <Col xs={12}>
              <Field label="Age">
                <Input value={formData.affidavit.age} onChange={(e) => updateSection('affidavit', { age: e.target.value })} />
              </Field>
            </Col>
            <Col xs={12}>
              <Field label="Occupation">
                <Input value={formData.affidavit.occupation} onChange={(e) => updateSection('affidavit', { occupation: e.target.value })} />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Total Claim (₹)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  value={formData.affidavit.totalOutstandingClaim ? Number(formData.affidavit.totalOutstandingClaim) : null}
                  onChange={(val) => updateSection('affidavit', { totalOutstandingClaim: val !== null ? String(val) : '' })}
                />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Affidavit NPA Date">
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  value={toDatePickerVal(formData.affidavit.npaDate)}
                  onChange={(d) => updateSection('affidavit', { npaDate: fromDatePickerVal(d) })}
                />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Affidavit Demand Date">
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  value={toDatePickerVal(formData.affidavit.demandNoticeDate)}
                  onChange={(d) => updateSection('affidavit', { demandNoticeDate: fromDatePickerVal(d) })}
                />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Execution Date">
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                  value={toDatePickerVal(formData.affidavit.executionDate)}
                  onChange={(d) => updateSection('affidavit', { executionDate: fromDatePickerVal(d) })}
                />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Execution Place">
                <Input
                  value={formData.affidavit.executionPlace}
                  onChange={(e) => updateSection('affidavit', { executionPlace: e.target.value })}
                />
              </Field>
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

  if (mode === 'list') {
    const STATUS_META = {
      DRAFT: { label: 'Draft', color: 'default' },
      READY_FOR_REVIEW: { label: 'Ready for Review', color: 'processing' },
      FINALIZED: { label: 'Finalized', color: 'success' },
    };

    const listColumns = [
      {
        title: 'Case Title',
        dataIndex: 'caseTitle',
        key: 'caseTitle',
        render: (val, record) => (
          <div>
            <Text strong style={{ color: '#0f172a' }}>{val}</Text>
            {record.applicationNumber && (
              <div style={{ fontSize: 12, color: '#64748b' }}>App No: {record.applicationNumber}</div>
            )}
          </div>
        ),
      },
      { title: 'Applicant', dataIndex: 'applicantName', key: 'applicantName', render: (v) => v || '—' },
      { title: 'Opponent', dataIndex: 'opponentName', key: 'opponentName', render: (v) => v || '—' },
      { title: 'Court', dataIndex: 'courtName', key: 'courtName', render: (v) => v || '—' },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (s) => {
          const meta = STATUS_META[s] || STATUS_META.DRAFT;
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: 'Last Updated',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        render: (d) => dayjs(d).format('DD/MM/YYYY HH:mm'),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 190,
        render: (_, record) => (
          <Space size={4}>
            <Button size="small" type="primary" icon={<Edit size={13} />} onClick={() => handleLoadCase(record.id)}>
              Edit
            </Button>
            <Button
              size="small"
              icon={<Copy size={13} />}
              title="Duplicate Case"
              onClick={async () => {
                try {
                  await duplicateSurfacyCase(record.id);
                  message.success('Case duplicated as Draft');
                  loadCasesList();
                } catch {
                  message.error('Failed to duplicate case');
                }
              }}
            />
            <Button
              size="small"
              icon={<FileText size={13} />}
              title="Download DOCX"
              onClick={() => downloadSurfacyDocx(record.id, record.caseTitle)}
            />
            <Popconfirm
              title="Delete this filing?"
              description="This case will be removed from your active SARFAESI filings."
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await deleteSurfacyCase(record.id);
                  message.success('Case deleted');
                  loadCasesList();
                } catch {
                  message.error('Failed to delete case');
                }
              }}
            >
              <Button size="small" danger icon={<Trash2 size={13} />} title="Delete Case" />
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <div className="surfacy-builder">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Scale size={20} color="#fff" />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontWeight: 700 }}>SARFAESI Case Filing</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>Saved Section 14 Applications, Affidavits &amp; Vakalatnamas</Text>
            </div>
          </div>

          <Button type="primary" icon={<Plus size={15} />} onClick={handleNewCase}>
            Add New SARFAESI Case
          </Button>
        </div>

        <Card bordered={false} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
          <div style={{ display: 'flex', gap: 10, padding: '14px 16px', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9' }}>
            <Input
              placeholder="Search case title, applicant, opponent, court, application no..."
              prefix={<Search size={14} style={{ color: '#94a3b8' }} />}
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              style={{ flex: 1, minWidth: 240 }}
              allowClear
            />
            <Select
              value={listStatus}
              onChange={setListStatus}
              style={{ width: 180 }}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'READY_FOR_REVIEW', label: 'Ready for Review' },
                { value: 'FINALIZED', label: 'Finalized' },
              ]}
            />
            <Button icon={<RefreshCw size={14} />} onClick={loadCasesList} loading={listLoading}>Refresh</Button>
          </div>

          <Table
            className="modern-dashboard-table"
            rowKey="id"
            loading={listLoading}
            dataSource={casesList}
            columns={listColumns}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="surfacy-builder">
      {/* Page Header (matches other tools pages — no card box) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button icon={<ArrowLeft size={15} />} onClick={handleBackToList} />
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Scale size={20} color="#fff" />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              SARFAESI Case Filing
            </Title>
            {caseTitle ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Tag color="purple" style={{ fontSize: 11, margin: 0, padding: '0 6px' }}>
                  {caseTitle}
                </Tag>
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                SARFAESI Section 14 Application, Affidavit, Vakalatnama &amp; Index Builder
              </Text>
            )}
          </div>
        </div>

        <Space size={8} wrap>
          <Button icon={<Save size={14} style={{ color: accent }} />} loading={saving} onClick={() => handleSaveCase()}>
            Save Draft
          </Button>
          <Button type="primary" icon={<FileText size={14} />} loading={downloadingDocx} onClick={handleDownloadDocx}>
            Download DOCX
          </Button>
        </Space>
      </div>

      {/* Compact Case Metadata Strip */}
      <Row gutter={[12, 8]} align="bottom" style={{ paddingBottom: 4 }}>
        <Col xs={24} md={7}>
          <Field label="Case Title">
            <Input
              value={caseTitle}
              onChange={(e) => { setIsDirty(true); setCaseTitle(e.target.value); }}
              placeholder="Auto-generated from Opponent & Court"
            />
          </Field>
        </Col>
        <Col xs={24} md={8}>
          <Field label="Document Template">
            <Select
              style={{ width: '100%' }}
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              options={templates.map((t) => ({ value: t.id, label: `${t.name} (v${t.version})` }))}
            />
          </Field>
        </Col>
        <Col xs={12} md={4}>
          <Field label="Case Status">
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
          </Field>
        </Col>
        <Col xs={12} md={5}>
          <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Checkbox checked={humanVerified} onChange={(e) => setHumanVerified(e.target.checked)}>
              <Text style={{ fontSize: 12, fontWeight: 600 }}>Advocate Verified</Text>
            </Checkbox>
            <span style={{ display: 'inline-flex', gap: 4 }}>
              {validation.errors.length > 0 && <Tag color="error" style={{ margin: 0 }}>{validation.errors.length} Missing</Tag>}
              {validation.warnings.length > 0 && <Tag color="warning" style={{ margin: 0 }}>{validation.warnings.length} Warnings</Tag>}
              {validation.errors.length === 0 && validation.warnings.length === 0 && <Tag color="success" style={{ margin: 0 }}>Ready</Tag>}
            </span>
          </div>
        </Col>
      </Row>

      {/* Two-Panel Workspace */}
      <Row gutter={[16, 16]} className="surfacy-workspace-row">
        <Col xs={24} lg={11}>
          <div className="surfacy-form-pane">
            <Collapse
              className="surfacy-collapse"
              activeKey={activePanels}
              onChange={setActivePanels}
              items={collapseItems}
            />
          </div>
        </Col>

        <Col xs={24} lg={13}>
          <div className="surfacy-preview-pane">
            <SurfacyPreviewPane
              docxBuffer={previewBuffer}
              loading={previewLoading}
              formData={formData}
              onRefresh={() => refreshPreview(formData, activeTemplate?.fileName)}
            />
          </div>
        </Col>
      </Row>

      <SurfacyCaseListModal
        open={caseListOpen}
        onClose={() => setCaseListOpen(false)}
        onSelectCase={handleLoadCase}
        onCreateNew={handleNewCase}
      />
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
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
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Copy,
  Edit,
  FileDown,
  FileText,
  FolderOpen,
  Landmark,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import useAuthStore from '../../store/authStore';
import {
  fetchMoeTemplates,
  fetchMoeDocuments,
  fetchMoeDocument,
  createMoeDocument,
  updateMoeDocument,
  duplicateMoeDocument,
  deleteMoeDocument,
  generateMoePreviewDocxBlob,
  downloadMoeDocx,
  downloadMoePdf,
} from './moeApi';
import {
  buildMoePropertyDescription,
  buildTitleDocumentDescription,
  formatIndianAmount,
  numberToIndianRupeesWords,
  validateMoeFormData,
} from './utils/moeHelpers';
import MoePreviewPane from './components/MoePreviewPane';
import MoeSavedDrawer from './components/MoeSavedDrawer';
import MoeTemplateManagerModal from './components/MoeTemplateManagerModal';
import './moe.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SECTIONS = [
  { id: 'schedule1', num: 1, title: 'Schedule I – Deposit & Bank' },
  { id: 'schedule2', num: 2, title: 'Schedule II – Security Provider' },
  { id: 'schedule3', num: 3, title: 'Schedule III – Borrower & Facilities' },
  { id: 'schedule4', num: 4, title: 'Schedule IV – Title Documents' },
  { id: 'schedule5', num: 5, title: 'Schedule V – Property Details' },
  { id: 'schedule6', num: 6, title: 'Schedule VI – Existing Charges' },
  { id: 'clauses', num: 7, title: 'Legal Declarations & Clauses' },
  { id: 'execution', num: 8, title: 'Signatures & Execution' },
];

const CONDITIONAL_CLAUSES_META = [
  {
    id: 'sec180_companies_act',
    title: 'Section 180(1)(a) Companies Act, 2013 Resolution',
    clauseRef: 'Main Memorandum – Paragraph P[36]',
    condition: 'Applicable when Security Provider is a Company under the Companies Act, 2013.',
  },
  {
    id: 'sec281_income_tax',
    title: 'Section 281 Income-Tax Permission / Clearance',
    clauseRef: 'Schedule III – Authorizations & Clearances',
    condition: 'Applicable when Section 281 Income-tax permission / NOC is required or obtained.',
  },
  {
    id: 'authorized_person_deposit',
    title: 'Authorized Person / POA Deposit Declaration',
    clauseRef: 'Main Memorandum & Schedule II (Sr. No. 2 & 3)',
    condition: 'Applicable when title deeds are deposited by an authorized representative / POA holder.',
  },
];

function Field({ label, required, children }) {
  return (
    <div className="moe-field">
      <span className="moe-field-label" title={label}>
        <span>{label}</span>
        {required && <span className="req">*</span>}
      </span>
      {children}
    </div>
  );
}

function ImageUploadSlot({ label, value, onChange }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.error('Please upload a PNG or JPG image');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ''));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="moe-image-upload-box">
      <Text style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>{label}</Text>
      {value ? (
        <>
          <img src={value} alt={label} className="moe-image-preview" />
          <Space size={6}>
            <Button size="small" onClick={() => inputRef.current?.click()}>Replace</Button>
            <Button size="small" danger icon={<X size={12} />} onClick={() => onChange('')} />
          </Space>
        </>
      ) : (
        <Button size="small" icon={<Upload size={13} />} onClick={() => inputRef.current?.click()}>
          Upload Image
        </Button>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

function toDateVal(str) {
  if (!str) return null;
  const d = dayjs(str);
  return d.isValid() ? d : null;
}

function fromDateVal(d) {
  return d && dayjs(d).isValid() ? dayjs(d).format('YYYY-MM-DD') : '';
}

export default function MortgageFilingPage({ currentAccentColor }) {
  const accent = currentAccentColor || '#4f46e5';
  const { user } = useAuthStore();
  const canManageTemplates = ['ADMIN', 'SENIOR'].includes(user?.role);

  const [mode, setMode] = useState('dashboard'); // 'dashboard' (saved list) | 'builder'
  const [savedDocs, setSavedDocs] = useState([]);
  const [listSearch, setListSearch] = useState('');
  const [listStatus, setListStatus] = useState('ALL');
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [defaultFormData, setDefaultFormData] = useState(null);

  const [activeDocId, setActiveDocId] = useState(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [humanVerified, setHumanVerified] = useState(false);
  const [formData, setFormData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const [activePanels, setActivePanels] = useState(['schedule1']);
  const [saving, setSaving] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewBuffer, setPreviewBuffer] = useState(null);

  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const previewTimerRef = useRef(null);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || templates[0] || null,
    [templates, selectedTemplateId]
  );

  const validation = useMemo(
    () => (formData ? validateMoeFormData(formData) : { isValid: false, errors: [], warnings: [], sectionCounts: {} }),
    [formData]
  );

  const totalFacilityAmount = useMemo(() => {
    if (!formData?.schedule3?.facilities) return 0;
    return formData.schedule3.facilities.reduce(
      (sum, f) => sum + (Number(String(f.facilityAmount || 0).replace(/[^0-9.-]/g, '')) || 0),
      0
    );
  }, [formData?.schedule3?.facilities]);

  const loadDashboardAndTemplates = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const params = {};
      if (listSearch.trim()) params.search = listSearch.trim();
      if (listStatus !== 'ALL') params.status = listStatus;
      const [docsRes, tplRes] = await Promise.all([fetchMoeDocuments(params), fetchMoeTemplates()]);
      setSavedDocs(docsRes.documents || []);
      const tpls = tplRes.templates || [];
      setTemplates(tpls);
      if (tpls[0]) setSelectedTemplateId((prev) => prev || tpls[0].id);
      if (tplRes.defaultFormData) setDefaultFormData(tplRes.defaultFormData);
    } catch {
      message.error('Failed to load Mortgage Filing data');
    } finally {
      setDashboardLoading(false);
    }
  }, [listSearch, listStatus]);

  useEffect(() => {
    loadDashboardAndTemplates();
  }, [loadDashboardAndTemplates]);

  const refreshPreview = useCallback(async (dataToRender, tplFile) => {
    if (!dataToRender) return;
    setPreviewLoading(true);
    try {
      const buf = await generateMoePreviewDocxBlob(dataToRender, tplFile);
      setPreviewBuffer(buf);
    } catch (err) {
      console.error('MOE preview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

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

  const confirmDiscardIfDirty = (action) => {
    if (!isDirty) {
      action();
      return;
    }
    Modal.confirm({
      title: 'Unsaved Changes',
      content: 'You have unsaved changes in the current MOE document. Continue without saving?',
      okText: 'Discard & Continue',
      okButtonProps: { danger: true },
      onOk: action,
    });
  };

  const handleCreateNewMoe = () => {
    confirmDiscardIfDirty(() => {
      const fresh = JSON.parse(JSON.stringify(defaultFormData || {}));
      setActiveDocId(null);
      setDocumentTitle('');
      setStatus('DRAFT');
      setHumanVerified(false);
      setFormData(fresh);
      setIsDirty(false);
      setActivePanels(['schedule1']);
      setMode('builder');
      refreshPreview(fresh, activeTemplate?.fileName);
    });
  };

  const handleOpenDoc = async (id) => {
    try {
      const res = await fetchMoeDocument(id);
      const d = res.document;
      setActiveDocId(d.id);
      setSelectedTemplateId(d.templateId);
      setDocumentTitle(d.documentTitle || '');
      setStatus(d.status || 'DRAFT');
      setHumanVerified(Boolean(d.humanVerified));
      setFormData(d.formData);
      setIsDirty(false);
      setActivePanels(['schedule1']);
      setMode('builder');
      refreshPreview(d.formData, d.template?.fileName);
    } catch {
      message.error('Failed to open MOE document');
    }
  };

  const handleSave = async (overrideStatus) => {
    if (!formData) return null;
    const targetStatus = overrideStatus || status;
    if (targetStatus === 'FINALIZED' && !humanVerified) {
      message.warning('Please confirm Advocate Verification before marking as Finalized.');
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        templateId: selectedTemplateId,
        documentTitle: documentTitle.trim() || undefined,
        status: targetStatus,
        humanVerified,
        formData,
      };
      const res = activeDocId
        ? await updateMoeDocument(activeDocId, payload)
        : await createMoeDocument(payload);
      const saved = res.document;
      setActiveDocId(saved.id);
      setDocumentTitle(saved.documentTitle);
      setStatus(saved.status);
      setIsDirty(false);
      message.success(activeDocId ? 'MOE document saved' : 'MOE document created');
      loadDashboardAndTemplates();
      return saved;
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to save MOE document');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      const saved = await handleSave();
      if (!saved) return;
      await downloadMoeDocx(saved.id, saved.documentTitle);
      message.success('MOE DOCX downloaded');
    } catch {
      message.error('Failed to download MOE DOCX');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const saved = await handleSave();
      if (!saved) return;
      await downloadMoePdf(saved.id, saved.documentTitle);
      message.success('MOE PDF downloaded');
    } catch (err) {
      const msg = err?.response?.data?.error;
      message.warning(msg || 'PDF conversion unavailable. Use Print in Live Preview to save PDF.', 6);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const updateForm = (updater) => {
    setIsDirty(true);
    setFormData((prev) => updater(prev));
  };

  const updateSchedule = (key, patch) => {
    updateForm((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch },
    }));
  };

  const moveItem = (sectionKey, arrayKey, idx, dir) => {
    updateForm((prev) => {
      const arr = [...(prev[sectionKey]?.[arrayKey] || [])];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      const finalArr = arrayKey === 'titleDocuments'
        ? arr.map((it, i) => ({ ...it, serialNo: String(i + 1) }))
        : arr;
      return {
        ...prev,
        [sectionKey]: { ...prev[sectionKey], [arrayKey]: finalArr },
      };
    });
  };

  // ─── SAVED DOCUMENTS TABLE VIEW (DEFAULT) ──────────────────────────────────
  if (mode === 'dashboard') {
    return (
      <div className="moe-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={20} color="#fff" />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Mortgage Filing (MOE Builder)</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Memorandum of Agreement (First Time Deposit) — Saved Documents
              </Text>
            </div>
          </div>

          <Space wrap>
            {canManageTemplates && (
              <Button icon={<Settings size={14} />} onClick={() => setTemplateModalOpen(true)}>
                Template Management
              </Button>
            )}
            <Button type="primary" icon={<Plus size={15} />} onClick={handleCreateNewMoe}>
              Add New MOE
            </Button>
          </Space>
        </div>

        <Card bordered={false} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} styles={{ body: { padding: 0 } }}>
          <div style={{ display: 'flex', gap: 10, padding: '14px 16px', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9' }}>
            <Input
              placeholder="Search title, security provider, borrower, bank..."
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
            <Button icon={<RefreshCw size={14} />} onClick={loadDashboardAndTemplates} loading={dashboardLoading}>
              Refresh
            </Button>
          </div>

          <Table
            className="modern-dashboard-table"
            rowKey="id"
            loading={dashboardLoading}
            dataSource={savedDocs}
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty description="No MOE documents found. Click Add New MOE to create one." /> }}
            columns={[
              { title: 'Document Title', dataIndex: 'documentTitle', render: (v) => <Text strong>{v}</Text> },
              { title: 'Security Provider', dataIndex: 'securityProviderName', render: (v) => v || '—' },
              { title: 'Borrower', dataIndex: 'borrowerName', render: (v) => v || '—' },
              { title: 'Bank', dataIndex: 'bankName', render: (v) => v || '—' },
              {
                title: 'Deposit Date',
                dataIndex: 'depositDate',
                render: (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '—'),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (s) => (
                  <Tag color={s === 'FINALIZED' ? 'success' : s === 'READY_FOR_REVIEW' ? 'processing' : 'default'}>
                    {s === 'FINALIZED' ? 'Finalized' : s === 'READY_FOR_REVIEW' ? 'Ready for Review' : 'Draft'}
                  </Tag>
                ),
              },
              {
                title: 'Last Updated',
                dataIndex: 'updatedAt',
                render: (d) => dayjs(d).format('DD/MM/YYYY HH:mm'),
              },
              {
                title: 'Actions',
                width: 220,
                render: (_, r) => (
                  <Space size={4}>
                    <Button size="small" type="primary" icon={<Edit size={13} />} onClick={() => handleOpenDoc(r.id)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      icon={<Copy size={13} />}
                      title="Duplicate"
                      onClick={async () => {
                        try {
                          await duplicateMoeDocument(r.id);
                          message.success('MOE document duplicated');
                          loadDashboardAndTemplates();
                        } catch {
                          message.error('Failed to duplicate');
                        }
                      }}
                    />
                    <Button size="small" icon={<FileText size={13} />} title="Download DOCX" onClick={() => downloadMoeDocx(r.id, r.documentTitle)} />
                    <Button size="small" icon={<FileDown size={13} />} title="Download PDF" onClick={() => downloadMoePdf(r.id, r.documentTitle).catch((e) => message.warning(e?.response?.data?.error || 'PDF unavailable'))} />
                    <Popconfirm
                      title="Delete this MOE document?"
                      okButtonProps={{ danger: true }}
                      onConfirm={async () => {
                        try {
                          await deleteMoeDocument(r.id);
                          message.success('MOE document deleted');
                          loadDashboardAndTemplates();
                        } catch {
                          message.error('Failed to delete');
                        }
                      }}
                    >
                      <Button size="small" danger icon={<Trash2 size={13} />} title="Delete" />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <MoeTemplateManagerModal
          open={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          template={activeTemplate}
          onUpdated={loadDashboardAndTemplates}
        />
      </div>
    );
  }

  // ─── BUILDER VIEW ────────────────────────────────────────────────────────────
  const s1 = formData?.schedule1 || {};
  const s2 = formData?.schedule2 || {};
  const s3 = formData?.schedule3 || {};
  const s4 = formData?.schedule4 || {};
  const s5 = formData?.schedule5 || {};
  const s6 = formData?.schedule6 || {};
  const clauses = formData?.conditionalClauses || {};
  const exec = formData?.execution || {};

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'schedule1':
        return (
          <Row gutter={[12, 10]}>
            <Col xs={24} sm={12}>
              <Field label="Place of Deposit" required>
                <Input value={s1.depositPlace} onChange={(e) => updateSchedule('schedule1', { depositPlace: e.target.value })} placeholder="SURAT" />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Date of Deposit of Title Deeds" required>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} value={toDateVal(s1.depositDate)} onChange={(d) => updateSchedule('schedule1', { depositDate: fromDateVal(d) })} />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Bank Name" required>
                <Input value={s1.bankName} onChange={(e) => updateSchedule('schedule1', { bankName: e.target.value })} />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Bank Short Name">
                <Input value={s1.bankShortName} onChange={(e) => updateSchedule('schedule1', { bankShortName: e.target.value })} />
              </Field>
            </Col>
            <Col xs={24}>
              <Field label="Bank Branch Address" required>
                <TextArea rows={2} value={s1.bankBranchAddress} onChange={(e) => updateSchedule('schedule1', { bankBranchAddress: e.target.value })} />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Authorized Bank Officer Name" required>
                <Input value={s1.authorizedOfficerName} onChange={(e) => updateSchedule('schedule1', { authorizedOfficerName: e.target.value })} placeholder="e.g. Mr. Pritesh Mahla" />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field label="Authorized Officer Designation" required>
                <Input value={s1.authorizedOfficerDesignation} onChange={(e) => updateSchedule('schedule1', { authorizedOfficerDesignation: e.target.value })} placeholder="Manager" />
              </Field>
            </Col>
          </Row>
        );

      case 'schedule2': {
        const sps = s2.securityProviders || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sps.map((sp, idx) => (
              <Card
                key={sp.id || idx}
                size="small"
                className="moe-subcard"
                title={`Security Provider (${idx + 1})`}
                extra={
                  <Space size={2}>
                    <Button size="small" icon={<ArrowUp size={12} />} disabled={idx === 0} onClick={() => moveItem('schedule2', 'securityProviders', idx, -1)} />
                    <Button size="small" icon={<ArrowDown size={12} />} disabled={idx === sps.length - 1} onClick={() => moveItem('schedule2', 'securityProviders', idx, 1)} />
                    {sps.length > 1 && (
                      <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => updateSchedule('schedule2', { securityProviders: sps.filter((_, i) => i !== idx) })} />
                    )}
                  </Space>
                }
              >
                <Row gutter={[12, 10]}>
                  <Col xs={24} sm={12}>
                    <Field label="Full Name" required>
                      <Input
                        value={sp.fullName}
                        onChange={(e) => {
                          const next = [...sps];
                          next[idx] = { ...next[idx], fullName: e.target.value };
                          updateSchedule('schedule2', { securityProviders: next });
                        }}
                      />
                    </Field>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Field label="Age">
                      <Input
                        value={sp.age}
                        onChange={(e) => {
                          const next = [...sps];
                          next[idx] = { ...next[idx], age: e.target.value };
                          updateSchedule('schedule2', { securityProviders: next });
                        }}
                      />
                    </Field>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Field label="Person Type">
                      <Select
                        style={{ width: '100%' }}
                        value={sp.personType}
                        onChange={(val) => {
                          const next = [...sps];
                          next[idx] = { ...next[idx], personType: val };
                          updateSchedule('schedule2', { securityProviders: next });
                        }}
                        options={['Individual', 'Company', 'Partnership', 'Other'].map((v) => ({ value: v, label: v }))}
                      />
                    </Field>
                  </Col>
                  <Col xs={24}>
                    <Field label="Residential Address" required>
                      <TextArea
                        rows={2}
                        value={sp.residentialAddress}
                        onChange={(e) => {
                          const next = [...sps];
                          next[idx] = { ...next[idx], residentialAddress: e.target.value };
                          updateSchedule('schedule2', { securityProviders: next });
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
              onClick={() => updateSchedule('schedule2', {
                securityProviders: [...sps, { id: `sp-${Date.now()}`, fullName: '', age: 'Adult', residentialAddress: sps[0]?.residentialAddress || '', personType: 'Individual' }],
              })}
            >
              Add Security Provider
            </Button>

            <div className="moe-subhead">Authorized Person Details</div>
            <Row gutter={[12, 10]}>
              <Col xs={24}>
                <Field label="Is another person authorized to deposit title deeds?">
                  <Radio.Group value={s2.hasAuthorizedPerson} onChange={(e) => updateSchedule('schedule2', { hasAuthorizedPerson: e.target.value })}>
                    <Radio value="No">No (NA)</Radio>
                    <Radio value="Yes">Yes</Radio>
                  </Radio.Group>
                </Field>
              </Col>
              {s2.hasAuthorizedPerson === 'Yes' && (
                <>
                  <Col xs={24} sm={12}>
                    <Field label="Authorized Person Name" required>
                      <Input value={s2.authorizedPersonName} onChange={(e) => updateSchedule('schedule2', { authorizedPersonName: e.target.value })} />
                    </Field>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Field label="Age">
                      <Input value={s2.authorizedPersonAge} onChange={(e) => updateSchedule('schedule2', { authorizedPersonAge: e.target.value })} />
                    </Field>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Field label="Authorization Type">
                      <Select
                        style={{ width: '100%' }}
                        value={s2.authorizationType}
                        onChange={(val) => updateSchedule('schedule2', { authorizationType: val })}
                        options={['Power of Attorney', 'Board Resolution', 'Partner Authority', 'Other'].map((v) => ({ value: v, label: v }))}
                      />
                    </Field>
                  </Col>
                  <Col xs={24}>
                    <Field label="Authorized Person Address">
                      <Input value={s2.authorizedPersonAddress} onChange={(e) => updateSchedule('schedule2', { authorizedPersonAddress: e.target.value })} />
                    </Field>
                  </Col>
                  <Col xs={12}>
                    <Field label="POA / Resolution No.">
                      <Input value={s2.poaNumber} onChange={(e) => updateSchedule('schedule2', { poaNumber: e.target.value })} />
                    </Field>
                  </Col>
                  <Col xs={12}>
                    <Field label="POA / Resolution Date">
                      <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} value={toDateVal(s2.poaDate)} onChange={(d) => updateSchedule('schedule2', { poaDate: fromDateVal(d) })} />
                    </Field>
                  </Col>
                </>
              )}
            </Row>
          </div>
        );
      }

      case 'schedule3': {
        const borrowers = s3.borrowers || [];
        const agreements = s3.facilityAgreements || [];
        const letters = s3.sanctionLetters || [];
        const facilities = s3.facilities || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="moe-subhead" style={{ marginTop: 0 }}>A. Borrowers</div>
            {borrowers.map((br, idx) => (
              <Card
                key={br.id || idx}
                size="small"
                className="moe-subcard"
                title={`Borrower (${idx + 1})`}
                extra={borrowers.length > 1 && <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => updateSchedule('schedule3', { borrowers: borrowers.filter((_, i) => i !== idx) })} />}
              >
                <Row gutter={[12, 10]}>
                  <Col xs={24} sm={12}>
                    <Field label="Borrower Full Name" required>
                      <Input value={br.fullName} onChange={(e) => { const next = [...borrowers]; next[idx] = { ...next[idx], fullName: e.target.value }; updateSchedule('schedule3', { borrowers: next }); }} />
                    </Field>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Field label="Age">
                      <Input value={br.age} onChange={(e) => { const next = [...borrowers]; next[idx] = { ...next[idx], age: e.target.value }; updateSchedule('schedule3', { borrowers: next }); }} />
                    </Field>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Field label="Type">
                      <Select style={{ width: '100%' }} value={br.borrowerType} onChange={(val) => { const next = [...borrowers]; next[idx] = { ...next[idx], borrowerType: val }; updateSchedule('schedule3', { borrowers: next }); }} options={['Individual', 'Company', 'Partnership', 'Proprietorship'].map((v) => ({ value: v, label: v }))} />
                    </Field>
                  </Col>
                  <Col xs={24}>
                    <Field label="Residential Address">
                      <Input value={br.residentialAddress} onChange={(e) => { const next = [...borrowers]; next[idx] = { ...next[idx], residentialAddress: e.target.value }; updateSchedule('schedule3', { borrowers: next }); }} />
                    </Field>
                  </Col>
                  <Col xs={24}>
                    <Field label="Business / Registered Office Address">
                      <Input value={br.businessAddress} onChange={(e) => { const next = [...borrowers]; next[idx] = { ...next[idx], businessAddress: e.target.value }; updateSchedule('schedule3', { borrowers: next }); }} />
                    </Field>
                  </Col>
                </Row>
              </Card>
            ))}
            <Button type="dashed" icon={<Plus size={14} />} onClick={() => updateSchedule('schedule3', { borrowers: [...borrowers, { id: `br-${Date.now()}`, fullName: '', age: 'Adult', residentialAddress: '', businessAddress: '', borrowerType: 'Individual' }] })}>
              Add Borrower
            </Button>

            <div className="moe-subhead">B. Facility Agreements</div>
            {agreements.map((fa, idx) => (
              <Card key={fa.id || idx} size="small" className="moe-subcard" title={`Facility Agreement #${idx + 1}`} extra={agreements.length > 1 && <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => updateSchedule('schedule3', { facilityAgreements: agreements.filter((_, i) => i !== idx) })} />}>
                <Row gutter={[12, 10]}>
                  <Col xs={24} sm={12}><Field label="Facility Name"><Input value={fa.facilityName} onChange={(e) => { const next = [...agreements]; next[idx] = { ...next[idx], facilityName: e.target.value }; updateSchedule('schedule3', { facilityAgreements: next }); }} /></Field></Col>
                  <Col xs={24} sm={12}><Field label="Execution Date"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} value={toDateVal(fa.executionDate)} onChange={(d) => { const next = [...agreements]; next[idx] = { ...next[idx], executionDate: fromDateVal(d) }; updateSchedule('schedule3', { facilityAgreements: next }); }} /></Field></Col>
                  <Col xs={24} sm={12}><Field label="Execution Place"><Input value={fa.executionPlace} onChange={(e) => { const next = [...agreements]; next[idx] = { ...next[idx], executionPlace: e.target.value }; updateSchedule('schedule3', { facilityAgreements: next }); }} /></Field></Col>
                  <Col xs={24} sm={12}><Field label="Custom Description (Optional)"><Input value={fa.agreementDescription} placeholder="Auto-generated if blank" onChange={(e) => { const next = [...agreements]; next[idx] = { ...next[idx], agreementDescription: e.target.value }; updateSchedule('schedule3', { facilityAgreements: next }); }} /></Field></Col>
                </Row>
              </Card>
            ))}
            <Button type="dashed" icon={<Plus size={14} />} onClick={() => updateSchedule('schedule3', { facilityAgreements: [...agreements, { id: `fa-${Date.now()}`, facilityName: '', agreementType: 'Facility Agreement', executionDate: '', executionPlace: s1.depositPlace || 'SURAT' }] })}>
              Add Facility Agreement
            </Button>

            <div className="moe-subhead">C. Sanction Letters</div>
            {letters.map((sl, idx) => (
              <Card key={sl.id || idx} size="small" className="moe-subcard" title={`Sanction Letter #${idx + 1}`} extra={letters.length > 1 && <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => updateSchedule('schedule3', { sanctionLetters: letters.filter((_, i) => i !== idx) })} />}>
                <Row gutter={[12, 10]}>
                  <Col xs={24} sm={12}><Field label="Sanction Letter Date"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} value={toDateVal(sl.sanctionDate)} onChange={(d) => { const next = [...letters]; next[idx] = { ...next[idx], sanctionDate: fromDateVal(d) }; updateSchedule('schedule3', { sanctionLetters: next }); }} /></Field></Col>
                  <Col xs={24} sm={12}><Field label="Sanction Reference Number"><Input value={sl.sanctionRefNo} onChange={(e) => { const next = [...letters]; next[idx] = { ...next[idx], sanctionRefNo: e.target.value }; updateSchedule('schedule3', { sanctionLetters: next }); }} /></Field></Col>
                </Row>
              </Card>
            ))}
            <Button type="dashed" icon={<Plus size={14} />} onClick={() => updateSchedule('schedule3', { sanctionLetters: [...letters, { id: `sl-${Date.now()}`, sanctionDate: '', sanctionRefNo: '' }] })}>
              Add Sanction Letter
            </Button>

            <div className="moe-subhead">D. Financial Facilities (Auto-Calculated Total)</div>
            {facilities.map((fac, idx) => (
              <Card key={fac.id || idx} size="small" className="moe-subcard" title={`Facility #${idx + 1}`} extra={facilities.length > 1 && <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => updateSchedule('schedule3', { facilities: facilities.filter((_, i) => i !== idx) })} />}>
                <Row gutter={[12, 10]}>
                  <Col xs={24} sm={12}>
                    <Field label="Facility Name" required>
                      <Input value={fac.facilityName} onChange={(e) => { const next = [...facilities]; next[idx] = { ...next[idx], facilityName: e.target.value }; updateSchedule('schedule3', { facilities: next }); }} />
                    </Field>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Field label="Facility Amount (₹)" required>
                      <InputNumber style={{ width: '100%' }} min={0} value={fac.facilityAmount ? Number(fac.facilityAmount) : null} onChange={(v) => { const next = [...facilities]; next[idx] = { ...next[idx], facilityAmount: v !== null ? String(v) : '' }; updateSchedule('schedule3', { facilities: next }); }} />
                    </Field>
                  </Col>
                  <Col xs={24}>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>
                      In Words: <strong>{numberToIndianRupeesWords(fac.facilityAmount)}</strong>
                    </Text>
                  </Col>
                </Row>
              </Card>
            ))}
            <Button type="dashed" icon={<Plus size={14} />} onClick={() => updateSchedule('schedule3', { facilities: [...facilities, { id: `fac-${Date.now()}`, facilityName: '', facilityAmount: '' }] })}>
              Add Financial Facility
            </Button>

            <div style={{ padding: '10px 14px', background: '#eef2ff', borderRadius: 10, border: '1px solid #c7d2fe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Total Facility Amount</Text>
                <Text strong style={{ fontSize: 16, color: accent }}>₹ {formatIndianAmount(totalFacilityAmount)}/-</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>({numberToIndianRupeesWords(totalFacilityAmount)})</Text>
            </div>

            <div className="moe-subhead">E. Authorizations &amp; Ranking</div>
            <Row gutter={[12, 10]}>
              <Col xs={24} sm={12}>
                <Field label="Authorizations / Clearances Applicable?">
                  <Radio.Group value={s3.authorizationsApplicable} onChange={(e) => updateSchedule('schedule3', { authorizationsApplicable: e.target.value })}>
                    <Radio value="No">No (NA)</Radio>
                    <Radio value="Yes">Yes</Radio>
                  </Radio.Group>
                </Field>
              </Col>
              <Col xs={24} sm={12}>
                <Field label="Ranking of Security Interest">
                  <Select style={{ width: '100%' }} value={s3.rankingOfSecurityInterest} onChange={(v) => updateSchedule('schedule3', { rankingOfSecurityInterest: v })} options={['First', 'Second', 'Other'].map((v) => ({ value: v, label: v }))} />
                </Field>
              </Col>
              {s3.authorizationsApplicable === 'Yes' && (
                <Col xs={24}>
                  <Field label="Section 281 / NOC / Approvals Details">
                    <TextArea rows={2} value={s3.authorizationDescription} onChange={(e) => updateSchedule('schedule3', { authorizationDescription: e.target.value })} />
                  </Field>
                </Col>
              )}
            </Row>
          </div>
        );
      }

      case 'schedule4': {
        const docs = s4.titleDocuments || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {docs.map((td, idx) => (
              <Card
                key={td.id || idx}
                size="small"
                className="moe-subcard"
                title={`Document #${idx + 1} (${td.documentType || 'Registered Sale Deed'})`}
                extra={
                  <Space size={2}>
                    <Button size="small" icon={<ArrowUp size={12} />} disabled={idx === 0} onClick={() => moveItem('schedule4', 'titleDocuments', idx, -1)} />
                    <Button size="small" icon={<ArrowDown size={12} />} disabled={idx === docs.length - 1} onClick={() => moveItem('schedule4', 'titleDocuments', idx, 1)} />
                    {docs.length > 1 && <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => updateSchedule('schedule4', { titleDocuments: docs.filter((_, i) => i !== idx).map((d, i) => ({ ...d, serialNo: String(i + 1) })) })} />}
                  </Space>
                }
              >
                <Row gutter={[12, 10]}>
                  <Col xs={24} sm={12}>
                    <Field label="Document Type">
                      <Select
                        style={{ width: '100%' }}
                        value={td.documentType}
                        onChange={(v) => { const next = [...docs]; next[idx] = { ...next[idx], documentType: v }; updateSchedule('schedule4', { titleDocuments: next }); }}
                        options={['Registered Sale Deed', 'Notarized Sale Agreement', 'Reconveyance Deed', 'NOC', 'Power of Attorney', 'Other'].map((v) => ({ value: v, label: v }))}
                      />
                    </Field>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Field label="Original / Certified Copy">
                      <Select
                        style={{ width: '100%' }}
                        value={td.copyType}
                        onChange={(v) => { const next = [...docs]; next[idx] = { ...next[idx], copyType: v }; updateSchedule('schedule4', { titleDocuments: next }); }}
                        options={['Original', 'Certified Copy'].map((v) => ({ value: v, label: v }))}
                      />
                    </Field>
                  </Col>
                  <Col xs={12}><Field label="Registration No."><Input value={td.registrationNo} onChange={(e) => { const next = [...docs]; next[idx] = { ...next[idx], registrationNo: e.target.value }; updateSchedule('schedule4', { titleDocuments: next }); }} /></Field></Col>
                  <Col xs={12}><Field label="Document Date (DD-MM-YYYY)"><Input value={td.documentDate} placeholder="20-10-2011" onChange={(e) => { const next = [...docs]; next[idx] = { ...next[idx], documentDate: e.target.value }; updateSchedule('schedule4', { titleDocuments: next }); }} /></Field></Col>
                  <Col xs={12}><Field label="Old Reg. No. (Optional)"><Input value={td.oldRegistrationNo} onChange={(e) => { const next = [...docs]; next[idx] = { ...next[idx], oldRegistrationNo: e.target.value }; updateSchedule('schedule4', { titleDocuments: next }); }} /></Field></Col>
                  <Col xs={12}><Field label="Old Date (Optional)"><Input value={td.oldDocumentDate} onChange={(e) => { const next = [...docs]; next[idx] = { ...next[idx], oldDocumentDate: e.target.value }; updateSchedule('schedule4', { titleDocuments: next }); }} /></Field></Col>
                  <Col xs={24} sm={12}><Field label="Executed By (Seller / Authority)"><Input value={td.executedBy} onChange={(e) => { const next = [...docs]; next[idx] = { ...next[idx], executedBy: e.target.value }; updateSchedule('schedule4', { titleDocuments: next }); }} /></Field></Col>
                  <Col xs={24} sm={12}><Field label="Executed In Favour Of (Buyer)"><Input value={td.executedInFavourOf} onChange={(e) => { const next = [...docs]; next[idx] = { ...next[idx], executedInFavourOf: e.target.value }; updateSchedule('schedule4', { titleDocuments: next }); }} /></Field></Col>
                  <Col xs={12}><Field label="POA Holder (Optional)"><Input value={td.poaHolder} onChange={(e) => { const next = [...docs]; next[idx] = { ...next[idx], poaHolder: e.target.value }; updateSchedule('schedule4', { titleDocuments: next }); }} /></Field></Col>
                  <Col xs={12}><Field label="RR Details"><Input value={td.rrDetails} onChange={(e) => { const next = [...docs]; next[idx] = { ...next[idx], rrDetails: e.target.value }; updateSchedule('schedule4', { titleDocuments: next }); }} /></Field></Col>
                  <Col xs={24}>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#334155' }}>
                      <strong>Preview:</strong> {td.manualDescriptionOverride && td.customDescription ? td.customDescription : buildTitleDocumentDescription(td)}
                    </div>
                  </Col>
                </Row>
              </Card>
            ))}
            <Button
              type="dashed"
              icon={<Plus size={14} />}
              onClick={() => updateSchedule('schedule4', {
                titleDocuments: [...docs, { id: `td-${Date.now()}`, serialNo: String(docs.length + 1), documentType: 'Registered Sale Deed', copyType: 'Original', rrDetails: 'alongwith its RR' }],
              })}
            >
              Add Title Document
            </Button>
          </div>
        );
      }

      case 'schedule5': {
        const props = s5.properties || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {props.map((prop, idx) => (
              <Card
                key={prop.id || idx}
                size="small"
                className="moe-subcard"
                title={`Immovable Property #${idx + 1}`}
                extra={props.length > 1 && <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => updateSchedule('schedule5', { properties: props.filter((_, i) => i !== idx) })} />}
              >
                <Row gutter={[12, 10]}>
                  <Col xs={24} sm={12}><Field label="Property Type"><Input value={prop.propertyType} onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], propertyType: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>
                  <Col xs={24} sm={12}><Field label="Plot / House / Flat No."><Input value={prop.plotNo} onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], plotNo: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>
                  <Col xs={24}><Field label="Society / Building Name"><Input value={prop.societyBuildingName} onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], societyBuildingName: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>
                  <Col xs={12}><Field label="Land Area (N.A.)"><Input value={prop.landArea} placeholder="e.g. 29,138 Sq. Mts." onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], landArea: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>
                  <Col xs={12}><Field label="Property Area"><Input value={prop.propertyArea} placeholder="e.g. 58.40" onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], propertyArea: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>
                  <Col xs={12}><Field label="Revenue Survey No."><Input value={prop.revenueSurveyNo} onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], revenueSurveyNo: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>
                  <Col xs={12}><Field label="Block No."><Input value={prop.blockNo} onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], blockNo: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>
                  <Col xs={8}><Field label="Village / Moje"><Input value={prop.villageMoje} onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], villageMoje: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>
                  <Col xs={8}><Field label="Taluka"><Input value={prop.talukaSubDistrict} onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], talukaSubDistrict: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>
                  <Col xs={8}><Field label="District"><Input value={prop.district} onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], district: e.target.value }; updateSchedule('schedule5', { properties: next }); }} /></Field></Col>

                  <Col xs={24}>
                    <div className="moe-subhead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}>
                      <span>Complete Property Description</span>
                      <Space size={6}>
                        <Button
                          size="small"
                          onClick={() => {
                            const generated = buildMoePropertyDescription(prop);
                            if (prop.manualDescriptionOverride && prop.completePropertyDescription?.trim()) {
                              Modal.confirm({
                                title: 'Replace Manual Description?',
                                content: 'You have manually edited this property description. Replace with auto-generated text?',
                                onOk: () => {
                                  const next = [...props];
                                  next[idx] = { ...next[idx], manualDescriptionOverride: false, completePropertyDescription: generated };
                                  updateSchedule('schedule5', { properties: next });
                                },
                              });
                            } else {
                              const next = [...props];
                              next[idx] = { ...next[idx], completePropertyDescription: generated };
                              updateSchedule('schedule5', { properties: next });
                            }
                          }}
                        >
                          Generate Description
                        </Button>
                        <Switch size="small" checked={prop.manualDescriptionOverride} onChange={(c) => { const next = [...props]; next[idx] = { ...next[idx], manualDescriptionOverride: c }; updateSchedule('schedule5', { properties: next }); }} />
                      </Space>
                    </div>
                    <TextArea
                      rows={3}
                      value={prop.completePropertyDescription || buildMoePropertyDescription(prop)}
                      onChange={(e) => { const next = [...props]; next[idx] = { ...next[idx], manualDescriptionOverride: true, completePropertyDescription: e.target.value }; updateSchedule('schedule5', { properties: next }); }}
                    />
                  </Col>

                  <Col xs={24}><div className="moe-subhead">Boundaries</div></Col>
                  {['east', 'west', 'north', 'south'].map((dir) => (
                    <Col xs={12} key={dir}>
                      <Field label={dir.charAt(0).toUpperCase() + dir.slice(1)} required>
                        <Input
                          value={prop.boundaries?.[dir]}
                          onChange={(e) => {
                            const next = [...props];
                            next[idx] = { ...next[idx], boundaries: { ...(next[idx].boundaries || {}), [dir]: e.target.value } };
                            updateSchedule('schedule5', { properties: next });
                          }}
                        />
                      </Field>
                    </Col>
                  ))}
                </Row>
              </Card>
            ))}
            <Button type="dashed" icon={<Plus size={14} />} onClick={() => updateSchedule('schedule5', { properties: [...props, { id: `prop-${Date.now()}`, propertyType: 'residential house property', boundaries: {} }] })}>
              Add Property
            </Button>
          </div>
        );
      }

      case 'schedule6': {
        const charges = s6.existingCharges || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Schedule VI – Existing Charges / Security Interest">
              <Radio.Group value={s6.hasExistingCharges} onChange={(e) => updateSchedule('schedule6', { hasExistingCharges: e.target.value })}>
                <Radio value="NIL">NIL (No Existing Charges)</Radio>
                <Radio value="EXISTING">Existing Charges Available</Radio>
              </Radio.Group>
            </Field>
            {s6.hasExistingCharges === 'EXISTING' && (
              <>
                {charges.map((ch, idx) => (
                  <Card key={ch.id || idx} size="small" className="moe-subcard" title={`Charge #${idx + 1}`} extra={<Button size="small" danger icon={<Trash2 size={12} />} onClick={() => updateSchedule('schedule6', { existingCharges: charges.filter((_, i) => i !== idx) })} />}>
                    <Row gutter={[12, 10]}>
                      <Col xs={24} sm={12}><Field label="Charge Holder Name"><Input value={ch.chargeHolderName} onChange={(e) => { const next = [...charges]; next[idx] = { ...next[idx], chargeHolderName: e.target.value }; updateSchedule('schedule6', { existingCharges: next }); }} /></Field></Col>
                      <Col xs={24} sm={12}><Field label="Nature of Charge"><Input value={ch.natureOfCharge} onChange={(e) => { const next = [...charges]; next[idx] = { ...next[idx], natureOfCharge: e.target.value }; updateSchedule('schedule6', { existingCharges: next }); }} /></Field></Col>
                      <Col xs={12}><Field label="Registration No."><Input value={ch.registrationNo} onChange={(e) => { const next = [...charges]; next[idx] = { ...next[idx], registrationNo: e.target.value }; updateSchedule('schedule6', { existingCharges: next }); }} /></Field></Col>
                      <Col xs={12}><Field label="Registration Date"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} value={toDateVal(ch.registrationDate)} onChange={(d) => { const next = [...charges]; next[idx] = { ...next[idx], registrationDate: fromDateVal(d) }; updateSchedule('schedule6', { existingCharges: next }); }} /></Field></Col>
                      <Col xs={24}><Field label="Outstanding / Other Details"><Input value={ch.outstandingDetails} onChange={(e) => { const next = [...charges]; next[idx] = { ...next[idx], outstandingDetails: e.target.value }; updateSchedule('schedule6', { existingCharges: next }); }} /></Field></Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" icon={<Plus size={14} />} onClick={() => updateSchedule('schedule6', { existingCharges: [...charges, { id: `ch-${Date.now()}` }] })}>
                  Add Existing Charge
                </Button>
              </>
            )}
          </div>
        );
      }

      case 'clauses':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CONDITIONAL_CLAUSES_META.map((c) => (
              <Card key={c.id} size="small" className="moe-subcard" title={c.title}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  <strong>Reference:</strong> {c.clauseRef}<br />
                  <strong>Condition:</strong> {c.condition}
                </div>
                <Radio.Group
                  value={clauses[c.id] || 'NOT_APPLICABLE'}
                  onChange={(e) => updateSchedule('conditionalClauses', { [c.id]: e.target.value })}
                >
                  <Radio value="APPLICABLE">Applicable (Include)</Radio>
                  <Radio value="NOT_APPLICABLE">Not Applicable</Radio>
                  <Radio value="UNCERTAIN">Uncertain – Flag for Advocate Review</Radio>
                </Radio.Group>
              </Card>
            ))}
          </div>
        );

      case 'execution': {
        const sps = s2.securityProviders || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row gutter={[12, 10]}>
              <Col xs={24} sm={12}>
                <Field label="Execution Date (defaults to Deposit Date)">
                  <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} value={toDateVal(exec.executionDate || s1.depositDate)} onChange={(d) => updateSchedule('execution', { executionDate: fromDateVal(d) })} />
                </Field>
              </Col>
            </Row>

            <div className="moe-subhead">Security Provider Photos, Signatures &amp; Thumb Impressions</div>
            {sps.map((sp, idx) => (
              <Card key={sp.id || idx} size="small" className="moe-subcard" title={`(${idx + 1}) ${sp.fullName || 'Security Provider'}`}>
                <Row gutter={[10, 10]}>
                  <Col xs={24} sm={8}>
                    <ImageUploadSlot
                      label="Photograph"
                      value={sp.photoImage}
                      onChange={(val) => { const next = [...sps]; next[idx] = { ...next[idx], photoImage: val }; updateSchedule('schedule2', { securityProviders: next }); }}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <ImageUploadSlot
                      label="Thumb Impression"
                      value={sp.thumbImage}
                      onChange={(val) => { const next = [...sps]; next[idx] = { ...next[idx], thumbImage: val }; updateSchedule('schedule2', { securityProviders: next }); }}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <ImageUploadSlot
                      label="Signature"
                      value={sp.signatureImage}
                      onChange={(val) => { const next = [...sps]; next[idx] = { ...next[idx], signatureImage: val }; updateSchedule('schedule2', { securityProviders: next }); }}
                    />
                  </Col>
                </Row>
              </Card>
            ))}

            <div className="moe-subhead">Authorized Bank Officer ({s1.authorizedOfficerName || 'Bank Officer'})</div>
            <Row gutter={[10, 10]}>
              <Col xs={12}>
                <ImageUploadSlot
                  label="Bank Officer Photograph"
                  value={exec.bankOfficerPhotoImage}
                  onChange={(val) => updateSchedule('execution', { bankOfficerPhotoImage: val })}
                />
              </Col>
              <Col xs={12}>
                <ImageUploadSlot
                  label="Bank Officer Signature"
                  value={exec.bankOfficerSignatureImage}
                  onChange={(val) => updateSchedule('execution', { bankOfficerSignatureImage: val })}
                />
              </Col>
            </Row>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="moe-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button icon={<ArrowLeft size={15} />} onClick={() => confirmDiscardIfDirty(() => setMode('dashboard'))} />
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              {documentTitle || 'New Mortgage Filing (MOE)'}
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {activeTemplate?.name || 'Registered MOE – First Time Deposit'}
            </Text>
          </div>
        </div>

        <Space size={8} wrap>
          <Button icon={<FolderOpen size={14} />} onClick={() => setSavedDrawerOpen(true)}>Saved MOEs</Button>
          <Button icon={<Save size={14} style={{ color: accent }} />} loading={saving} onClick={() => handleSave()}>
            Save Draft
          </Button>
          <Button type="primary" icon={<FileText size={14} />} loading={downloadingDocx} onClick={handleDownloadDocx}>
            Download DOCX
          </Button>
          <Button icon={<FileDown size={14} />} loading={downloadingPdf} onClick={handleDownloadPdf}>
            Download PDF
          </Button>
        </Space>
      </div>

      {/* Metadata Strip */}
      <Row gutter={[12, 8]} align="bottom">
        <Col xs={24} md={8}>
          <Field label="Document Title">
            <Input value={documentTitle} onChange={(e) => { setIsDirty(true); setDocumentTitle(e.target.value); }} placeholder="Auto-generated from Security Provider & Bank" />
          </Field>
        </Col>
        <Col xs={24} md={7}>
          <Field label="MOE Template">
            <Select style={{ width: '100%' }} value={selectedTemplateId} onChange={setSelectedTemplateId} options={templates.map((t) => ({ value: t.id, label: `${t.name} (v${t.version})` }))} />
          </Field>
        </Col>
        <Col xs={12} md={4}>
          <Field label="Status">
            <Select
              style={{ width: '100%' }}
              value={status}
              onChange={(v) => { setIsDirty(true); setStatus(v); }}
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
            <Checkbox checked={humanVerified} onChange={(e) => { setIsDirty(true); setHumanVerified(e.target.checked); }}>
              <Text style={{ fontSize: 12, fontWeight: 600 }}>Verified</Text>
            </Checkbox>
            {validation.errors.length > 0 && <Tag color="error" style={{ margin: 0 }}>{validation.errors.length} Missing</Tag>}
            {validation.warnings.length > 0 && <Tag color="warning" style={{ margin: 0 }}>{validation.warnings.length} Review</Tag>}
            {validation.errors.length === 0 && validation.warnings.length === 0 && <Tag color="success" style={{ margin: 0 }}>Ready</Tag>}
          </div>
        </Col>
      </Row>

      {/* 2-Panel Builder Shell: Accordion Form | Live Preview */}
      <div className="moe-builder-shell">
        <div className="moe-form-pane">
          <Collapse
            className="moe-collapse"
            accordion
            activeKey={activePanels}
            onChange={setActivePanels}
            items={SECTIONS.map((sec) => {
              const counts = validation.sectionCounts[sec.id];
              return {
                key: sec.id,
                label: (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Text strong>{sec.num}. {sec.title}</Text>
                    {counts?.errors > 0 ? (
                      <Badge count={counts.errors} size="small" style={{ backgroundColor: '#dc2626' }} />
                    ) : counts?.warnings > 0 ? (
                      <Badge count={counts.warnings} size="small" style={{ backgroundColor: '#d97706' }} />
                    ) : (
                      <CheckCircle2 size={14} color="#16a34a" />
                    )}
                  </div>
                ),
                children: renderSectionContent(sec.id),
              };
            })}
          />
        </div>

        <div className="moe-preview-pane">
          <MoePreviewPane
            docxBuffer={previewBuffer}
            loading={previewLoading}
            formData={formData}
            onRefresh={() => refreshPreview(formData, activeTemplate?.fileName)}
          />
        </div>
      </div>

      <MoeSavedDrawer
        open={savedDrawerOpen}
        onClose={() => setSavedDrawerOpen(false)}
        onSelectDoc={(id) => confirmDiscardIfDirty(() => handleOpenDoc(id))}
        onCreateNew={handleCreateNewMoe}
        onChanged={loadDashboardAndTemplates}
      />
    </div>
  );
}

import { useState, useMemo, useRef } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UploadCloud,
  Users,
  Wallet,
  X,
  Zap,
  ExternalLink,
} from 'lucide-react';
import dayjs from 'dayjs';
import html2pdf from 'html2pdf.js';
import api from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { formatISTDate, toISTDateString } from '../../utils/istDate';
import TransliterateInput from '../../components/TransliterateInput';
import EmptyState from '../../components/EmptyState';
import {
  useVerabillEntries,
  useVerabillSummary,
  useCreateVerabillEntry,
  useUpdateVerabillEntry,
  useDeleteVerabillEntry,
  useImportVerabill,
} from '../../hooks/useVerabill';
import { VERABILL_SHEET1_RECORDS } from './verabillSheet1Data';
import VerabillPrintLayout from './VerabillPrintLayout';
import VerabillSingleEntryPrintLayout from './VerabillSingleEntryPrintLayout';
import SmcViewBillModal from './SmcViewBillModal';
import SmcTenementInput, { SmcTenementBadge, formatTenementDisplay } from './SmcTenementInput';

const { Title, Text } = Typography;

export default function VerabillPage() {
  const [params, setParams] = useState({
    page: 1,
    pageSize: 20,
    search: '',
    clientName: '',
    property: '',
    workType: '',
    sortBy: 'createdAt',
    sortDir: 'desc',
  });

  const { data, isLoading } = useVerabillEntries(params);
  const { data: summary, isLoading: isSummaryLoading } = useVerabillSummary();
  const createMut = useCreateVerabillEntry();
  const updateMut = useUpdateVerabillEntry();
  const deleteMut = useDeleteVerabillEntry();
  const importMut = useImportVerabill();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [smcModalOpen, setSmcModalOpen] = useState(false);
  const [selectedTenement, setSelectedTenement] = useState('');
  const [lightBillModalOpen, setLightBillModalOpen] = useState(false);
  const [selectedLightBillEntry, setSelectedLightBillEntry] = useState(null);
  const [formTabKey, setFormTabKey] = useState('fees');
  const [form] = Form.useForm();

  // Watch modal form fields for live net calculation
  const watchedFees = Form.useWatch('fees', form) || [];
  const watchedExpenses = Form.useWatch('expenses', form) || [];

  const modalTotalFees = useMemo(() => {
    return (watchedFees || []).reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
  }, [watchedFees]);

  const modalTotalExpenses = useMemo(() => {
    return (watchedExpenses || []).reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
  }, [watchedExpenses]);

  const modalNetBalance = modalTotalFees - modalTotalExpenses;

  const entries = data?.entries || [];
  const total = data?.total || 0;

  const printRef = useRef(null);
  const singlePrintRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingSinglePDF, setIsGeneratingSinglePDF] = useState(false);
  const [exportEntries, setExportEntries] = useState(null);

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    let container = null;

    try {
      let recordsToPrint = entries;
      if (total > entries.length) {
        const { data: fullData } = await api.get('/verabill', {
          params: {
            ...params,
            page: 1,
            pageSize: Math.min(total, 1000),
          },
        });
        if (fullData?.entries?.length) {
          recordsToPrint = fullData.entries;
        }
      }

      setExportEntries(recordsToPrint);

      // Allow react to render off-screen layout
      await new Promise((resolve) => setTimeout(resolve, 350));

      const element = printRef.current;
      if (!element) throw new Error('Print layout element not found');

      const clone = element.cloneNode(true);
      clone.classList.add('pdf-mode');

      container = document.createElement('div');
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

      document.body.style.overflow = 'visible';
      document.documentElement.style.overflow = 'visible';

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const captureWidth = 794;
      const captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1120);
      const filename = `Verabill_Report_${dayjs().format('YYYY-MM-DD')}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: captureWidth,
          height: captureHeight,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(clone).save();
      message.success('Verabill report PDF exported successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      message.error('Failed to generate PDF');
    } finally {
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      setIsGeneratingPDF(false);
      setExportEntries(null);
    }
  };

  const handleExportSinglePDF = async (entryToPrint = viewing) => {
    if (!entryToPrint) return;
    setIsGeneratingSinglePDF(true);
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    let container = null;

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const element = singlePrintRef.current;
      if (!element) throw new Error('Print layout element not found');

      const clone = element.cloneNode(true);
      clone.classList.add('pdf-mode');

      container = document.createElement('div');
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

      document.body.style.overflow = 'visible';
      document.documentElement.style.overflow = 'visible';

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const captureWidth = 794;
      const captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1120);
      const safeClient = String(entryToPrint.clientName || 'Entry')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const filename = `Verabill_${safeClient || 'Entry'}_${dayjs().format('YYYYMMDD')}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: captureWidth,
          height: captureHeight,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(clone).save();
      message.success('Entry PDF statement exported successfully!');
    } catch (err) {
      console.error('Single entry PDF export error:', err);
      message.error('Failed to generate PDF');
    } finally {
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      setIsGeneratingSinglePDF(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormTabKey('fees');
    form.resetFields();
    form.setFieldsValue({
      startDate: dayjs(),
      clientName: '',
      property: '',
      zone: '',
      tenementNo: '',
      workType: 'Both',
      workDescription: '',
      fees: [{ amount: undefined, receivedBy: '', transactionDate: null, description: '' }],
      expenses: [],
    });
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditing(entry);
    setFormTabKey('fees');
    form.resetFields();
    form.setFieldsValue({
      startDate: entry.startDate ? dayjs(toISTDateString(entry.startDate)) : null,
      clientName: entry.clientName,
      property: entry.property,
      zone: entry.zone || '',
      tenementNo: entry.tenementNo || '',
      workType: entry.workType || 'Both',
      workDescription: entry.workDescription,
      fees: (entry.fees || []).map((f) => ({
        amount: f.amount != null ? Number(f.amount) : undefined,
        receivedBy: f.receivedBy || '',
        transactionDate: f.transactionDate ? dayjs(toISTDateString(f.transactionDate)) : null,
        description: f.description || '',
      })),
      expenses: (entry.expenses || []).map((e) => ({
        amount: e.amount != null ? Number(e.amount) : undefined,
        expensePerson: e.expensePerson || '',
        expenseDate: e.expenseDate ? dayjs(toISTDateString(e.expenseDate)) : null,
        description: e.description || '',
      })),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        startDate: values.startDate
          ? dayjs.isDayjs(values.startDate)
            ? values.startDate.format('YYYY-MM-DD')
            : String(values.startDate).slice(0, 10)
          : null,
        clientName: values.clientName?.trim(),
        property: values.property?.trim(),
        zone: values.zone?.trim() || '',
        tenementNo: values.tenementNo?.trim() || '',
        workType: values.workType || 'Both',
        workDescription: values.workDescription?.trim(),
        fees: (values.fees || [])
          .filter((f) => f && f.amount !== null && f.amount !== undefined && f.amount !== '')
          .map((f) => ({
            amount: Number(f.amount),
            receivedBy: f.receivedBy?.trim() || '',
            transactionDate: f.transactionDate
              ? dayjs.isDayjs(f.transactionDate)
                ? f.transactionDate.format('YYYY-MM-DD')
                : String(f.transactionDate).slice(0, 10)
              : null,
            description: f.description?.trim() || '',
          })),
        expenses: (values.expenses || [])
          .filter((e) => e && e.amount !== null && e.amount !== undefined && e.amount !== '')
          .map((e) => ({
            amount: Number(e.amount),
            expensePerson: e.expensePerson?.trim() || '',
            expenseDate: e.expenseDate
              ? dayjs.isDayjs(e.expenseDate)
                ? e.expenseDate.format('YYYY-MM-DD')
                : String(e.expenseDate).slice(0, 10)
              : null,
            description: e.description?.trim() || '',
          })),
      };

      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        message.success('Verabill entry updated successfully');
      } else {
        await createMut.mutateAsync(payload);
        message.success('Verabill entry created successfully');
      }
      setModalOpen(false);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error || 'Failed to save entry');
    }
  };

  const handleDelete = async (entry) => {
    try {
      await deleteMut.mutateAsync(entry.id);
      message.success(`Entry for ${entry.clientName} deleted`);
      if (viewing?.id === entry.id) setViewing(null);
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to delete entry');
    }
  };

  const handleImport = async () => {
    try {
      const result = await importMut.mutateAsync(VERABILL_SHEET1_RECORDS);
      message.success(
        `Import complete: ${result.imported} created, ${result.skipped} skipped, ${result.needsReview} need review`
      );
    } catch (err) {
      message.error(err?.response?.data?.error || 'Import failed');
    }
  };

  const clearFilters = () => {
    setParams({
      page: 1,
      pageSize: params.pageSize,
      search: '',
      clientName: '',
      property: '',
      workType: '',
      sortBy: 'createdAt',
      sortDir: 'desc',
    });
  };

  const hasActiveFilters = Boolean(
    params.search || params.clientName || params.property || params.workType
  );

  const columns = [
    {
      title: 'Sr.',
      key: 'srNo',
      width: 60,
      align: 'center',
      render: (_, __, idx) => (
        <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: 12 }}>
          {(params.page - 1) * params.pageSize + idx + 1}
        </span>
      ),
    },
    {
      title: 'Work Date',
      dataIndex: 'startDate',
      key: 'startDate',
      sorter: true,
      width: 110,
      render: (date) => (
        <span style={{ color: date ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: 500 }}>
          {date ? formatISTDate(date) : '—'}
        </span>
      ),
    },
    {
      title: 'Client Name',
      dataIndex: 'clientName',
      key: 'clientName',
      sorter: true,
      width: 200,
    },
    {
      title: 'Property',
      dataIndex: 'property',
      key: 'property',
      width: 170,
      render: (text) => (
        <span
          // style={{
          //   display: 'inline-block',
          //   maxWidth: 160,
          //   overflow: 'hidden',
          //   textOverflow: 'ellipsis',
          //   whiteSpace: 'nowrap',
          //   color: '#334155',
          //   fontSize: 13,
          //   fontWeight: 500,
          // }}
          title={text}
        >
          {text || '—'}
        </span>
      ),
    },
    {
      title: 'Zone',
      dataIndex: 'zone',
      key: 'zone',
      width: 130,
      render: (text) => (
        <span style={{ color: text ? '#0f172a' : '#94a3b8', fontSize: 13, fontWeight: 500 }} title={text}>
          {text || '—'}
        </span>
      ),
    },
    {
      title: 'Work Type',
      dataIndex: 'workType',
      key: 'workType',
      width: 125,
      render: (wt) => {
        const type = wt || 'Both';
        if (type === 'Vera Bill') {
          return (
            <Tag
              color="blue"
              style={{
                borderRadius: 6,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
              }}
            >
              <Building2 size={12} />
              Vera Bill
            </Tag>
          );
        }
        if (type === 'Light Bill') {
          return (
            <Tag
              color="gold"
              style={{
                borderRadius: 6,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
              }}
            >
              <Zap size={12} />
              Light Bill
            </Tag>
          );
        }
        return (
          <Tag
            color="purple"
            style={{
              borderRadius: 6,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
            }}
          >
            <Building2 size={11} />
            <Zap size={11} />
            Both
          </Tag>
        );
      },
    },
    {
      title: 'Tenement No.',
      dataIndex: 'tenementNo',
      key: 'tenementNo',
      width: 200,
      render: (text) =>
        text ? (
          <SmcTenementBadge
            tenementNo={text}
            onClick={() => {
              setSelectedTenement(text);
              setSmcModalOpen(true);
            }}
          />
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
        ),
    },
    {
      title: 'Work Description',
      dataIndex: 'workDescription',
      key: 'workDescription',
      width: 220,
      render: (text) => (
        <Tooltip title={text}>
          <span
            style={{
              display: 'inline-block',
              maxWidth: 210,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#475569',
              fontSize: 13,
            }}
          >
            {text || '—'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Fees Recv.',
      dataIndex: 'totalFees',
      key: 'totalFees',
      width: 125,
      align: 'right',
      render: (v) => (
        <span style={{ fontWeight: 700, color: '#059669', fontSize: 13 }}>
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      title: 'Expenses',
      dataIndex: 'totalExpenses',
      key: 'totalExpenses',
      width: 115,
      align: 'right',
      render: (v) => (
        <span
          style={{
            fontWeight: 600,
            color: v > 0 ? '#dc2626' : '#94a3b8',
            fontSize: 13,
          }}
        >
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      title: 'Net Profit',
      dataIndex: 'netBalance',
      key: 'netBalance',
      width: 130,
      align: 'right',
      render: (v) => {
        const val = Number(v) || 0;
        const isPositive = val > 0;
        const isNegative = val < 0;
        return (
          <Tag
            style={{
              fontWeight: 700,
              borderRadius: 8,
              padding: '2px 9px',
              fontSize: 12.5,
              border: 'none',
              backgroundColor: isPositive
                ? '#ecfdf5'
                : isNegative
                  ? '#fef2f2'
                  : '#f1f5f9',
              color: isPositive
                ? '#059669'
                : isNegative
                  ? '#dc2626'
                  : '#64748b',
            }}
          >
            {isPositive ? '+' : ''}
            {formatCurrency(val)}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 165,
      fixed: 'right',
      align: 'center',
      render: (_, record) => {
        const wt = record.workType || 'Both';
        const showVera = wt === 'Vera Bill' || wt === 'Both';
        const showLight = wt === 'Light Bill' || wt === 'Both';

        return (
          <Space size={2}>
            {showVera && (
              <Tooltip title={record.tenementNo ? `Check Vera Bill (${record.tenementNo})` : 'Check Vera Bill (SMC)'}>
                <Button
                  type="text"
                  size="small"
                  icon={<Building2 size={15} color={record.tenementNo ? '#2563eb' : '#64748b'} />}
                  onClick={() => {
                    setSelectedTenement(record.tenementNo || '');
                    setSmcModalOpen(true);
                  }}
                  style={{
                    borderRadius: 6,
                    backgroundColor: record.tenementNo ? '#eff6ff' : 'transparent',
                  }}
                />
              </Tooltip>
            )}

            {showLight && (
              <Tooltip title="Check Light Bill (DGVCL / Torrent Power)">
                <Button
                  type="text"
                  size="small"
                  icon={<Zap size={15} color="#d97706" />}
                  onClick={() => {
                    setSelectedLightBillEntry(record);
                    setLightBillModalOpen(true);
                  }}
                  style={{
                    borderRadius: 6,
                    backgroundColor: '#fefce8',
                  }}
                />
              </Tooltip>
            )}
            <Tooltip title="View details">
              <Button
                type="text"
                size="small"
                icon={<Eye size={15} color="#475569" />}
                onClick={() => setViewing(record)}
                style={{ borderRadius: 6 }}
              />
            </Tooltip>
            <Tooltip title="Edit entry">
              <Button
                type="text"
                size="small"
                icon={<Edit size={15} color="#2563eb" />}
                onClick={() => openEdit(record)}
                style={{ borderRadius: 6 }}
              />
            </Tooltip>
            <Tooltip title="Delete entry">
              <Popconfirm
                title={`Delete record for ${record.clientName}?`}
                description="This will permanently delete this client's bill and fee transactions."
                onConfirm={() => handleDelete(record)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 size={15} color="#dc2626" />}
                  style={{ borderRadius: 6 }}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const handleTableChange = (pagination, filters, sorter) => {
    setParams((p) => ({
      ...p,
      page: pagination.current,
      pageSize: pagination.pageSize,
      sortBy: sorter?.field || p.sortBy,
      sortDir:
        sorter?.order === 'ascend'
          ? 'asc'
          : sorter?.order === 'descend'
            ? 'desc'
            : p.sortDir,
    }));
  };

  const statCards = [
    {
      title: 'Total Clients',
      value: (summary?.totalClients ?? 0).toLocaleString(),
      subtitle: 'Recorded client files',
      icon: <Users size={18} />,
      color: '#2563eb',
      background: '#eff6ff',
      border: '#bfdbfe',
    },
    {
      title: 'Fees Received',
      value: formatCurrency(summary?.totalFeesReceived ?? 0),
      subtitle: 'Gross collected fees',
      icon: <ArrowDownLeft size={18} />,
      color: '#059669',
      background: '#ecfdf5',
      border: '#a7f3d0',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(summary?.totalExpenses ?? 0),
      subtitle: 'Direct officer & work costs',
      icon: <ArrowUpRight size={18} />,
      color: '#dc2626',
      background: '#fef2f2',
      border: '#fecaca',
    },
    {
      title: 'Net Profit',
      value: formatCurrency(summary?.netBalance ?? 0),
      subtitle: 'Total earnings after expenses',
      icon: <Sparkles size={18} />,
      color: (summary?.netBalance ?? 0) >= 0 ? '#16a34a' : '#ea580c',
      background: (summary?.netBalance ?? 0) >= 0 ? '#f0fdf4' : '#fff7ed',
      border: (summary?.netBalance ?? 0) >= 0 ? '#bbf7d0' : '#fed7aa',
    },
  ];

  return (
    <div className="advocate-module verabill-module">
      {/* ── Page Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <Title
            level={3}
            style={{
              margin: 0,
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Receipt size={26} color="#2563eb" />
            Verabill / Light Bill
          </Title>
        </div>

        <Space wrap size={10}>
          <Button
            icon={<Building2 size={15} color="#2563eb" />}
            onClick={() => {
              setSelectedTenement('');
              setSmcModalOpen(true);
            }}
            style={{
              borderRadius: 8,
              height: 40,
              fontWeight: 600,
              borderColor: '#bfdbfe',
              background: '#eff6ff',
              color: '#1d4ed8',
            }}
          >
            SMC View Bill
          </Button>
          <Button
            icon={<Download size={15} />}
            onClick={handleExportPDF}
            loading={isGeneratingPDF}
            style={{
              borderRadius: 8,
              height: 40,
              fontWeight: 600,
              borderColor: '#cbd5e1',
              color: '#334155',
            }}
          >
            Export PDF
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={openCreate}
            style={{
              borderRadius: 8,
              height: 40,
              fontWeight: 600,
              boxShadow: 'none',
              background: '#2563eb',
            }}
          >
            Add New Entry
          </Button>
        </Space>
      </div>

      {/* ── Summary Stat Cards ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} md={12} lg={6} key={card.title}>
            <Card
              className="verabill-stat-card"
              bordered={false}
              style={{
                borderRadius: 12,
                background: card.background,
                border: `1px solid ${card.border}`,
                boxShadow: '0 2px 5px -3px rgba(15, 23, 42, 0.08)',
                height: '100%',
              }}
              styles={{ body: { padding: '12px 14px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.color,
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {card.icon}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text
                    type="secondary"
                    style={{
                      display: 'block',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {card.title}
                  </Text>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: card.color,
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={String(card.value)}
                  >
                    {isSummaryLoading ? '...' : card.value}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10.5, color: '#64748b' }}>
                    {card.subtitle}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Main Data Table ── */}
      <Card
        className="verabill-table-card"
        bordered={false}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          className="modern-dashboard-table verabill-table"
          rowKey="id"
          columns={columns}
          dataSource={entries}
          loading={isLoading}
          pagination={{
            rootClassName: 'verabill-pagination',
            current: params.page,
            pageSize: params.pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t, r) => `${r[0]}-${r[1]} of ${t} entries`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1100, y: 'calc(100vh - 380px)' }}
          styles={{ body: { minHeight: 'calc(100vh - 380px)' } }}
          size="middle"
          locale={{
            emptyText: (
              <EmptyState
                icon={Receipt}
                title="No Verabill records found"
                description={
                  hasActiveFilters
                    ? 'No records match the current filters. Click "Clear" to reset.'
                    : 'Click "Add New Entry" or "Import Sheet1" to get started.'
                }
              />
            ),
          }}
        />
      </Card>

      {/* ── Add / Edit Drawer ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: editing ? '#eff6ff' : '#ecfdf5',
                color: editing ? '#2563eb' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              {editing ? <Edit size={16} /> : <Plus size={16} />}
            </div>
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                {editing ? 'Edit Verabill Entry' : 'Add New Verabill Entry'}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 400 }}>
                Record client details, fee receipts, and direct expenses
              </div>
            </div>
          </div>
        }
        placement="right"
        width={Math.min(840, typeof window !== 'undefined' ? window.innerWidth : 840)}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        destroyOnClose
        styles={{
          wrapper: {
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
            overflow: 'hidden',
          },
          section: {
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
            overflow: 'hidden',
          },
          content: {
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
            overflow: 'hidden',
          },
          header: {
            borderTopLeftRadius: 20,
          },
          footer: {
            borderBottomLeftRadius: 20,
          },
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '4px 0' }}>
            <Button onClick={() => setModalOpen(false)} style={{ borderRadius: 6 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={createMut.isPending || updateMut.isPending}
              style={{ background: '#2563eb', borderColor: '#2563eb', borderRadius: 6, fontWeight: 600 }}
            >
              {editing ? 'Save Changes' : 'Save Entry'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          {/* Client & Work Info */}
          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="startDate"
                label={<span style={{ fontWeight: 600 }}>Work / Start Date</span>}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Select date"
                  style={{ width: '100%', height: 38, borderRadius: 6 }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="clientName"
                label={<span style={{ fontWeight: 600 }}>Client Name</span>}
                rules={[{ required: true, message: 'Please enter client name' }]}
              >
                <TransliterateInput
                  placeholder="દા.ત. રમેશભાઈ પટેલ"
                  style={{ height: 38 }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="property"
                label={<span style={{ fontWeight: 600 }}>Property / Address</span>}
                rules={[{ required: true, message: 'Please enter property' }]}
              >
                <TransliterateInput
                  placeholder="દા.ત. પ્લોટ નં. ૧૨, વરાછા"
                  style={{ height: 38 }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="zone"
                label={<span style={{ fontWeight: 600 }}>Zone (SMC)</span>}
              >
                <TransliterateInput
                  placeholder="દા.ત. વરાછા / East Zone"
                  style={{ height: 38 }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="workType"
                label={<span style={{ fontWeight: 600 }}>Type of Work</span>}
                initialValue="Both"
              >
                <Select
                  style={{ height: 38 }}
                  options={[
                    {
                      value: 'Vera Bill',
                      label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                          <Building2 size={14} color="#2563eb" />
                          <span>Vera Bill (વેરા બિલ)</span>
                        </div>
                      ),
                    },
                    {
                      value: 'Light Bill',
                      label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                          <Zap size={14} color="#d97706" />
                          <span>Light Bill (લાઈટ બિલ)</span>
                        </div>
                      ),
                    },
                    {
                      value: 'Both',
                      label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                          <div style={{ display: 'flex', gap: 2 }}>
                            <Building2 size={13} color="#2563eb" />
                            <Zap size={13} color="#d97706" />
                          </div>
                          <span>Both (બંને - Vera + Light)</span>
                        </div>
                      ),
                    },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="workDescription"
                label={<span style={{ fontWeight: 600 }}>Work Description</span>}
                rules={[{ required: true, message: 'Please enter work description' }]}
              >
                <TransliterateInput
                  placeholder="દા.ત. Verabill + Lightbill"
                  style={{ height: 38 }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24}>
              <Form.Item
                name="tenementNo"
                label={
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={15} color="#2563eb" />
                    Tenement No. (SMC Surat Municipal Corporation)
                  </span>
                }
              >
                <SmcTenementInput />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Fees & Expenses Tabbed Section ── */}
          <div style={{ marginTop: 6, marginBottom: 8 }}>
            <Tabs
              activeKey={formTabKey}
              onChange={setFormTabKey}
              type="card"
              size="small"
              tabBarExtraContent={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>Net:</span>
                    <Tag
                      color={modalNetBalance >= 0 ? 'success' : 'warning'}
                      style={{
                        borderRadius: 6,
                        fontWeight: 800,
                        fontSize: 12,
                        padding: '1px 8px',
                        marginInlineEnd: 0,
                      }}
                    >
                      {modalNetBalance >= 0 ? '+' : ''}
                      {formatCurrency(modalNetBalance)}
                    </Tag>
                  </div>

                  {formTabKey === 'fees' ? (
                    <Form.Item noStyle>
                      <Form.List name="fees">
                        {(fields, { add }) => (
                          <Button
                            type="primary"
                            size="small"
                            onClick={() =>
                              add({ amount: undefined, receivedBy: '', transactionDate: null, description: '' })
                            }
                            icon={<Plus size={13} />}
                            style={{
                              background: '#059669',
                              borderColor: '#059669',
                              fontWeight: 600,
                              borderRadius: 6,
                              fontSize: 12,
                              height: 28,
                            }}
                          >
                            Add Fee
                          </Button>
                        )}
                      </Form.List>
                    </Form.Item>
                  ) : (
                    <Form.Item noStyle>
                      <Form.List name="expenses">
                        {(fields, { add }) => (
                          <Button
                            type="primary"
                            danger
                            size="small"
                            onClick={() =>
                              add({ amount: undefined, expensePerson: '', expenseDate: null, description: '' })
                            }
                            icon={<Plus size={13} />}
                            style={{
                              background: '#dc2626',
                              borderColor: '#dc2626',
                              fontWeight: 600,
                              borderRadius: 6,
                              fontSize: 12,
                              height: 28,
                            }}
                          >
                            Add Expense
                          </Button>
                        )}
                      </Form.List>
                    </Form.Item>
                  )}
                </div>
              }
              items={[
                {
                  key: 'fees',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px' }}>
                      <ArrowDownLeft size={14} color="#059669" />
                      <span style={{ fontWeight: 700, color: '#065f46' }}>Fees Received</span>
                      <Tag
                        color="success"
                        style={{
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 11,
                          padding: '0 6px',
                          marginInlineEnd: 0,
                          backgroundColor: '#ecfdf5',
                          borderColor: '#a7f3d0',
                        }}
                      >
                        {watchedFees.length} • {formatCurrency(modalTotalFees)}
                      </Tag>
                    </div>
                  ),
                  children: (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '0 8px 8px 8px',
                        padding: '8px 10px',
                      }}
                    >

                      <Form.List name="fees">
                        {(fields, { remove, add }) => (
                          <>
                            {fields.length === 0 ? (
                              <div
                                style={{
                                  textAlign: 'center',
                                  color: '#6b7280',
                                  padding: '16px 0',
                                  fontSize: 12.5,
                                  background: '#ffffff',
                                  borderRadius: 6,
                                  border: '1px dashed #a7f3d0',
                                }}
                              >
                                <span>No fee payments added yet. </span>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() =>
                                    add({ amount: undefined, receivedBy: '', transactionDate: null, description: '' })
                                  }
                                  style={{ padding: 0, fontWeight: 700, color: '#059669' }}
                                >
                                  + Click here to add fee
                                </Button>
                              </div>
                            ) : (
                              fields.map((field) => (
                                <Row
                                  gutter={8}
                                  key={field.key}
                                  align="middle"
                                  style={{
                                    marginBottom: 6,
                                    background: '#ffffff',
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #d1fae5',
                                  }}
                                >
                                  <Col xs={24} sm={5}>
                                    <Form.Item
                                      name={[field.name, 'amount']}
                                      rules={[{ required: true, message: 'Required' }]}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <InputNumber
                                        min={0.01}
                                        step={100}
                                        precision={2}
                                        prefix="₹"
                                        placeholder="Amount"
                                        style={{ width: '100%', borderRadius: 6 }}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={12} sm={5}>
                                    <Form.Item name={[field.name, 'receivedBy']} style={{ marginBottom: 0 }}>
                                      <Input placeholder="Received By" style={{ borderRadius: 6 }} />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={12} sm={5}>
                                    <Form.Item name={[field.name, 'transactionDate']} style={{ marginBottom: 0 }}>
                                      <DatePicker
                                        format="DD/MM/YYYY"
                                        placeholder="Date"
                                        style={{ width: '100%', borderRadius: 6 }}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={20} sm={8}>
                                    <Form.Item name={[field.name, 'description']} style={{ marginBottom: 0 }}>
                                      <Input placeholder="Description" style={{ borderRadius: 6 }} />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={4} sm={1} style={{ textAlign: 'center' }}>
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<Trash2 size={14} />}
                                      onClick={() => remove(field.name)}
                                    />
                                  </Col>
                                </Row>
                              ))
                            )}
                          </>
                        )}
                      </Form.List>
                    </div>
                  ),
                },
                {
                  key: 'expenses',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px' }}>
                      <ArrowUpRight size={14} color="#dc2626" />
                      <span style={{ fontWeight: 700, color: '#991b1b' }}>Expenses</span>
                      <Tag
                        color={watchedExpenses.length > 0 ? 'error' : 'default'}
                        style={{
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 11,
                          padding: '0 6px',
                          marginInlineEnd: 0,
                          backgroundColor: watchedExpenses.length > 0 ? '#fef2f2' : '#f8fafc',
                          borderColor: watchedExpenses.length > 0 ? '#fecaca' : '#e2e8f0',
                        }}
                      >
                        {watchedExpenses.length} • {formatCurrency(modalTotalExpenses)}
                      </Tag>
                    </div>
                  ),
                  children: (
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '0 8px 8px 8px',
                        padding: '8px 10px',
                      }}
                    >
                      <Form.List name="expenses">
                        {(fields, { remove, add }) => (
                          <>
                            {fields.length === 0 ? (
                              <div
                                style={{
                                  textAlign: 'center',
                                  color: '#6b7280',
                                  padding: '16px 0',
                                  fontSize: 12.5,
                                  background: '#ffffff',
                                  borderRadius: 6,
                                  border: '1px dashed #fecaca',
                                }}
                              >
                                <span>No expenses recorded yet. </span>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() =>
                                    add({ amount: undefined, expensePerson: '', expenseDate: null, description: '' })
                                  }
                                  style={{ padding: 0, fontWeight: 700, color: '#dc2626' }}
                                >
                                  + Click here to add expense
                                </Button>
                              </div>
                            ) : (
                              fields.map((field) => (
                                <Row
                                  gutter={8}
                                  key={field.key}
                                  align="middle"
                                  style={{
                                    marginBottom: 6,
                                    background: '#ffffff',
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #fee2e2',
                                  }}
                                >
                                  <Col xs={24} sm={5}>
                                    <Form.Item
                                      name={[field.name, 'amount']}
                                      rules={[{ required: true, message: 'Required' }]}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <InputNumber
                                        min={0.01}
                                        step={100}
                                        precision={2}
                                        prefix="₹"
                                        placeholder="Amount"
                                        style={{ width: '100%', borderRadius: 6 }}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={12} sm={5}>
                                    <Form.Item name={[field.name, 'expensePerson']} style={{ marginBottom: 0 }}>
                                      <Input placeholder="Expense Person" style={{ borderRadius: 6 }} />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={12} sm={5}>
                                    <Form.Item name={[field.name, 'expenseDate']} style={{ marginBottom: 0 }}>
                                      <DatePicker
                                        format="DD/MM/YYYY"
                                        placeholder="Date"
                                        style={{ width: '100%', borderRadius: 6 }}
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={20} sm={8}>
                                    <Form.Item name={[field.name, 'description']} style={{ marginBottom: 0 }}>
                                      <Input placeholder="Description" style={{ borderRadius: 6 }} />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={4} sm={1} style={{ textAlign: 'center' }}>
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<Trash2 size={14} />}
                                      onClick={() => remove(field.name)}
                                    />
                                  </Col>
                                </Row>
                              ))
                            )}
                          </>
                        )}
                      </Form.List>
                    </div>
                  ),
                },
              ]}
            />
          </div>

        </Form>
      </Drawer>

      {/* ── View Details Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                {viewing?.clientName || 'Verabill Entry Details'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {viewing?.property || 'Property Details'}
              </div>
            </div>
          </div>
        }
        open={Boolean(viewing)}
        onCancel={() => setViewing(null)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Created: {viewing?.createdAt ? formatISTDate(viewing.createdAt) : '—'}
            </span>
            <Space>
              <Button onClick={() => setViewing(null)} style={{ borderRadius: 6 }}>
                Close
              </Button>
              <Button
                icon={<Download size={14} />}
                onClick={() => handleExportSinglePDF(viewing)}
                loading={isGeneratingSinglePDF}
                style={{ borderRadius: 6, fontWeight: 600, color: '#334155' }}
              >
                Export PDF
              </Button>
              <Button
                type="primary"
                icon={<Edit size={14} />}
                onClick={() => {
                  const toEdit = viewing;
                  setViewing(null);
                  openEdit(toEdit);
                }}
                style={{ background: '#2563eb', borderRadius: 6 }}
              >
                Edit Entry
              </Button>
            </Space>
          </div>
        }
        width={780}
      >
        {viewing && (
          <div style={{ marginTop: 14 }}>
            {/* Quick Metrics Bar */}
            <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card
                  bordered={false}
                  style={{ background: '#ecfdf5', borderRadius: 10, textAlign: 'center' }}
                  styles={{ body: { padding: '10px 8px' } }}
                >
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#047857' }}>
                    FEES RECEIVED
                  </Text>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#065f46' }}>
                    {formatCurrency(viewing.totalFees)}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card
                  bordered={false}
                  style={{ background: '#fef2f2', borderRadius: 10, textAlign: 'center' }}
                  styles={{ body: { padding: '10px 8px' } }}
                >
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#b91c1c' }}>
                    EXPENSES
                  </Text>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#991b1b' }}>
                    {formatCurrency(viewing.totalExpenses)}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card
                  bordered={false}
                  style={{
                    background: Number(viewing.netBalance) >= 0 ? '#f0fdf4' : '#fff7ed',
                    borderRadius: 10,
                    textAlign: 'center',
                  }}
                  styles={{ body: { padding: '10px 8px' } }}
                >
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: Number(viewing.netBalance) >= 0 ? '#15803d' : '#c2410c',
                    }}
                  >
                    NET PROFIT
                  </Text>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: Number(viewing.netBalance) >= 0 ? '#166534' : '#9a3412',
                    }}
                  >
                    {Number(viewing.netBalance) >= 0 ? '+' : ''}
                    {formatCurrency(viewing.netBalance)}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Client & Work Info Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <Row gutter={[12, 8]}>
                <Col span={6}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    WORK / START DATE
                  </Text>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                    {viewing.startDate ? formatISTDate(viewing.startDate) : '—'}
                  </div>
                </Col>
                <Col span={6}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    ZONE
                  </Text>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                    {viewing.zone || '—'}
                  </div>
                </Col>
                <Col span={6}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    TYPE OF WORK
                  </Text>
                  <div style={{ marginTop: 2 }}>
                    {viewing.workType === 'Vera Bill' && (
                      <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Building2 size={12} /> Vera Bill
                      </Tag>
                    )}
                    {viewing.workType === 'Light Bill' && (
                      <Tag color="gold" style={{ borderRadius: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Zap size={12} /> Light Bill
                      </Tag>
                    )}
                    {(!viewing.workType || viewing.workType === 'Both') && (
                      <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Building2 size={11} /> <Zap size={11} /> Both
                      </Tag>
                    )}
                  </div>
                </Col>
                <Col span={6}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    WORK DESCRIPTION
                  </Text>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                    {viewing.workDescription || '—'}
                  </div>
                </Col>
                {viewing.tenementNo && (
                  <Col span={24}>
                    <div
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 8,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginTop: 4,
                      }}
                    >
                      <div>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#1d4ed8' }}>
                          SMC TENEMENT NO. (SURAT MUNICIPAL CORPORATION)
                        </Text>
                        <div style={{ marginTop: 4 }}>
                          <SmcTenementBadge
                            tenementNo={viewing.tenementNo}
                            style={{ fontSize: 13, padding: '4px 10px', background: '#ffffff' }}
                          />
                        </div>
                      </div>
                      <Button
                        type="primary"
                        icon={<Building2 size={14} />}
                        onClick={() => {
                          setSelectedTenement(viewing.tenementNo);
                          setSmcModalOpen(true);
                        }}
                        style={{
                          background: '#2563eb',
                          borderColor: '#2563eb',
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        Check SMC Bill
                      </Button>
                    </div>
                  </Col>
                )}
              </Row>
            </div>

            {/* Fee Transactions */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowDownLeft size={16} color="#059669" />
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
                    Fee Transactions
                  </span>
                </div>
                <Tag color="success" style={{ borderRadius: 8, fontWeight: 600 }}>
                  {(viewing.fees || []).length} records
                </Tag>
              </div>
              <Table
                size="small"
                rowKey="id"
                dataSource={viewing.fees || []}
                pagination={false}
                bordered
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'transactionDate',
                    width: 100,
                    render: (v) => (v ? formatISTDate(v) : '—'),
                  },
                  {
                    title: 'Amount',
                    dataIndex: 'amount',
                    width: 120,
                    align: 'right',
                    render: (v) => (
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        {formatCurrency(v)}
                      </span>
                    ),
                  },
                  {
                    title: 'Received By',
                    dataIndex: 'receivedBy',
                    width: 150,
                    render: (v) => v || '—',
                  },
                  {
                    title: 'Description',
                    dataIndex: 'description',
                    render: (v) => v || '—',
                  },
                ]}
                locale={{ emptyText: 'No fees recorded for this entry' }}
              />
            </div>

            {/* Expense Transactions */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowUpRight size={16} color="#dc2626" />
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
                    Expense Transactions
                  </span>
                </div>
                <Tag color="error" style={{ borderRadius: 8, fontWeight: 600 }}>
                  {(viewing.expenses || []).length} records
                </Tag>
              </div>
              <Table
                size="small"
                rowKey="id"
                dataSource={viewing.expenses || []}
                pagination={false}
                bordered
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'expenseDate',
                    width: 100,
                    render: (v) => (v ? formatISTDate(v) : '—'),
                  },
                  {
                    title: 'Amount',
                    dataIndex: 'amount',
                    width: 120,
                    align: 'right',
                    render: (v) => (
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>
                        {formatCurrency(v)}
                      </span>
                    ),
                  },
                  {
                    title: 'Expense Person',
                    dataIndex: 'expensePerson',
                    width: 150,
                    render: (v) => v || '—',
                  },
                  {
                    title: 'Description',
                    dataIndex: 'description',
                    render: (v) => v || '—',
                  },
                ]}
                locale={{ emptyText: 'No expenses recorded for this entry' }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Hidden Off-Screen Layouts for PDF Generation ── */}
      <div
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          pointerEvents: 'none',
          zIndex: -100,
        }}
      >
        <div ref={printRef}>
          <VerabillPrintLayout
            entries={exportEntries || entries}
            summary={summary}
            filterLabel={
              params.search
                ? `Search: "${params.search}"`
                : params.clientName
                  ? `Client: ${params.clientName}`
                  : params.workType
                    ? `Work: ${params.workType}`
                    : 'All Records'
            }
          />
        </div>

        <div ref={singlePrintRef}>
          {viewing && <VerabillSingleEntryPrintLayout entry={viewing} />}
        </div>
      </div>

      {/* ── Surat Municipal Corporation Property Tax View Bill Modal ── */}
      <SmcViewBillModal
        open={smcModalOpen}
        onClose={() => {
          setSmcModalOpen(false);
          setSelectedTenement('');
        }}
        tenementNo={selectedTenement}
      />

      {/* ── Check Light Bill Modal (DGVCL / Torrent Power) ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#fefce8',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Check Electricity / Light Bill
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {selectedLightBillEntry?.clientName} — {selectedLightBillEntry?.property || 'Surat'}
              </div>
            </div>
          </div>
        }
        open={lightBillModalOpen}
        onCancel={() => {
          setLightBillModalOpen(false);
          setSelectedLightBillEntry(null);
        }}
        footer={null}
        width={520}
        centered
      >
        <div style={{ padding: '12px 0 6px' }}>
          <p style={{ color: '#475569', fontSize: 13, marginBottom: 16 }}>
            Select the electricity provider in Surat to view and verify the light bill:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                border: '1px solid #fed7aa',
                borderRadius: 10,
                padding: '14px 16px',
                background: '#fffaf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#9a3412', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={15} color="#ea580c" />
                  DGVCL (GUVNL Portal)
                </div>
                <div style={{ fontSize: 12, color: '#7c2d12', marginTop: 2 }}>
                  Dakshin Gujarat Vij Company Ltd — GUVNL Consumer Portal
                </div>
              </div>
              <Button
                type="primary"
                icon={<ExternalLink size={14} />}
                onClick={() => window.open('https://portal.guvnl.in/login.php', '_blank', 'noopener,noreferrer')}
                style={{ background: '#ea580c', borderColor: '#ea580c', borderRadius: 6, fontWeight: 600 }}
              >
                Open DGVCL
              </Button>
            </div>

            <div
              style={{
                border: '1px solid #bfdbfe',
                borderRadius: 10,
                padding: '14px 16px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={15} color="#2563eb" />
                  Torrent Power (Surat)
                </div>
                <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
                  Torrent Power Surat City Portal & Quick Payment
                </div>
              </div>
              <Button
                type="primary"
                icon={<ExternalLink size={14} />}
                onClick={() => window.open('https://connect.torrentpower.com/tplcp/blockedmodule', '_blank', 'noopener,noreferrer')}
                style={{ background: '#2563eb', borderColor: '#2563eb', borderRadius: 6, fontWeight: 600 }}
              >
                Open Torrent
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
import { useState, useMemo } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
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
} from 'lucide-react';
import dayjs from 'dayjs';
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
  const [form] = Form.useForm();

  // Watch modal form fields for live net calculation
  const watchedFees = Form.useWatch('fees', form) || [];
  const watchedExpenses = Form.useWatch('expenses', form) || [];
  const watchedAdditionalIncome = Form.useWatch('additionalIncome', form);

  const modalTotalFees = useMemo(() => {
    return (watchedFees || []).reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
  }, [watchedFees]);

  const modalTotalExpenses = useMemo(() => {
    return (watchedExpenses || []).reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
  }, [watchedExpenses]);

  const modalAdditionalIncome = Number(watchedAdditionalIncome) || 0;
  const modalNetBalance = modalTotalFees - modalTotalExpenses + modalAdditionalIncome;

  const entries = data?.entries || [];
  const total = data?.total || 0;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      startDate: dayjs(),
      clientName: '',
      property: '',
      workDescription: '',
      remarks: '',
      additionalIncome: undefined,
      incomeDescription: '',
      fees: [{ amount: undefined, receivedBy: '', transactionDate: null, description: '' }],
      expenses: [],
    });
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditing(entry);
    form.resetFields();
    form.setFieldsValue({
      startDate: entry.startDate ? dayjs(toISTDateString(entry.startDate)) : null,
      clientName: entry.clientName,
      property: entry.property,
      workDescription: entry.workDescription,
      remarks: entry.remarks || '',
      additionalIncome: entry.additionalIncome != null ? Number(entry.additionalIncome) : undefined,
      incomeDescription: entry.incomeDescription || '',
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
        workDescription: values.workDescription?.trim(),
        remarks: values.remarks?.trim() || '',
        additionalIncome:
          values.additionalIncome !== undefined && values.additionalIncome !== null && values.additionalIncome !== ''
            ? Number(values.additionalIncome)
            : null,
        incomeDescription: values.incomeDescription?.trim() || '',
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
      title: 'Add. Income',
      dataIndex: 'additionalIncome',
      key: 'additionalIncome',
      width: 115,
      align: 'right',
      render: (v) => (
        <span
          style={{
            fontWeight: 600,
            color: v && v > 0 ? '#0d9488' : '#94a3b8',
            fontSize: 13,
          }}
        >
          {v == null || v === 0 ? '—' : formatCurrency(v)}
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
      width: 115,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size={2}>
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
      ),
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
      title: 'Additional Income',
      value: formatCurrency(summary?.totalAdditionalIncome ?? 0),
      subtitle: 'Extra service receipts',
      icon: <TrendingUp size={18} />,
      color: '#0891b2',
      background: '#ecfeff',
      border: '#a5f3fc',
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
        {statCards.map((card, idx) => (
          <Col xs={24} sm={12} md={12} lg={idx === 0 ? 4 : 5} key={card.title}>
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
            current: params.page,
            pageSize: params.pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t, r) => `${r[0]}-${r[1]} of ${t} entries`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1100, y: 'calc(100vh - 380px)' }}
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

      {/* ── Add / Edit Modal ── */}
      <Modal
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
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Save Changes' : 'Save Entry'}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okButtonProps={{ style: { background: '#2563eb', borderColor: '#2563eb' } }}
        width={880}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
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
            <Col xs={24} sm={14}>
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
            <Col xs={24} sm={10}>
              <Form.Item
                name="remarks"
                label={<span style={{ fontWeight: 600 }}>Remarks (Optional)</span>}
              >
                <TransliterateInput
                  placeholder="દા.ત. ૧૦ દિવસમાં કામ પૂર્ણ થશે"
                  style={{ height: 38 }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Fees Section */}
          <div className="verabill-form-section section-fees">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowDownLeft size={17} color="#059669" />
                <span style={{ fontWeight: 700, color: '#065f46', fontSize: 14 }}>
                  Fees Received
                </span>
                <Tag color="success" style={{ borderRadius: 10, fontWeight: 600 }}>
                  {watchedFees.length} entries
                </Tag>
              </div>
              <Form.Item noStyle>
                <Form.List name="fees">
                  {(fields, { add }) => (
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() =>
                        add({ amount: undefined, receivedBy: '', transactionDate: null, description: '' })
                      }
                      icon={<Plus size={13} />}
                      style={{
                        borderColor: '#059669',
                        color: '#059669',
                        fontWeight: 600,
                        borderRadius: 6,
                      }}
                    >
                      Add Fee
                    </Button>
                  )}
                </Form.List>
              </Form.Item>
            </div>

            <Form.List name="fees">
              {(fields, { remove }) => (
                <>
                  {fields.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: '12px 0', fontSize: 13 }}>
                      No fees added yet. Click &quot;Add Fee&quot; above to record a payment.
                    </div>
                  ) : (
                    fields.map((field) => (
                      <Row
                        gutter={8}
                        key={field.key}
                        align="middle"
                        style={{
                          marginBottom: 8,
                          background: '#ffffff',
                          padding: '8px 10px',
                          borderRadius: 8,
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

          {/* Expenses Section */}
          <div className="verabill-form-section section-expenses">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowUpRight size={17} color="#dc2626" />
                <span style={{ fontWeight: 700, color: '#991b1b', fontSize: 14 }}>
                  Expenses
                </span>
                <Tag color="error" style={{ borderRadius: 10, fontWeight: 600 }}>
                  {watchedExpenses.length} entries
                </Tag>
              </div>
              <Form.Item noStyle>
                <Form.List name="expenses">
                  {(fields, { add }) => (
                    <Button
                      type="dashed"
                      size="small"
                      onClick={() =>
                        add({ amount: undefined, expensePerson: '', expenseDate: null, description: '' })
                      }
                      icon={<Plus size={13} />}
                      style={{
                        borderColor: '#dc2626',
                        color: '#dc2626',
                        fontWeight: 600,
                        borderRadius: 6,
                      }}
                    >
                      Add Expense
                    </Button>
                  )}
                </Form.List>
              </Form.Item>
            </div>

            <Form.List name="expenses">
              {(fields, { remove }) => (
                <>
                  {fields.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: '12px 0', fontSize: 13 }}>
                      No expenses added yet. Click &quot;Add Expense&quot; to log work expenses.
                    </div>
                  ) : (
                    fields.map((field) => (
                      <Row
                        gutter={8}
                        key={field.key}
                        align="middle"
                        style={{
                          marginBottom: 8,
                          background: '#ffffff',
                          padding: '8px 10px',
                          borderRadius: 8,
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

          {/* Additional Income */}
          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="additionalIncome"
                label={<span style={{ fontWeight: 600 }}>Additional Income (₹)</span>}
              >
                <InputNumber
                  min={0}
                  step={100}
                  precision={2}
                  prefix="₹"
                  placeholder="0.00"
                  style={{ width: '100%', borderRadius: 6, height: 38 }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item
                name="incomeDescription"
                label={<span style={{ fontWeight: 600 }}>Income Description</span>}
              >
                <TransliterateInput
                  placeholder="દા.ત. એડિશનલ સર્વિસ ચાર્જ"
                  style={{ height: 38 }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Live Net Balance Footer Strip */}
          {/* <div className="verabill-live-summary-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>Fees:</span>
              <span style={{ fontWeight: 700, color: '#34d399', fontSize: 14 }}>
                {formatCurrency(modalTotalFees)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>Expenses:</span>
              <span style={{ fontWeight: 700, color: '#f87171', fontSize: 14 }}>
                {formatCurrency(modalTotalExpenses)}
              </span>
            </div>
            {modalAdditionalIncome > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>Add. Income:</span>
                <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: 14 }}>
                  {formatCurrency(modalAdditionalIncome)}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600 }}>Net Balance:</span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: modalNetBalance >= 0 ? '#4ade80' : '#fb923c',
                }}
              >
                {modalNetBalance >= 0 ? '+' : ''}
                {formatCurrency(modalNetBalance)}
              </span>
            </div>
          </div> */}
        </Form>
      </Modal>

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
              <Col span={6}>
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
              <Col span={6}>
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
              <Col span={6}>
                <Card
                  bordered={false}
                  style={{ background: '#ecfeff', borderRadius: 10, textAlign: 'center' }}
                  styles={{ body: { padding: '10px 8px' } }}
                >
                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, color: '#0e7490' }}>
                    ADD. INCOME
                  </Text>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#155e75' }}>
                    {viewing.additionalIncome != null ? formatCurrency(viewing.additionalIncome) : '—'}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
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
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    WORK / START DATE
                  </Text>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                    {viewing.startDate ? formatISTDate(viewing.startDate) : '—'}
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    WORK DESCRIPTION
                  </Text>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                    {viewing.workDescription || '—'}
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    REMARKS
                  </Text>
                  <div style={{ color: '#475569', fontSize: 13 }}>
                    {viewing.remarks || 'No remarks recorded.'}
                  </div>
                </Col>
                {viewing.incomeDescription && (
                  <Col span={24}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                      INCOME DESCRIPTION
                    </Text>
                    <div style={{ color: '#0284c7', fontSize: 13, fontWeight: 500 }}>
                      {viewing.incomeDescription}
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
    </div>
  );
}
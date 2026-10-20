import React, { useState, useMemo } from 'react';
import {
  Typography,
  Input,
  Button,
  Table,
  Space,
  Card,
  Modal,
  message,
  Tag,
  Select,
  Grid,
  Row,
  Col,
  Form,
  DatePicker,
  Popconfirm,
  Tooltip,
  Badge,
} from 'antd';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileCheck,
  ExternalLink,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  X,
} from 'lucide-react';
import { IndicTransliterate } from '@ai4bharat/indic-transliterate';
import dayjs from 'dayjs';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../utils/currency';

import {
  useNondhStatuses,
  useCreateNondhStatus,
  useUpdateNondhStatus,
  useDeleteNondhStatus,
} from '../../hooks/useNondhStatus';

const { Title, Text } = Typography;
const { Option } = Select;

// Custom Transliterate Input component compatible with Ant Design Form.Item
function TransliterateInput({
  value,
  onChange,
  onBlur,
  placeholder,
  style,
  className = '',
  list,
  type = 'text',
  ref: fieldRef,
  ...rest
}) {
  return (
    <IndicTransliterate
      containerClassName="transliterate-wrapper"
      containerStyles={{ width: '100%' }}
      renderComponent={({ ref: innerRef, ...renderProps }) => (
        <input
          {...renderProps}
          // React 19 passes refs as regular props. antd's Form.Item injects its
          // own ref for scrollToField support; if we forward it to
          // IndicTransliterate it overrides the library's internal input ref,
          // and the library silently stops fetching suggestions. Keep both refs.
          ref={(node) => {
            if (typeof innerRef === 'function') innerRef(node);
            else if (innerRef) innerRef.current = node;

            if (typeof fieldRef === 'function') fieldRef(node);
            else if (fieldRef) fieldRef.current = node;
          }}
          list={list}
          type={type}
          onBlur={(e) => {
            if (renderProps.onBlur) renderProps.onBlur(e);
            if (onBlur) onBlur(e);
          }}
          className={`custom-transliterate-input ant-input ${className}`}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: 38,
            borderRadius: 8,
            fontSize: '14px',
            ...style,
          }}
        />
      )}
      value={value !== undefined && value !== null ? String(value) : ''}
      onChangeText={(text) => {
        if (onChange) {
          onChange(text);
        }
      }}
      lang="gu"
      {...rest}
    />
  );
}

const DEFAULT_DOCUMENT_TYPES = [
  'હક કમી',
  'બીજા હકક દાખલ',
  'વહેંચણી',
  'સુધારો',
  'વારસાઈ',
  'હુકમ',
  'હયાતીમા હક દાખલ',
  'હયાતીમા વહેંચણી',
  'બોજા મુક્તિ',
  'વેચાણ',
];

export default function NondhStatusList() {
  const { data: serverRecords = [], isLoading } = useNondhStatuses();
  const createMutation = useCreateNondhStatus();
  const updateMutation = useUpdateNondhStatus();
  const deleteMutation = useDeleteNondhStatus();

  const data = serverRecords;

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [doneFilter, setDoneFilter] = useState('');
  const [referenceFilter, setReferenceFilter] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;

  // Curated document types for the dropdown
  const documentTypeOptions = DEFAULT_DOCUMENT_TYPES;

  // Derive custom statuses from existing records for dropdown options
  const existingCustomStatuses = useMemo(() => {
    const defaultStatuses = ['પ્રમાણિત', 'કાચી નોંધ', '૧૩૫-ડી નોટીસ', 'તકરારી નોંધ', 'નામંજૂર'];
    const custom = new Set();
    data.forEach((item) => {
      if (item.status && !defaultStatuses.includes(item.status)) {
        custom.add(item.status);
      }
    });
    return Array.from(custom);
  }, [data]);

  // Derive unique references for filter dropdown
  const uniqueReferences = useMemo(() => {
    const set = new Set();
    data.forEach((item) => {
      if (item.referenceName && item.referenceName !== '-') {
        set.add(item.referenceName.trim());
      }
    });
    return Array.from(set).sort();
  }, [data]);

  const handleOpenModal = (record = null) => {
    setEditingRecord(record);
    if (record) {
      form.setFieldsValue({
        ...record,
        'No.': record.number,
        number: record.number,
        date: record.date ? dayjs(record.date) : null,
        paymentDate: record.paymentDate ? dayjs(record.paymentDate) : null,
      });
    } else {
      form.resetFields();
      // calculate next number based on highest current number
      const maxNum = (data || []).reduce((max, item) => Math.max(max, Number(item.number) || 0), 0);
      const nextNum = maxNum > 0 ? maxNum + 1 : 1;
      form.setFieldsValue({
        'No.': nextNum,
        number: nextNum,
        date: dayjs(),
        status: 'પ્રમાણિત',
        doneOrNot: 'Done',
      });
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const rawNum = values['No.'] !== undefined ? values['No.'] : values.number;
      const numVal = Number(String(rawNum).replace(/[^0-9]/g, '')) || (data.length + 1);

      const rawFee = values.vahivatFee !== undefined && values.vahivatFee !== null ? String(values.vahivatFee).trim() : '';
      const feeVal = rawFee ? Number(rawFee.replace(/[^0-9.]/g, '')) : null;

      const formatted = {
        number: numVal,
        placeName: values.placeName ? String(values.placeName).trim() : '',
        documentType: values.documentType ? String(values.documentType).trim() : '',
        nondhNumber: values.nondhNumber !== undefined && values.nondhNumber !== null ? String(values.nondhNumber).trim() : '',
        date: values.date ? values.date.format('YYYY-MM-DD') : null,
        partyName: values.partyName ? String(values.partyName).trim() : '',
        status: values.status ? String(values.status).trim() : 'પ્રમાણિત',
        referenceName: values.referenceName ? String(values.referenceName).trim() : '',
        doneOrNot: values.doneOrNot || '-',
        vahivatFee: feeVal !== null && !isNaN(feeVal) ? feeVal : null,
        paymentDate: values.paymentDate ? values.paymentDate.format('YYYY-MM-DD') : null,
      };

      if (editingRecord) {
        await updateMutation.mutateAsync({
          id: editingRecord.id,
          ...formatted,
        });
        message.success('Record updated successfully');
      } else {
        await createMutation.mutateAsync(formatted);
        message.success('New Nondh entry added successfully');
      }
      handleCloseModal();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.error || 'Failed to save record');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success('Record deleted');
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to delete record');
    }
  };

  // Filtered & Sorted Data
  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        if (!item || (!item.number && !item.nondhNumber && !item.partyName)) {
          return false;
        }

        // Filter by Done or not
        if (doneFilter) {
          if (doneFilter === 'Done' && item.doneOrNot !== 'Done') return false;
          if (doneFilter === 'Pending' && item.doneOrNot === 'Done') return false;
        }

        // Filter by Status
        if (statusFilter && (!item.status || !item.status.includes(statusFilter))) {
          return false;
        }

        // Filter by Reference Name
        if (referenceFilter && item.referenceName !== referenceFilter) {
          return false;
        }

        // Search text matching
        const q = searchText.trim().toLowerCase();
        if (!q) return true;

        return (
          String(item.number).toLowerCase().includes(q) ||
          (item.placeName && item.placeName.toLowerCase().includes(q)) ||
          (item.documentType && item.documentType.toLowerCase().includes(q)) ||
          (item.nondhNumber && item.nondhNumber.toLowerCase().includes(q)) ||
          (item.partyName && item.partyName.toLowerCase().includes(q)) ||
          (item.status && item.status.toLowerCase().includes(q)) ||
          (item.referenceName && item.referenceName.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
  }, [data, searchText, doneFilter, referenceFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    let totalFee = 0;
    let doneCount = 0;
    let pendingCount = 0;

    data.forEach((item) => {
      if (item.vahivatFee) {
        totalFee += Number(item.vahivatFee);
      }
      if (item.doneOrNot === 'Done') {
        doneCount += 1;
      } else {
        pendingCount += 1;
      }
    });

    return {
      total: data.length,
      doneCount,
      pendingCount,
      totalFee,
    };
  }, [data]);

  // Table Columns matching the user's requested specification:
  // number, Place name, Type of document, Nondh Number, Date, Party Name, Status, Reference Name, Done or not, Vahivat Fee, Payment Date
  const columns = [
    {
      title: 'No. ',
      dataIndex: 'number',
      key: 'number',
      width: 75,
      fixed: 'left',
      align: 'center',
      sorter: (a, b) => (Number(a.number) || 0) - (Number(b.number) || 0),
      render: (val) => (
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
          {val}
        </span>
      ),
    },
    {
      title: 'Place name',
      dataIndex: 'placeName',
      key: 'placeName',
      width: 130,
      render: (text) => (
        <span style={{ fontWeight: 700, color: '#000080', fontSize: '14px' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'Type of document',
      dataIndex: 'documentType',
      key: 'documentType',
      width: 180,
      render: (text) => (
        <span style={{ fontWeight: 700, color: '#000080', fontSize: '13.5px' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'Nondh Number',
      dataIndex: 'nondhNumber',
      key: 'nondhNumber',
      width: 150,
      align: 'center',
      render: (text) => (
        <span style={{ fontWeight: 700, color: '#000080', fontSize: '14px' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 105,
      align: 'center',
      render: (date) => (
        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
          {date ? dayjs(date).format('M/D/YY') : '-'}
        </span>
      ),
    },
    {
      title: 'Party Name',
      dataIndex: 'partyName',
      key: 'partyName',
      width: 220,
      render: (text) => (
        <span style={{ fontWeight: 700, color: '#000080', fontSize: '13.5px' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 190,
      align: 'center',
      render: (text) => (
        <span style={{ fontWeight: 700, color: '#000080', fontSize: '13.5px' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'Reference',
      dataIndex: 'referenceName',
      key: 'referenceName',
      width: 130,
      align: 'center',
      render: (text) => (
        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'Done Status',
      dataIndex: 'doneOrNot',
      key: 'doneOrNot',
      width: 140,
      align: 'center',
      render: (val) => {
        if (val === 'Done') {
          return (
            <Tag color="success" style={{ fontWeight: 600, borderRadius: 10, padding: '2px 10px' }}>
              Done
            </Tag>
          );
        }
        return <span style={{ color: '#94a3b8', fontWeight: 600 }}>{val || '-'}</span>;
      },
    },
    {
      title: 'Vahivat',
      dataIndex: 'vahivatFee',
      key: 'vahivatFee',
      width: 110,
      align: 'center',
      render: (val) => (
        <span style={{ fontWeight: 600, color: val ? '#0f172a' : '#94a3b8', fontSize: '13px' }}>
          {val ? Number(val).toLocaleString('en-IN') : '-'}
        </span>
      ),
    },
    {
      title: 'Pay. Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 115,
      align: 'center',
      render: (date) => (
        <span style={{ fontWeight: 500, color: date ? '#0f172a' : '#94a3b8', fontSize: '13px' }}>
          {date ? dayjs(date).format('M/D/YY') : '-'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<Edit size={15} color="#2563eb" />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete Entry"
              description="Are you sure you want to delete this record?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<Trash2 size={15} />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="advocate-module">
      {/* Header section */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: 16,
          gap: 16,
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
            <FileCheck size={26} color="#2563eb" />
            Nondh Status
          </Title>
        </div>

        <Space wrap style={{ width: isMobile ? '100%' : 'auto' }}>
          <Button
            href="https://anyror.gujarat.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            icon={<ExternalLink size={15} />}
            style={{ borderRadius: '8px', height: 40 }}
          >
            AnyRoR Portal
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => handleOpenModal()}
            style={{ borderRadius: '8px', height: 40, boxShadow: 'none' }}
            block={isMobile}
          >
            Add New Entry
          </Button>
        </Space>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ marginBottom: 16, position: 'relative', zIndex: 20 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={9}>
            <IndicTransliterate
              containerClassName="transliterate-wrapper"
              containerStyles={{ width: '100%' }}
              renderComponent={(renderProps) => (
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />
                  <input
                    {...renderProps}
                    className="custom-transliterate-input ant-input"
                    placeholder="Search by Place, Type, Nondh No, Party Name, Reference..."
                    style={{
                      paddingLeft: 36,
                      paddingRight: searchText ? 32 : 12,
                      borderRadius: 8,
                      height: 40,
                      width: '100%',
                    }}
                  />
                  {searchText && (
                    <button
                      type="button"
                      onClick={() => setSearchText('')}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 2,
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
              value={searchText}
              onChangeText={setSearchText}
              lang="gu"
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="Filter by Status"
              allowClear
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
              style={{ width: '100%', height: 40 }}
            >
              <Option value="પ્રમાણિત">પ્રમાણિત (Certified)</Option>
              <Option value="કાચી નોંધ">કાચી નોંધ (Pending)</Option>
              <Option value="૧૩૫-ડી નોટીસ">૧૩૫-ડી નોટીસ (135-D Notice)</Option>
              <Option value="તકરારી નોંધ">તકરારી નોંધ (Dispute)</Option>
              <Option value="નામંજૂર">નામંજૂર (Rejected)</Option>
            </Select>
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="Filter Done / Not"
              allowClear
              value={doneFilter || undefined}
              onChange={(val) => setDoneFilter(val || '')}
              style={{ width: '100%', height: 40 }}
            >
              <Option value="Done">Done</Option>
              <Option value="Pending">Pending / Other</Option>
            </Select>
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="Filter by Reference"
              allowClear
              value={referenceFilter || undefined}
              onChange={(val) => setReferenceFilter(val || '')}
              style={{ width: '100%', height: 40 }}
            >
              {uniqueReferences.map((ref) => (
                <Option key={ref} value={ref}>
                  {ref}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>

      {/* Main Table */}
      <Card
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', position: 'relative', zIndex: 1 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          className="modern-dashboard-table nondh-status-table"
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
          pagination={{ pageSize: 15, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} entries` }}
          scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
          size="middle"
          bordered
          locale={{
            emptyText: (
              <EmptyState
                icon={FileCheck}
                title="No Nondh entries found"
                description="Click 'Add New Entry' to record a new mutation entry."
              />
            ),
          }}
        />
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            {editingRecord ? 'Edit Nondh Status Entry' : 'Add New Nondh Status Entry'}
          </div>
        }
        open={isModalVisible}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingRecord ? 'Save Changes' : 'Add Entry'}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="No."
                label="Number"
                rules={[{ required: true, message: 'Please enter number' }]}
              >
                <TransliterateInput placeholder="e.g. 59" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="placeName"
                label="Place name"
                rules={[{ required: true, message: 'Please enter place name' }]}
              >
                <TransliterateInput placeholder="e.g. લોલીંગા, હાદીડા" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="documentType"
                label="Type of document"
                rules={[{ required: true, message: 'Please select document type' }]}
              >
                <Select
                  placeholder="Select type of document"
                  options={documentTypeOptions.map((name) => ({ label: name, value: name }))}
                  showSearch
                  optionFilterProp="label"
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="nondhNumber"
                label="Nondh Number"
                rules={[{ required: true, message: 'Please enter Nondh number' }]}
              >
                <Input placeholder="e.g. 3711" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="status"
                label="Status (સ્થિતિ)"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select placeholder="Select Status (સ્થિતિ)" showSearch allowClear>
                  <Option value="પ્રમાણિત">પ્રમાણિત (Certified)</Option>
                  <Option value="કાચી નોંધ">કાચી નોંધ (Pending)</Option>
                  <Option value="૧૩૫-ડી નોટીસ">૧૩૫-ડી નોટીસ (135-D Notice)</Option>
                  <Option value="તકરારી નોંધ">તકરારી નોંધ (Dispute)</Option>
                  <Option value="નામંજૂર">નામંજૂર (Rejected)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="partyName"
            label="Party Name (પક્ષકારનું નામ)"
            rules={[{ required: true, message: 'Please enter party name' }]}
          >
            <TransliterateInput placeholder="e.g. ધીરજલાલ રાઘવભાઈ જીકાદરા" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="referenceName" label="Reference Name (રેફરન્સ)">
                <TransliterateInput placeholder="e.g. Joshi, N.K. Vala, Prakash" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="doneOrNot" label="Done or not (કામ સ્થિતિ)">
                <Select placeholder="Select Done or -">
                  <Option value="Done">Done</Option>
                  <Option value="Pending">Pending</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="vahivatFee" label="Vahivat Fee (વહીવટ ફી)">
                <Input placeholder="e.g. 2500" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="paymentDate" label="Payment Date (ચૂકવણી તારીખ)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

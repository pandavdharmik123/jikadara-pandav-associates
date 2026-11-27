import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Typography,
} from 'antd';
import {
  Search,
  FolderOpen,
  Copy,
  Trash2,
  FileDown,
  FileText,
  Plus,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  fetchSurfacyCases,
  duplicateSurfacyCase,
  deleteSurfacyCase,
  downloadSurfacyDocx,
  downloadSurfacyPdf,
} from '../surfacyApi';

const { Text } = Typography;

const STATUS_META = {
  DRAFT: { label: 'Draft', color: 'default' },
  READY_FOR_REVIEW: { label: 'Ready for Review', color: 'processing' },
  FINALIZED: { label: 'Finalized', color: 'success' },
};

export default function SurfacyCaseListModal({
  open,
  onClose,
  onSelectCase,
  onCreateNew,
}) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await fetchSurfacyCases(params);
      setCases(res.cases || []);
    } catch {
      message.error('Failed to load saved Surfacy filings');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (open) loadCases();
  }, [open, loadCases]);

  const handleDuplicate = async (record) => {
    try {
      await duplicateSurfacyCase(record.id);
      message.success('Case duplicated as Draft');
      loadCases();
    } catch {
      message.error('Failed to duplicate case');
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteSurfacyCase(record.id);
      message.success('Case deleted');
      loadCases();
    } catch {
      message.error('Failed to delete case');
    }
  };

  const handleDownloadPdf = async (record) => {
    try {
      await downloadSurfacyPdf(record.id, record.caseTitle);
      message.success('PDF downloaded');
    } catch (err) {
      const serverMsg = err?.response?.data?.error;
      message.error(serverMsg || 'PDF conversion failed. Open the case and use Preview Print / Save as PDF.');
    }
  };

  const columns = [
    {
      title: 'Case Title',
      dataIndex: 'caseTitle',
      key: 'caseTitle',
      render: (val, record) => (
        <div>
          <Text strong style={{ color: '#0f172a' }}>{val}</Text>
          {record.applicationNumber && (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              App No: {record.applicationNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Applicant',
      dataIndex: 'applicantName',
      key: 'applicantName',
      render: (val) => val || '—',
    },
    {
      title: 'Opponent',
      dataIndex: 'opponentName',
      key: 'opponentName',
      render: (val) => val || '—',
    },
    {
      title: 'Court',
      dataIndex: 'courtName',
      key: 'courtName',
      render: (val) => val || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const meta = STATUS_META[status] || STATUS_META.DRAFT;
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (d) => dayjs(d).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            type="primary"
            icon={<FolderOpen size={13} />}
            onClick={() => {
              onSelectCase(record.id);
              onClose();
            }}
          >
            Open
          </Button>
          <Button
            size="small"
            icon={<Copy size={13} />}
            title="Duplicate Case"
            onClick={() => handleDuplicate(record)}
          />
          <Button
            size="small"
            icon={<FileText size={13} />}
            title="Download DOCX"
            onClick={() => downloadSurfacyDocx(record.id, record.caseTitle)}
          />
          <Button
            size="small"
            icon={<FileDown size={13} />}
            title="Download PDF"
            onClick={() => handleDownloadPdf(record)}
          />
          <Popconfirm
            title="Delete this filing?"
            description="This case will be moved out of your active Surfacy filings."
            onConfirm={() => handleDelete(record)}
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<Trash2 size={13} />} title="Delete Case" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Saved Surfacy Case Filings"
      width={1040}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="new"
          type="primary"
          icon={<Plus size={14} />}
          onClick={() => {
            onCreateNew();
            onClose();
          }}
        >
          Create New Filing
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Input
          placeholder="Search case title, applicant, opponent, court, application no..."
          prefix={<Search size={14} color="#94a3b8" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240 }}
          allowClear
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 180 }}
          options={[
            { value: 'ALL', label: 'All Statuses' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'READY_FOR_REVIEW', label: 'Ready for Review' },
            { value: 'FINALIZED', label: 'Finalized' },
          ]}
        />
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={cases}
        columns={columns}
        size="small"
        pagination={{ pageSize: 8 }}
        scroll={{ x: 850 }}
      />
    </Modal>
  );
}

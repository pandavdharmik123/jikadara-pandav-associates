import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
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
  RefreshCw,
  Landmark,
  Files,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  fetchMoeDocuments,
  duplicateMoeDocument,
  deleteMoeDocument,
  downloadMoeDocx,
  downloadMoePdf,
} from '../moeApi';

const { Text } = Typography;

const STATUS_META = {
  DRAFT: { label: 'Draft', color: 'default' },
  READY_FOR_REVIEW: { label: 'Ready for Review', color: 'processing' },
  FINALIZED: { label: 'Finalized', color: 'success' },
};

export default function MoeSavedDrawer({ open, onClose, onSelectDoc, onCreateNew, onChanged }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await fetchMoeDocuments(params);
      setDocs(res.documents || []);
    } catch {
      message.error('Failed to load saved MOE documents');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (open) loadDocs();
  }, [open, loadDocs]);

  const handleDuplicate = async (record) => {
    try {
      await duplicateMoeDocument(record.id);
      message.success('MOE document duplicated as Draft');
      loadDocs();
      onChanged?.();
    } catch {
      message.error('Failed to duplicate document');
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteMoeDocument(record.id);
      message.success('MOE document deleted');
      loadDocs();
      onChanged?.();
    } catch {
      message.error('Failed to delete document');
    }
  };

  const handleDownloadPdf = async (record) => {
    try {
      await downloadMoePdf(record.id, record.documentTitle);
      message.success('PDF downloaded');
    } catch (err) {
      message.error(err?.response?.data?.error || 'PDF conversion failed. Open the document and use Preview Print.');
    }
  };

  const columns = [
    {
      title: 'Document Title',
      dataIndex: 'documentTitle',
      key: 'documentTitle',
      render: (val) => <Text strong style={{ color: '#0f172a' }}>{val}</Text>,
    },
    {
      title: 'Security Provider',
      dataIndex: 'securityProviderName',
      key: 'securityProviderName',
      render: (val) => val || '—',
    },
    {
      title: 'Borrower',
      dataIndex: 'borrowerName',
      key: 'borrowerName',
      render: (val) => val || '—',
    },
    {
      title: 'Bank',
      dataIndex: 'bankName',
      key: 'bankName',
      render: (val) => val || '—',
    },
    {
      title: 'Deposit Date',
      dataIndex: 'depositDate',
      key: 'depositDate',
      render: (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '—'),
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
      title: 'Created By',
      key: 'createdBy',
      render: (_, r) => r.user?.name || '—',
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
      width: 220,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            type="primary"
            icon={<FolderOpen size={13} />}
            onClick={() => {
              onSelectDoc(record.id);
              onClose();
            }}
          >
            Open
          </Button>
          <Button size="small" icon={<Copy size={13} />} title="Duplicate" onClick={() => handleDuplicate(record)} />
          <Button size="small" icon={<FileText size={13} />} title="Download DOCX" onClick={() => downloadMoeDocx(record.id, record.documentTitle)} />
          <Button size="small" icon={<FileDown size={13} />} title="Download PDF" onClick={() => handleDownloadPdf(record)} />
          <Popconfirm
            title="Delete this MOE document?"
            description="This document will be removed from your active MOE list."
            onConfirm={() => handleDelete(record)}
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<Trash2 size={13} />} title="Delete" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={1140}
      destroyOnClose={false}
      classNames={{
        root: 'saved-drawer',
        section: 'saved-drawer-panel',
        header: 'saved-drawer-header',
        body: 'saved-drawer-body',
      }}
      title={
        <div className="saved-drawer-heading">
          <span className="saved-drawer-heading-icon">
            <Landmark size={17} />
          </span>
          <span className="saved-drawer-heading-text">
            <span className="saved-drawer-heading-title">Saved MOE Documents</span>
            <span className="saved-drawer-heading-sub">Mortgage Filing – Memorandum of Agreement</span>
          </span>
        </div>
      }
      extra={
        <Button
          type="primary"
          size="small"
          icon={<Plus size={14} />}
          onClick={() => {
            onCreateNew();
            onClose();
          }}
        >
          Create New MOE
        </Button>
      }
    >
      <div className="saved-drawer-toolbar">
        <div className="saved-drawer-count">
          <Files size={14} />
          <span>{docs.length} saved MOE document{docs.length === 1 ? '' : 's'}</span>
        </div>
        <Button type="text" size="small" className="saved-drawer-refresh" icon={<RefreshCw size={14} />} loading={loading} onClick={loadDocs} />
      </div>

      <div className="saved-drawer-filters" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Input
          className="saved-drawer-search"
          placeholder="Search title, security provider, borrower, bank..."
          prefix={<Search size={14} style={{ color: '#94a3b8' }} />}
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

      <div className="saved-drawer-table" style={{ minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={docs}
          columns={columns}
          size="small"
          pagination={{ pageSize: 8 }}
          scroll={{ x: 960 }}
        />
      </div>
    </Drawer>
  );
}

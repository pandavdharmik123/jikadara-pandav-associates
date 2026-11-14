import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Button, Space, Typography, Popconfirm, message, Tag, Input, Segmented } from 'antd';
import { Trash2, Download, Upload, FolderOpen, Copy, Search, RefreshCw, Database } from 'lucide-react';
import api from '../../../services/api';
import { ensureUnicode } from '../utils/unicodeUtils';

const { Text } = Typography;

export default function SavedDraftsModal({
  visible,
  onClose,
  onLoadDraft,
  currentData,
  currentDraftId = null
}) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'ALIVE' | 'DECEASED'

  const fetchDrafts = async () => {
    setLoading(true);
    // Remove any legacy local backup drafts from storage
    try {
      localStorage.removeItem('pedhinamu_saved_drafts');
    } catch (_) { }

    try {
      const res = await api.get('/pedhinamu');
      if (res.data && res.data.pedhinamus) {
        const serverDrafts = res.data.pedhinamus.map((d) => ({
          id: d.id,
          title: ensureUnicode(d.title) || 'Untitled Pedhinamu',
          applicantName: ensureUnicode(d.applicantName || d.documentData?.applicant?.name) || '-',
          deceasedName: ensureUnicode(d.deceasedName || d.documentData?.deceased?.name || d.documentData?.tree?.rootNode?.name) || '-',
          moje: ensureUnicode(d.documentData?.general?.moje) || '-',
          taluka: ensureUnicode(d.documentData?.general?.taluka) || '-',
          pedhinamuType: d.documentData?.pedhinamuType || 'DECEASED',
          documentData: d.documentData,
          updatedAt: d.updatedAt
        }));
        setDrafts(serverDrafts);
      } else {
        setDrafts([]);
      }
    } catch (err) {
      console.error('Could not fetch drafts from database:', err);
      message.error('Failed to load drafts from database');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchDrafts();
    }
  }, [visible]);

  // Load a draft into the active workspace with its ID
  const handleLoad = async (record) => {
    try {
      let docData = record.documentData;
      if (!docData) {
        const res = await api.get(`/pedhinamu/${record.id}`);
        docData = res.data?.pedhinamu?.documentData;
      }

      if (docData) {
        onLoadDraft(docData, record.title, record.id);
        message.success(`Loaded "${record.title}" from database`);
        onClose();
      } else {
        message.error('Document data not found');
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to load draft');
    }
  };

  // Delete a draft (soft-delete to recycle bin)
  const handleDelete = async (record) => {
    try {
      await api.delete(`/pedhinamu/${record.id}`);
      message.success('Draft moved to Recycle Bin');
      fetchDrafts();
    } catch (err) {
      console.error(err);
      message.error('Failed to delete draft');
    }
  };

  // Clone a draft in database
  const handleClone = async (record) => {
    try {
      await api.post(`/pedhinamu/${record.id}/clone`);
      message.success(`Cloned draft "${record.title}"`);
      fetchDrafts();
    } catch (err) {
      console.error('Clone failed:', err);
      message.error('Failed to clone draft');
    }
  };

  // Export current draft as JSON file
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(currentData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pedhinamu_${currentData?.applicant?.name || 'Draft'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.applicant && parsed.deceased && parsed.tree) {
          onLoadDraft(parsed, file.name.replace('.json', ''), null);
          message.success('Imported Pedhinamu data successfully');
          onClose();
        } else {
          message.error('Invalid Pedhinamu JSON structure');
        }
      } catch (err) {
        message.error('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered drafts
  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      // Type filter
      if (typeFilter !== 'ALL' && d.pedhinamuType !== typeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (d.title || '').toLowerCase().includes(q);
        const matchApplicant = (d.applicantName || '').toLowerCase().includes(q);
        const matchDeceased = (d.deceasedName || '').toLowerCase().includes(q);
        const matchMoje = (d.moje || '').toLowerCase().includes(q);
        return matchTitle || matchApplicant || matchDeceased || matchMoje;
      }
      return true;
    });
  }, [drafts, typeFilter, searchQuery]);

  const columns = [
    {
      title: 'Title / શીર્ષક',
      dataIndex: 'title',
      key: 'title',
      render: (text, r) => {
        const isCurrent = currentDraftId && currentDraftId === r.id;
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong>{text}</Text>
              {isCurrent && (
                <Tag color="purple" style={{ fontSize: 11, padding: '0 4px', lineHeight: '18px' }}>
                  Open
                </Tag>
              )}
            </div>
            {r.moje && r.moje !== '-' && (
              <div style={{ marginTop: 2 }}>
                <Tag color="cyan" style={{ fontSize: 11 }}>
                  મોજે: {r.moje}
                </Tag>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Applicant / અરજદાર',
      dataIndex: 'applicantName',
      key: 'applicantName',
      render: (text) => text || '-'
    },
    {
      title: 'Type / પ્રકાર',
      dataIndex: 'pedhinamuType',
      key: 'pedhinamuType',
      width: 140,
      render: (type) => (
        <Tag color={type === 'ALIVE' ? 'success' : 'default'}>
          {type === 'ALIVE' ? '🟢 Alive (હયાતી)' : '🔴 Deceased (સ્વર્ગસ્થ)'}
        </Tag>
      )
    },
    {
      title: 'Person / વ્યક્તિ',
      dataIndex: 'deceasedName',
      key: 'deceasedName',
      render: (text) => text || '-'
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 110,
      render: (val) => (val ? new Date(val).toLocaleDateString('en-GB') : '-')
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      width: 130,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            icon={<FolderOpen size={13} />}
            onClick={() => handleLoad(record)}
            style={{ backgroundColor: '#4f46e5' }}
          >
            Load
          </Button>

          <Button
            type="text"
            size="small"
            title="Duplicate / Clone"
            icon={<Copy size={13} />}
            onClick={() => handleClone(record)}
          />

          <Popconfirm
            title="Delete this draft?"
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button type="text" danger size="small" icon={<Trash2 size={13} />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <Database size={18} style={{ color: '#4f46e5' }} />
          <span>Saved Pedhinamu Drafts / સંગ્રહિત પેઢીનામા</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={860}
      footer={[
        <div key="footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button icon={<Download size={14} />} onClick={handleExportJSON}>
              Export JSON
            </Button>
            <label style={{ cursor: 'pointer' }}>
              <Button
                icon={<Upload size={14} />}
                onClick={() => document.getElementById('pedhinamu-json-import-input')?.click()}
              >
                Import JSON
              </Button>
              <input
                id="pedhinamu-json-import-input"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportJSON}
              />
            </label>
            <Button icon={<RefreshCw size={14} />} onClick={fetchDrafts} loading={loading}>
              Refresh
            </Button>
          </Space>
          <Button onClick={onClose}>Close</Button>
        </div>
      ]}
    >
      {/* Search & Filter Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, marginTop: 4, flexWrap: 'wrap' }}>
        <Input
          placeholder="Search by title, applicant, deceased, or village..."
          prefix={<Search size={14} style={{ color: '#94a3b8' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          style={{ flex: 1, minWidth: 240 }}
        />

        <Segmented
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { label: 'All', value: 'ALL' },
            { label: 'Deceased (સ્વર્ગસ્થ)', value: 'DECEASED' },
            { label: 'Alive (હયાતી)', value: 'ALIVE' }
          ]}
        />
      </div>

      <Table
        dataSource={filteredDrafts}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 6, showTotal: (total) => `Total ${total} drafts` }}
      />
    </Modal>
  );
}

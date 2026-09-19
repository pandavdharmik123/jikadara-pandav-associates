import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Space, Typography, Popconfirm, message, Tag } from 'antd';
import { Trash2, Download, Upload, FolderOpen } from 'lucide-react';
import api from '../../../services/api';

const { Text } = Typography;

export default function SavedDraftsModal({
  visible,
  onClose,
  onLoadDraft,
  currentData
}) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      // 1. Fetch server drafts
      let serverDrafts = [];
      try {
        const res = await api.get('/pedhinamu');
        if (res.data && res.data.pedhinamus) {
          serverDrafts = res.data.pedhinamus.map((d) => ({
            id: d.id,
            title: d.title || 'Untitled Pedhinamu',
            applicantName: d.applicantName || '-',
            deceasedName: d.deceasedName || '-',
            source: 'cloud',
            updatedAt: d.updatedAt
          }));
        }
      } catch (err) {
        console.warn('Could not fetch server drafts:', err.message);
      }

      // 2. Fetch local storage drafts
      const localDraftsRaw = localStorage.getItem('pedhinamu_saved_drafts');
      let localDrafts = [];
      if (localDraftsRaw) {
        try {
          const parsed = JSON.parse(localDraftsRaw);
          localDrafts = Object.keys(parsed).map((key) => {
            const item = parsed[key];
            return {
              id: key,
              title: item.title || 'Local Draft',
              applicantName: item.data?.applicant?.name || '-',
              deceasedName: item.data?.deceased?.name || '-',
              source: 'local',
              data: item.data,
              updatedAt: item.updatedAt || new Date().toISOString()
            };
          });
        } catch (e) {
          console.error(e);
        }
      }

      setDrafts([...serverDrafts, ...localDrafts]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchDrafts();
    }
  }, [visible]);

  const handleLoad = async (record) => {
    try {
      if (record.source === 'local' && record.data) {
        onLoadDraft(record.data, record.title);
        message.success(`Loaded draft "${record.title}"`);
        onClose();
        return;
      }

      if (record.source === 'cloud') {
        const res = await api.get(`/pedhinamu/${record.id}`);
        if (res.data?.pedhinamu?.documentData) {
          onLoadDraft(res.data.pedhinamu.documentData, res.data.pedhinamu.title);
          message.success(`Loaded draft "${record.title}" from cloud`);
          onClose();
        }
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to load draft');
    }
  };

  const handleDelete = async (record) => {
    try {
      if (record.source === 'local') {
        const localDraftsRaw = localStorage.getItem('pedhinamu_saved_drafts');
        if (localDraftsRaw) {
          const parsed = JSON.parse(localDraftsRaw);
          delete parsed[record.id];
          localStorage.setItem('pedhinamu_saved_drafts', JSON.stringify(parsed));
        }
      } else {
        await api.delete(`/pedhinamu/${record.id}`);
      }
      message.success('Draft deleted');
      fetchDrafts();
    } catch (err) {
      console.error(err);
      message.error('Failed to delete draft');
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
          onLoadDraft(parsed, file.name.replace('.json', ''));
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

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, r) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ marginTop: 2 }}>
            <Tag color={r.source === 'cloud' ? 'blue' : 'green'}>
              {r.source === 'cloud' ? 'Cloud' : 'Local'}
            </Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Applicant / અરજદાર',
      dataIndex: 'applicantName',
      key: 'applicantName'
    },
    {
      title: 'Deceased / સ્વર્ગસ્થ',
      dataIndex: 'deceasedName',
      key: 'deceasedName'
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (val) => val ? new Date(val).toLocaleDateString('en-GB') : '-'
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<FolderOpen size={13} />}
            onClick={() => handleLoad(record)}
          >
            Load
          </Button>
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
      title="Saved Pedhinamu Drafts / સંગ્રહિત પેઢીનામા"
      open={visible}
      onCancel={onClose}
      width={780}
      footer={[
        <Space key="footer-actions">
          <Button icon={<Download size={14} />} onClick={handleExportJSON}>
            Export Current (JSON)
          </Button>
          <label style={{ cursor: 'pointer' }}>
            <Button icon={<Upload size={14} />} onClick={() => document.getElementById('pedhinamu-json-import-input')?.click()}>
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
          <Button onClick={onClose}>Close</Button>
        </Space>
      ]}
    >
      <Table
        dataSource={drafts}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 5 }}
      />
    </Modal>
  );
}

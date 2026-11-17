import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Button, Space, Typography, Popconfirm, message, Tag, Input, Segmented } from 'antd';
import { Trash2, FolderOpen, Copy, Search, RefreshCw, Database } from 'lucide-react';
import api from '../../../services/api';

const { Text } = Typography;

export default function SavedJantriModal({
  visible,
  onClose,
  onLoadCalculation,
  currentCalculationId = null
}) {
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'ખુલ્લો પ્લોટ' | 'ફ્લેટ' | 'દુકાન' | 'ખેતી ની જમીન'

  const fetchCalculations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/jantri');
      if (res.data && res.data.calculations) {
        setCalculations(res.data.calculations);
      } else {
        setCalculations([]);
      }
    } catch (err) {
      console.error('Could not fetch jantri calculations from database:', err);
      message.error('Failed to load calculations from database');
      setCalculations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchCalculations();
    }
  }, [visible]);

  // Load a calculation into the active calculator workspace
  const handleLoad = async (record) => {
    try {
      let calcData = record.calculationData;
      if (!calcData) {
        const res = await api.get(`/jantri/${record.id}`);
        calcData = res.data?.calculation?.calculationData;
      }

      if (calcData) {
        onLoadCalculation(calcData, record.title, record.id);
        message.success(`Loaded "${record.title}" into calculator`);
        onClose();
      } else {
        message.error('Calculation data not found');
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to load calculation');
    }
  };

  // Delete a calculation (soft-delete to recycle bin)
  const handleDelete = async (record) => {
    try {
      await api.delete(`/jantri/${record.id}`);
      message.success('Calculation moved to Recycle Bin');
      fetchCalculations();
    } catch (err) {
      console.error(err);
      message.error('Failed to delete calculation');
    }
  };

  // Clone a calculation in database
  const handleClone = async (record) => {
    try {
      await api.post(`/jantri/${record.id}/clone`);
      message.success(`Cloned calculation "${record.title}"`);
      fetchCalculations();
    } catch (err) {
      console.error(err);
      message.error('Failed to clone calculation');
    }
  };

  // Format currency
  const formatMoney = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '0';
    return Math.round(Number(val)).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Filter calculations based on search query and property type
  const filteredCalculations = useMemo(() => {
    let result = calculations;

    if (typeFilter !== 'ALL') {
      result = result.filter((c) => c.propertyType === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const titleMatch = (c.title || '').toLowerCase().includes(q);
        const clientMatch = (c.clientName || '').toLowerCase().includes(q);
        const detailsMatch = (c.propertyDetails || '').toLowerCase().includes(q);
        const villageMatch = (c.village || '').toLowerCase().includes(q);
        const typeMatch = (c.propertyType || '').toLowerCase().includes(q);
        return titleMatch || clientMatch || detailsMatch || villageMatch || typeMatch;
      });
    }

    return result;
  }, [calculations, searchQuery, typeFilter]);

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => {
        const isCurrent = record.id === currentCalculationId;
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong style={{ color: isCurrent ? '#4f46e5' : undefined }}>
                {text || 'Untitled Jantri'}
              </Text>
              {isCurrent && (
                <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                  Active
                </Tag>
              )}
            </div>
            {record.propertyType && (
              <Tag color="blue" style={{ fontSize: 11, marginTop: 4 }}>
                {record.propertyType}
              </Tag>
            )}
          </div>
        );
      }
    },
    {
      title: 'Buyer / Client',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (text) => text || '-'
    },
    {
      title: 'Village & Details',
      key: 'location',
      render: (_, r) => (
        <div>
          <Text strong>{r.village || '-'}</Text>
          {r.propertyDetails && (
            <div style={{ fontSize: 11, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.propertyDetails}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Final Value (અવેજ)',
      dataIndex: 'finalValue',
      key: 'finalValue',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#059669' }}>
          ₹ {formatMoney(val)}
        </Text>
      )
    },
    {
      title: 'Total Duty & Fee',
      dataIndex: 'totalFee',
      key: 'totalFee',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#4f46e5' }}>
          ₹ {formatMoney(val)}
        </Text>
      )
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
      width: 140,
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
            title="Delete this calculation?"
            description="It will be moved to the Recycle Bin."
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
          <span>Saved Jantri Calculations</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      centered
      destroyOnClose
      styles={{ body: { padding: '16px 0 0 0' } }}
      bodyStyle={{ padding: '16px 0 0 0' }}
    >
      <div>
        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
            <Input
              placeholder="Search by buyer, village, title..."
              prefix={<Search size={14} style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              style={{ maxWidth: 320 }}
            />

            <Segmented
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: 'All', value: 'ALL' },
                { label: 'ખુલ્લો પ્લોટ', value: 'ખુલ્લો પ્લોટ' },
                { label: 'ફ્લેટ', value: 'ફ્લેટ' },
                { label: 'દુકાન', value: 'દુકાન' },
                { label: 'ખેતી ની જમીન', value: 'ખેતી ની જમીન' }
              ]}
            />
          </div>

          <Button
            icon={<RefreshCw size={14} />}
            onClick={fetchCalculations}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        {/* Calculations Table - Full width with min-height 500px and footer pinned at end */}
        <div className="saved-jantri-modal-table" style={{ minHeight: 500, display: 'flex', flexDirection: 'column' }}>
          <style>{`
            .saved-jantri-modal-table {
              min-height: 500px;
              display: flex;
              flex-direction: column;
            }
            .saved-jantri-modal-table .ant-table-wrapper {
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            .saved-jantri-modal-table .ant-spin-nested-loading {
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            .saved-jantri-modal-table .ant-spin-container {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .saved-jantri-modal-table .ant-table {
              flex: 1;
            }
            .saved-jantri-modal-table .ant-table-container {
              min-height: 500px;
            }
            .saved-jantri-modal-table .ant-pagination {
              margin: 12px 0px 0px 0px !important;
              padding: 0 24px !important;
            }
          `}</style>

          <Table
            size="middle"
            rowKey="id"
            columns={columns}
            dataSource={filteredCalculations}
            scroll={{ x: 'max-content', y: 'calc(100vh - 120px)' }}
            loading={loading}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              showTotal: (total) => <span style={{ color: '#64748b', fontSize: 13 }}>Total <strong>{total}</strong> calculations</span>,
              style: { margin: '16px 24px 16px 0', marginTop: 'auto' }
            }}
            locale={{ emptyText: 'No saved calculations found' }}
          />
        </div>
      </div>
    </Modal>
  );
}

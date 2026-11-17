import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Table, Button, Space, Popconfirm, message, Tag, Input, Typography } from 'antd';
import { Trash2, FolderOpen, Copy, Search, RefreshCw, Calculator, Files } from 'lucide-react';
import api from '../../../services/api';
import '../../../styles/savedDrawer.scss';

export default function SavedMortgageModal({
  visible,
  onClose,
  onLoadCalculation,
  currentCalculationId = null
}) {
  const { Text } = Typography;
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCalculations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/mortgageStampDuty');
      if (res.data && res.data.calculations) {
        setCalculations(res.data.calculations);
      } else {
        setCalculations([]);
      }
    } catch (err) {
      console.error('Could not fetch mortgage calculations from database:', err);
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
        const res = await api.get(`/mortgageStampDuty/${record.id}`);
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
      await api.delete(`/mortgageStampDuty/${record.id}`);
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
      await api.post(`/mortgageStampDuty/${record.id}/clone`);
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

  const filteredCalculations = useMemo(() => {
    if (!searchQuery.trim()) return calculations;
    const q = searchQuery.toLowerCase().trim();
    return calculations.filter((c) => {
      const titleMatch = (c.title || '').toLowerCase().includes(q);
      const clientMatch = (c.clientName || '').toLowerCase().includes(q);
      const detailsMatch = (c.propertyDetails || '').toLowerCase().includes(q);
      return titleMatch || clientMatch || detailsMatch;
    });
  }, [calculations, searchQuery]);

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
                {text || 'Untitled Mortgage Calculation'}
              </Text>
              {isCurrent && (
                <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                  Active
                </Tag>
              )}
            </div>
            {record.propertyDetails && (
              <div style={{ fontSize: 11, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                {record.propertyDetails}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Old Party',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (text) => text || '-'
    },
    {
      title: 'Loan Amount',
      dataIndex: 'loanAmount',
      key: 'loanAmount',
      align: 'right',
      render: (val) => (
        <Text style={{ color: '#0f172a' }}>
          ₹ {formatMoney(val)}
        </Text>
      )
    },
    {
      title: 'Sanction Date',
      dataIndex: 'sanctionDate',
      key: 'sanctionDate',
      width: 110,
      render: (val) => (val ? new Date(val).toLocaleDateString('en-GB') : '-')
    },
    {
      title: 'Grand Total',
      dataIndex: 'grandTotal',
      key: 'grandTotal',
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
    <Drawer
      open={visible}
      onClose={onClose}
      placement="right"
      width={1100}
      destroyOnClose={false}
      classNames={{
        root: 'saved-drawer',
        section: 'saved-drawer-panel',
        header: 'saved-drawer-header',
        body: 'saved-drawer-body'
      }}
      title={
        <div className="saved-drawer-heading">
          <span className="saved-drawer-heading-icon">
            <Calculator size={17} />
          </span>
          <span className="saved-drawer-heading-text">
            <span className="saved-drawer-heading-title">Saved Calculations</span>
            <span className="saved-drawer-heading-sub">Mortgage Stamp Duty</span>
          </span>
        </div>
      }
    >
      {/* Toolbar: count + refresh */}
      <div className="saved-drawer-toolbar">
        <div className="saved-drawer-count">
          <Files size={14} />
          <span>
            {filteredCalculations.length} saved calculation{filteredCalculations.length === 1 ? '' : 's'}
          </span>
        </div>
        <Button
          type="text"
          size="small"
          className="saved-drawer-refresh"
          icon={<RefreshCw size={14} />}
          loading={loading}
          onClick={fetchCalculations}
        />
      </div>

      {/* Search */}
      <div className="saved-drawer-filters">
        <Input
          className="saved-drawer-search"
          placeholder="Search by title, party, details..."
          prefix={<Search size={14} style={{ color: '#94a3b8' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>

      {/* Saved calculations table */}
      <div className="saved-drawer-table" style={{ minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <style>{`
          .saved-drawer-table .ant-table-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .saved-drawer-table .ant-spin-nested-loading {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .saved-drawer-table .ant-spin-container {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .saved-drawer-table .ant-table {
            flex: 1;
          }
          .saved-drawer-table .ant-table-container {
            min-height: 420px;
          }
          .saved-drawer-table .ant-pagination {
            margin: 12px 0px 0px 0px !important;
          }
        `}</style>

        <Table
          size="middle"
          rowKey="id"
          columns={columns}
          dataSource={filteredCalculations}
          loading={loading}
          scroll={{ x: 'max-content', y: 'calc(100vh - 260px)' }}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) => <span style={{ color: '#64748b', fontSize: 13 }}>Total <strong>{total}</strong> calculations</span>
          }}
          locale={{ emptyText: 'No saved calculations found' }}
        />
      </div>
    </Drawer>
  );
}

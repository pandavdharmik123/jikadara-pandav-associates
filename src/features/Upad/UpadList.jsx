import React, { useState, useMemo, useRef } from 'react';
import { Card, Typography, Button, Table, Space, Avatar, Row, Col, Popconfirm, message, Tag } from 'antd';
import { Plus, Wallet, TrendingUp, PiggyBank, Edit, Trash2, Calendar, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useUpads, useDeleteUpad } from '../../hooks/useUpad';
import { useDashboardStats } from '../../hooks/useReports';
import { useGeneralExpenses } from '../../hooks/useGeneralExpenses';
import useAuthStore from '../../store/authStore';
import AddEditUpadModal from './AddEditUpadModal';
import UpadReportPrintLayout from './UpadReportPrintLayout';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../utils/currency';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function UpadList() {
  const { activeFinancialYear } = useAuthStore();
  const reportPrintRef = useRef(null);

  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Queries & Mutations
  const deleteMutation = useDeleteUpad();

  // Fetch financial year net profit from dashboard stats and general expenses
  const { data: stats, isLoading: statsLoading } = useDashboardStats(
    activeFinancialYear?.startDate,
    activeFinancialYear?.endDate
  );
  const { data: fyGeneralExpenses, isLoading: fyGeLoading } = useGeneralExpenses(
    activeFinancialYear?.startDate,
    activeFinancialYear?.endDate
  );

  const queryFilters = useMemo(() => {
    const filters = {};
    if (activeFinancialYear) {
      filters.fyStartDate = activeFinancialYear.startDate;
      filters.fyEndDate = activeFinancialYear.endDate;
    }
    return filters;
  }, [activeFinancialYear]);

  const { data, isLoading: upadsLoading } = useUpads(queryFilters);
  const upads = data?.upads || [];
  const summary = data?.summary || { totalAmount: 0, totalEntries: 0, totalUsers: 0 };

  // Calculate Net Profit and Remaining Profit (Net Profit - Total Upad)
  const fyGeTotal = (fyGeneralExpenses || []).reduce((sum, item) => sum + Number(item.amount), 0);
  const fyTaskNet = Number(stats?.fyNet || 0);
  const netProfit = fyTaskNet - fyGeTotal;
  const totalUpad = Number(summary.totalAmount || 0);
  const remainingProfit = netProfit - totalUpad;

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingRecord(record);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingRecord(null);
  };

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success('Upad entry deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      message.error(error.response?.data?.error || 'Failed to delete Upad');
    }
  };

  // Group records dynamically by userName string
  const groupedData = useMemo(() => {
    const map = new Map();

    upads.forEach((item) => {
      const uName = item.userName?.trim() || 'Unknown User';
      const key = uName.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          key,
          userName: uName,
          records: [],
          totalAmount: 0,
        });
      }

      const group = map.get(key);
      group.records.push(item);
      group.totalAmount += Number(item.amount);
    });

    return Array.from(map.values());
  }, [upads]);

  // Handle PDF Export
  const handleExportPDF = async () => {
    const element = reportPrintRef.current;
    if (!element) return;

    setIsGeneratingPDF(true);
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    try {
      const clone = element.cloneNode(true);
      clone.classList.add('pdf-mode');

      const container = document.createElement('div');
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

      await new Promise((r) => setTimeout(r, 300));

      const captureWidth = 794;
      const captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1120);

      const periodName = activeFinancialYear?.name?.replace(/[^a-zA-Z0-9]/g, '_') || `FY_${dayjs().format('YYYY')}`;
      const filename = `Upad_Report_${periodName}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: captureWidth,
          height: captureHeight,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(clone).save();
      document.body.removeChild(container);
      message.success('Upad report PDF exported successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      message.error('Failed to generate PDF');
    } finally {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      setIsGeneratingPDF(false);
    }
  };

  // Table columns definition for user tables
  const getColumns = () => [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (date) => (
        <Space size="small">
          <Calendar size={14} style={{ color: '#64748b' }} />
          <Text style={{ fontWeight: 500, color: '#0f172a' }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => (
        <Text style={{ color: '#334155', fontWeight: 500 }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 160,
      align: 'right',
      render: (amount) => (
        <Text style={{ fontWeight: 700, color: '#4f46e5', fontSize: '14px' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<Edit size={16} />}
            onClick={() => handleOpenEditModal(record)}
            title="Edit"
            style={{ color: '#4f46e5' }}
          />
          <Popconfirm
            title="Delete Upad entry?"
            description="Are you sure you want to delete this Upad entry?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<Trash2 size={16} />}
              title="Delete"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isLoading = upadsLoading || statsLoading || fyGeLoading;

  return (
    <div className="advocate-module" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>
            Upad List
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Record of amounts taken by users from net profit
          </Text>
        </div>

        <Space size="middle">
          <Button
            icon={<Download size={16} />}
            onClick={handleExportPDF}
            loading={isGeneratingPDF}
            style={{
              borderRadius: '8px',
              height: 40,
              paddingLeft: 16,
              paddingRight: 16,
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
            onClick={handleOpenAddModal}
            style={{
              borderRadius: '8px',
              height: 40,
              paddingLeft: 18,
              paddingRight: 18,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            }}
          >
            Add Upad
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>

        {/* Card 2: Net Profit (from Yearly Completed Financials on Dashboard) */}
        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
              border: '1px solid #dcfce7',
            }}
            styles={{ body: { padding: '10px 14px' } }}
          >
            <Space align="center" size="small" style={{ gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <TrendingUp size={17} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#16a34a', display: 'block', lineHeight: 1.2 }}>
                  Net Profit
                </Text>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#064e3b', marginTop: 2, lineHeight: 1.2 }}>
                  {formatCurrency(netProfit)}
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Card 1: Total Upad */}
        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
              border: '1px solid #e0e7ff',
            }}
            styles={{ body: { padding: '10px 14px' } }}
          >
            <Space align="center" size="small" style={{ gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Wallet size={17} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6366f1', display: 'block', lineHeight: 1.2 }}>
                  Total Upad
                </Text>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1e1b4b', marginTop: 2, lineHeight: 1.2 }}>
                  {formatCurrency(totalUpad)}
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Card 3: Remaining Profit (Net Profit - Total Upad) */}
        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              background: remainingProfit >= 0
                ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)'
                : 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
              border: remainingProfit >= 0 ? '1px solid #dbeafe' : '1px solid #fee2e2',
            }}
            styles={{ body: { padding: '10px 14px' } }}
          >
            <Space align="center" size="small" style={{ gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: remainingProfit >= 0 ? '#2563eb' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <PiggyBank size={17} />
              </div>
              <div>
                <Text
                  type="secondary"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: remainingProfit >= 0 ? '#2563eb' : '#dc2626',
                    display: 'block',
                    lineHeight: 1.2
                  }}
                >
                  Remaining Profit
                </Text>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: remainingProfit >= 0 ? '#1e3a8a' : '#991b1b',
                    marginTop: 2,
                    lineHeight: 1.2
                  }}
                >
                  {formatCurrency(remainingProfit)}
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Main Content: User-wise Dynamic Tables */}
      {isLoading ? (
        <Loader />
      ) : groupedData.length === 0 ? (
        <Card
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
            padding: '40px 20px',
          }}
        >
          <EmptyState message="No Upad records found" />
        </Card>
      ) : (
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          {groupedData.map((userGroup) => {
            const initials = userGroup.userName
              ? userGroup.userName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2)
              : 'U';

            return (
              <Card
                key={userGroup.key}
                bordered={false}
                style={{
                  borderRadius: 16,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                }}
                styles={{ body: { padding: 0 } }}
              >
                {/* User Section Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#faf5ff',
                    borderBottom: '1px solid #f3e8ff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <Space align="center" size="middle">
                    <Avatar
                      size={40}
                      style={{
                        backgroundColor: '#7c3aed',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {initials}
                    </Avatar>
                    <div>
                      <Title
                        level={4}
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          color: '#1e1b4b',
                          letterSpacing: '-0.3px',
                        }}
                      >
                        {userGroup.userName}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {userGroup.records.length} {userGroup.records.length === 1 ? 'Entry' : 'Entries'}
                      </Text>
                    </div>
                  </Space>

                  <Tag
                    style={{
                      backgroundColor: '#f5f3ff',
                      color: '#6d28d9',
                      border: '1px solid #ddd6fe',
                      borderRadius: '20px',
                      padding: '4px 14px',
                      margin: 0,
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    Total Upad: {formatCurrency(userGroup.totalAmount)}
                  </Tag>
                </div>

                {/* User Records Table */}
                <Table
                  className="modern-dashboard-table"
                  columns={getColumns()}
                  dataSource={userGroup.records}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </Card>
            );
          })}
        </Space>
      )}

      {/* Add / Edit Upad Modal */}
      <AddEditUpadModal
        visible={modalVisible}
        record={editingRecord}
        onClose={handleCloseModal}
      />

      {/* Hidden Print Layout for PDF Export */}
      <div
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          pointerEvents: 'none',
          zIndex: -100,
        }}
      >
        <div ref={reportPrintRef}>
          <UpadReportPrintLayout
            activeFinancialYear={activeFinancialYear}
            totalUpad={totalUpad}
            netProfit={netProfit}
            remainingProfit={remainingProfit}
            groupedData={groupedData}
          />
        </div>
      </div>
    </div>
  );
}

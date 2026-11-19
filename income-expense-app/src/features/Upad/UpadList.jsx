import React, { useState, useMemo, useRef } from 'react';
import { Card, Typography, Button, Table, Space, Avatar, Row, Col, Popconfirm, message, Tag, Grid } from 'antd';
import { Plus, Wallet, TrendingUp, PiggyBank, Edit, Trash2, Calendar, Download, NotebookText } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useUpads, useDeleteUpad } from '../../hooks/useUpad';
import { useDashboardStats } from '../../hooks/useReports';
import { useGeneralExpenses } from '../../hooks/useGeneralExpenses';
import useAuthStore from '../../store/authStore';
import AddEditUpadModal from './AddEditUpadModal';
import UpadReportPrintLayout from './UpadReportPrintLayout';
import { CardSkeleton } from '../../components/skeletons';
import EmptyState from '../../components/EmptyState';
import { formatCurrency } from '../../utils/currency';
import OfficePageHeader from '../../components/office/OfficePageHeader';
import OfficeStatGrid from '../../components/office/OfficeStatGrid';
import { toISTDateString } from '../../utils/istDate';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function UpadList() {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const { activeFinancialYear } = useAuthStore();
  const reportPrintRef = useRef(null);

  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Queries & Mutations
  const deleteMutation = useDeleteUpad();

  const fyStartDateStr = toISTDateString(activeFinancialYear?.startDate);
  const fyEndDateStr = toISTDateString(activeFinancialYear?.endDate);

  // Fetch financial year net profit from dashboard stats and general expenses
  const { data: stats, isLoading: statsLoading } = useDashboardStats(
    fyStartDateStr,
    fyEndDateStr
  );
  const { data: fyGeneralExpenses, isLoading: fyGeLoading } = useGeneralExpenses(
    fyStartDateStr,
    fyEndDateStr
  );

  const queryFilters = useMemo(() => {
    const filters = {};
    if (activeFinancialYear) {
      filters.fyStartDate = fyStartDateStr;
      filters.fyEndDate = fyEndDateStr;
    }
    return filters;
  }, [activeFinancialYear, fyStartDateStr, fyEndDateStr]);

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
    <div className="advocate-module office-page">
      <OfficePageHeader
        title="Upad List"
        subtitle="Amounts withdrawn by users from net profit"
        icon={Wallet}
        actions={
          <>
            <Button
              className="office-icon-btn"
              icon={<Download size={16} />}
              onClick={handleExportPDF}
              loading={isGeneratingPDF}
              aria-label="Export PDF"
              title="Export PDF"
            />
            <Button type="primary" icon={<Plus size={15} />} onClick={handleOpenAddModal}>
              Add upad
            </Button>
          </>
        }
      />

      <OfficeStatGrid
        items={[
          { label: 'Net profit', value: formatCurrency(netProfit), icon: TrendingUp, tone: 'income' },
          { label: 'Total upad', value: formatCurrency(totalUpad), icon: Wallet, tone: 'brand' },
          {
            label: 'Remaining',
            value: formatCurrency(remainingProfit),
            icon: PiggyBank,
            tone: remainingProfit >= 0 ? 'cyan' : 'expense',
          },
          { label: 'Entries', value: (upads || []).length, icon: NotebookText, tone: 'violet' },
        ]}
      />

      {/* Main Content: User-wise Dynamic Tables */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </div>
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
          <EmptyState icon={Wallet} title="No Upad records found" description="Records added from the Upad button will appear here." />
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
                  scroll={{ x: 520 }}
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

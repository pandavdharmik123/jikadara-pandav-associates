import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Grid,
  Modal,
  Row,
  Segmented,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import {
  Calendar,
  Download,
  Edit,
  Landmark,
  PiggyBank,
  Plus,
  Receipt,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import dayjs from 'dayjs';
import html2pdf from 'html2pdf.js';
import useAuthStore from '../../store/authStore';
import { useFinancialYears } from '../../hooks/useFinancialYears';
import {
  useDeleteOfficeLedgerEntry,
  useOfficeLedger,
} from '../../hooks/useOfficeLedger';
import Loader from '../../components/Loader';
import { formatCurrency, formatCurrencyPrecise } from '../../utils/currency';
import { formatISTDate, getFinancialYearRange, getISTToday } from '../../utils/istDate';
import AddEditOfficeLedgerModal from './AddEditOfficeLedgerModal';
import OfficeLedgerPrintLayout from './OfficeLedgerPrintLayout';
import OfficeSplitUsersModal from './OfficeSplitUsersModal';

const { Title, Text } = Typography;

function getDefaultMonth(fyRange) {
  if (!fyRange) return getISTToday();

  const today = getISTToday();
  const start = dayjs(fyRange.startDate);
  const end = dayjs(fyRange.endDate);
  const month = today.startOf('month');

  if (month.isBefore(start, 'month')) return start.startOf('month');
  if (month.isAfter(end, 'month')) return end.startOf('month');
  return month;
}

function formatFyLabel(fyRange) {
  if (!fyRange) return '';
  return /^fy\b/i.test(fyRange.label.trim()) ? fyRange.label : `FY ${fyRange.label}`;
}

/**
 * Keep a month picker value inside the active financial year. This matters for
 * users who type a month instead of clicking it: Ant Design's disabledDate
 * only disables calendar cells, so typed values still need to be clamped.
 */
function clampMonthToFy(value, fyRange) {
  if (!value) return getDefaultMonth(fyRange);
  if (!fyRange) return value;

  const startMonth = dayjs(fyRange.startDate).startOf('month');
  const endMonth = dayjs(fyRange.endDate).startOf('month');

  if (value.isBefore(startMonth, 'month')) return startMonth;
  if (value.isAfter(endMonth, 'month')) return endMonth;
  return value;
}

function LedgerSection({
  type,
  entries,
  total,
  onAdd,
  onEdit,
  onDelete,
  loading,
  compact,
  minRows = 0,
}) {
  const isIncome = type === 'INCOME';
  const label = isIncome ? 'Income' : 'Expenses';
  const singular = isIncome ? 'Income' : 'Expense';
  const accent = isIncome ? '#059669' : '#dc2626';
  const soft = isIncome ? '#ecfdf5' : '#fef2f2';
  const border = isIncome ? '#a7f3d0' : '#fecaca';

  const paddedEntries = useMemo(() => {
    if (!minRows || entries.length === 0 || entries.length >= minRows) {
      return entries;
    }
    const diff = minRows - entries.length;
    const placeholders = Array.from({ length: diff }, (_, i) => ({
      id: `__empty_${type}_${i}`,
      isEmpty: true,
    }));
    return [...entries, ...placeholders];
  }, [entries, minRows, type]);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'entryDate',
      key: 'entryDate',
      width: compact ? 94 : 106,
      render: (value, record) => {
        if (record.isEmpty) {
          return (
            <div
              style={{
                height: compact ? 22 : 24,
                visibility: 'hidden',
                pointerEvents: 'none',
              }}
            >
              &nbsp;
            </div>
          );
        }
        return (
          <Space size={4}>
            <Calendar size={compact ? 11 : 12} style={{ color: '#64748b' }} />
            <Text
              style={{
                fontSize: compact ? 11 : 12,
                fontWeight: 500,
                color: '#0f172a',
                whiteSpace: 'nowrap',
              }}
            >
              {formatISTDate(value)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: isIncome ? 'Income Details' : 'Expense Details',
      dataIndex: 'details',
      key: 'details',
      render: (value, record) => {
        if (record.isEmpty) return null;
        return (
          <Text
            style={{
              fontSize: compact ? 11 : 12,
              color: '#1e293b',
              wordBreak: 'break-word',
            }}
          >
            {/* "અન્ય" is a generic bucket, so show only the description for it. */}
            {!isIncome && record.expenseType && record.expenseType !== 'અન્ય' ? (
              <>
                <span style={{ fontWeight: 700, color: accent }}>{record.expenseType}</span>
                <span style={{ color: '#94a3b8' }}> - </span>
                {value}
              </>
            ) : (
              value
            )}
          </Text>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: compact ? 96 : 112,
      align: 'right',
      render: (value, record) => {
        if (record.isEmpty) return null;
        return (
          <Text
            style={{
              fontSize: compact ? 12 : 13,
              fontWeight: 700,
              color: accent,
              whiteSpace: 'nowrap',
            }}
          >
            {formatCurrency(value)}
          </Text>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: compact ? 54 : 66,
      align: 'center',
      render: (_, record) => {
        if (record.isEmpty) return null;
        return (
          <Space size={0}>
            <Button
              type="text"
              size="small"
              icon={<Edit size={compact ? 13 : 14} />}
              onClick={() => onEdit(record)}
              title={`Edit ${isIncome ? 'income' : 'expense'}`}
              style={{ color: '#4f46e5' }}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<Trash2 size={compact ? 13 : 14} />}
              onClick={() => onDelete(record)}
              title={`Delete ${isIncome ? 'income' : 'expense'}`}
            />
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 12,
        borderTop: `3px solid ${accent}`,
        boxShadow: '0 3px 8px -3px rgba(15, 23, 42, 0.12)',
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{
        body: {
          padding: compact ? '10px 10px 12px' : '12px 12px 14px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginBottom: compact ? 8 : 10,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <Space size={8}>
          <div
            style={{
              width: compact ? 28 : 30,
              height: compact ? 28 : 30,
              borderRadius: 8,
              background: soft,
              border: `1px solid ${border}`,
              color: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isIncome ? (
              <TrendingUp size={compact ? 15 : 16} />
            ) : (
              <TrendingDown size={compact ? 15 : 16} />
            )}
          </div>
          <div>
            <Title
              level={5}
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: compact ? 14 : 15,
                lineHeight: 1.2,
              }}
            >
              {label}
            </Title>
            <Text type="secondary" style={{ fontSize: compact ? 10 : 11 }}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>
          </div>
        </Space>

        <Button
          size="small"
          icon={<Plus size={compact ? 12 : 13} />}
          onClick={onAdd}
          style={{
            borderRadius: 7,
            height: 28,
            paddingInline: 9,
            fontSize: compact ? 11 : 12,
            color: accent,
            borderColor: border,
            background: soft,
            fontWeight: 600,
          }}
        >
          Add {singular}
        </Button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Table
          className="office-ledger-table"
          columns={columns}
          dataSource={paddedEntries}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={paddedEntries.length > 0 ? { x: compact ? 330 : 390 } : undefined}
          pagination={false}
          rowClassName={(record) => (record.isEmpty ? 'office-ledger-empty-row' : '')}
          locale={{
            emptyText: (
              <div style={{ padding: '20px 8px', textAlign: 'center' }}>
                <Receipt size={22} style={{ color: '#94a3b8', marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                  No {isIncome ? 'income' : 'expenses'} found
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Add {isIncome ? 'income' : 'an expense'} or change filters.
                </div>
              </div>
            ),
          }}
          summary={() => (
            <Table.Summary.Row style={{ background: soft }}>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Text
                  strong
                  style={{ color: '#334155', fontSize: compact ? 11 : 12 }}
                >
                  Total {label}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text
                  strong
                  style={{ color: accent, fontSize: compact ? 12 : 13 }}
                >
                  {formatCurrency(total)}
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} />
            </Table.Summary.Row>
          )}
        />
      </div>
    </Card>
  );
}

export default function OfficeLedgerPage() {
  const { activeFinancialYear } = useAuthStore();
  const financialYearKey = activeFinancialYear
    ? `${activeFinancialYear.id}:${activeFinancialYear.startDate}:${activeFinancialYear.endDate}`
    : 'no-financial-year';

  return <OfficeLedgerPageContent key={financialYearKey} />;
}

function OfficeLedgerPageContent() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const { activeFinancialYear } = useAuthStore();
  const { isLoading: financialYearsLoading } = useFinancialYears();
  const fyRange = useMemo(
    () => getFinancialYearRange(activeFinancialYear),
    [activeFinancialYear]
  );

  const [filterMode, setFilterMode] = useState('MONTHLY');
  const [selectedMonth, setSelectedMonth] = useState(() => getDefaultMonth(fyRange));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [modalEntryType, setModalEntryType] = useState('INCOME');
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const printRef = useRef(null);
  const deleteMutation = useDeleteOfficeLedgerEntry();

  const queryParams = useMemo(() => {
    if (!fyRange) return null;

    const params = {
      fyStartDate: fyRange.startDate,
      fyEndDate: fyRange.endDate,
    };

    if (filterMode === 'MONTHLY') {
      params.month = selectedMonth.month() + 1;
      params.year = selectedMonth.year();
    }

    return params;
  }, [fyRange, filterMode, selectedMonth]);

  const { data, isLoading, isFetching, isError, error, refetch } = useOfficeLedger(
    queryParams,
    { enabled: Boolean(queryParams) }
  );

  const entries = useMemo(() => data?.entries || [], [data?.entries]);
  const summary = data?.summary || {
    incomeTotal: 0,
    expenseTotal: 0,
    netAmount: 0,
    incomeCount: 0,
    expenseCount: 0,
    recordCount: 0,
  };
  const balance = data?.balance || {
    openingBalance: 0,
    periodIncome: 0,
    periodExpense: 0,
    periodNet: 0,
    periodIncomeCount: 0,
    periodExpenseCount: 0,
    closingBalance: 0,
    shortfall: 0,
  };
  const splitUsers = data?.splitUsers || [];

  const incomeEntries = useMemo(
    () => entries.filter((entry) => entry.entryType === 'INCOME'),
    [entries]
  );
  const expenseEntries = useMemo(
    () => entries.filter((entry) => entry.entryType === 'EXPENSE'),
    [entries]
  );

  const isSideBySide = screens.lg !== false;
  const maxLedgerRows = isSideBySide
    ? Math.max(incomeEntries.length, expenseEntries.length)
    : 0;

  const fyLabel = formatFyLabel(fyRange);

  const periodLabel = useMemo(() => {
    if (!fyRange) return '';
    if (filterMode === 'MONTHLY') return selectedMonth.format('MMM-YY');
    return fyLabel;
  }, [fyRange, filterMode, selectedMonth, fyLabel]);

  const resetFilters = () => {
    setFilterMode('MONTHLY');
    setSelectedMonth(getDefaultMonth(fyRange));
    setSplitModalOpen(false);
  };

  const handleFilterModeChange = (value) => {
    setFilterMode(value);
    setSplitModalOpen(false);
  };

  const disabledMonth = (current) => {
    if (!current || !fyRange) return false;
    return (
      current.isBefore(dayjs(fyRange.startDate), 'month') ||
      current.isAfter(dayjs(fyRange.endDate), 'month')
    );
  };

  const openAddModal = (entryType) => {
    setEditingRecord(null);
    setModalEntryType(entryType);
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setModalEntryType(record.entryType);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
  };

  const openSplitModal = () => {
    if (!queryParams) return;
    setSplitModalOpen(true);
  };

  const closeSplitModal = () => setSplitModalOpen(false);

  const handleExportPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    setIsGeneratingPDF(true);
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    let container = null;

    try {
      const clone = element.cloneNode(true);
      clone.classList.add('pdf-mode');

      container = document.createElement('div');
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

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const captureWidth = 794;
      const captureHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1120);
      const maxCanvasHeight = 30000;
      const renderScale = Math.max(1, Math.min(4, maxCanvasHeight / captureHeight));
      const safePeriod = String(periodLabel || 'Office_Ledger')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const filename = `Office_Income_Expenses_${safePeriod || 'Report'}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: 'png' },
        html2canvas: {
          scale: renderScale,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: captureWidth,
          height: captureHeight,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(clone).save();
      message.success('Office ledger PDF exported successfully!');
    } catch (exportError) {
      console.error('Office ledger PDF export error:', exportError);
      message.error('Failed to generate PDF');
    } finally {
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      setIsGeneratingPDF(false);
    }
  };

  const handleDelete = (record) => {
    const isIncome = record.entryType === 'INCOME';

    Modal.confirm({
      title: `Delete ${isIncome ? 'Income' : 'Expense'} Entry?`,
      content: (
        <div>
          <p>Are you sure you want to delete this ledger entry?</p>
          <div
            style={{
              marginTop: 8,
              padding: '10px 12px',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 13,
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <strong>{record.details}</strong>
            </div>
            <div style={{ marginBottom: 4 }}>
              {isIncome ? 'Income' : 'Expense'} • {formatISTDate(record.entryDate)}
            </div>
            <div style={{ color: isIncome ? '#059669' : '#dc2626', fontWeight: 700 }}>
              {formatCurrency(record.amount)}
            </div>
          </div>
        </div>
      ),
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync({
            id: record.id,
            fyStartDate: fyRange.startDate,
            fyEndDate: fyRange.endDate,
          });
          message.success(`${isIncome ? 'Income' : 'Expense'} moved to Recycle Bin`);
        } catch (deleteError) {
          message.error(
            deleteError.response?.data?.error || 'Failed to delete ledger entry'
          );
        }
      },
    });
  };

  const summaryCards = [
    {
      title: 'Opening Balance',
      value: formatCurrency(balance.openingBalance),
      subtitle: 'Carried forward',
      icon: <Wallet size={15} />,
      color: '#475569',
      background: '#f8fafc',
      border: '#e2e8f0',
    },
    {
      title: 'Total Income',
      value: formatCurrency(balance.periodIncome),
      subtitle: `${balance.periodIncomeCount} ${balance.periodIncomeCount === 1 ? 'entry' : 'entries'
        }`,
      icon: <TrendingUp size={15} />,
      color: '#059669',
      background: '#ecfdf5',
      border: '#a7f3d0',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(balance.periodExpense),
      subtitle: `${balance.periodExpenseCount} ${balance.periodExpenseCount === 1 ? 'entry' : 'entries'
        }`,
      icon: <TrendingDown size={15} />,
      color: '#dc2626',
      background: '#fef2f2',
      border: '#fecaca',
    },
    {
      title: 'Net Savings',
      value: formatCurrency(balance.periodNet),
      subtitle: 'Income minus expenses',
      icon: <PiggyBank size={15} />,
      color: balance.periodNet >= 0 ? '#2563eb' : '#dc2626',
      background: balance.periodNet >= 0 ? '#eff6ff' : '#fef2f2',
      border: balance.periodNet >= 0 ? '#bfdbfe' : '#fecaca',
    },
    {
      title: 'Closing Balance',
      value: formatCurrency(balance.closingBalance),
      subtitle: 'Opening + period net',
      icon: <Landmark size={15} />,
      color: '#4f46e5',
      background: '#eef2ff',
      border: '#c7d2fe',
    },
  ];

  if (!fyRange) {
    return (
      <div className="advocate-module office-ledger-page" style={{ paddingBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <Title
              level={2}
              style={{
                margin: 0,
                fontWeight: 700,
                color: '#0f172a',
                fontSize: isMobile ? 21 : 25,
              }}
            >
              Office Income & Expenses
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              A simple two-sided office ledger for income and expenses.
            </Text>
          </div>
        </div>

        {financialYearsLoading ? (
          <Loader />
        ) : (
          <Alert
            type="warning"
            showIcon
            message="No financial year selected"
            description="Create or select a financial year before recording office income or expenses."
            action={
              <Button size="small" onClick={() => navigate('/app/profile')}>
                Open Profile
              </Button>
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="advocate-module office-ledger-page" style={{ paddingBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <Title
            level={2}
            style={{
              margin: 0,
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.4px',
              fontSize: isMobile ? 21 : 25,
            }}
          >
            Office Income & Expenses
          </Title>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            alignItems: 'center',
            width: isMobile ? '100%' : 'auto',
          }}
        >
          <Segmented
            size="middle"
            value={filterMode}
            onChange={handleFilterModeChange}
            options={[
              { label: 'Yearly', value: 'YEARLY' },
              { label: 'Monthly', value: 'MONTHLY' },
            ]}
            style={{ fontWeight: 600 }}
          />

          {filterMode === 'MONTHLY' && (
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(value) => {
                const nextMonth = clampMonthToFy(value, fyRange);
                if (value && nextMonth.valueOf() !== value.valueOf()) {
                  message.warning(
                    'That month is outside the selected financial year. Showing the nearest valid month instead.'
                  );
                }
                setSelectedMonth(nextMonth);
              }}
              disabledDate={disabledMonth}
              allowClear={false}
              format="MMMM YYYY"
              style={{ width: isMobile ? '100%' : 155 }}
              size="middle"
            />
          )}

          <Button
            size="middle"
            icon={<RotateCcw size={14} />}
            onClick={resetFilters}
            style={{
              borderRadius: 7,
              height: 32,
              paddingInline: 10,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Reset Filters
          </Button>
          <Button
            size="middle"
            icon={<Download size={14} />}
            onClick={handleExportPDF}
            loading={isGeneratingPDF}
            disabled={isLoading || isFetching || isError}
            title="Export the current period as a branded PDF"
            style={{
              borderRadius: 7,
              height: 32,
              paddingInline: 10,
              fontSize: 12,
              fontWeight: 600,
              color: '#1e3a8a',
              borderColor: '#bfdbfe',
              background: '#eff6ff',
            }}
          >
            Export PDF
          </Button>
          <Button
            size="middle"
            icon={<Users size={14} />}
            onClick={openSplitModal}
            disabled={!queryParams || isError}
            title="Manage split users"
            style={{
              borderRadius: 7,
              height: 32,
              paddingInline: 10,
              fontSize: 12,
              fontWeight: 600,
              color: '#c2410c',
              borderColor: '#fed7aa',
              background: '#fff7ed',
            }}
          >
            Split Users{splitUsers.length ? ` (${splitUsers.length})` : ''}
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
          gap: 10,
          marginBottom: 12,
        }}
      >
        {summaryCards.map((card) => (
          <Card
            bordered={false}
            key={card.title}
            style={{
              borderRadius: 10,
              background: card.background,
              border: `1px solid ${card.border}`,
              boxShadow: '0 2px 5px -3px rgba(15, 23, 42, 0.12)',
              height: '100%',
            }}
            styles={{ body: { padding: '10px 12px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <Text
                  type="secondary"
                  style={{
                    display: 'block',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {card.title}
                </Text>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: card.color,
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={String(card.value)}
                >
                  {card.value}
                </div>
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {card.subtitle}
                </Text>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 14px',
          borderRadius: 9,
          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
          color: '#ffffff',
          boxShadow: '0 3px 10px rgba(37, 99, 235, 0.16)',
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: isMobile ? 17 : 19,
              fontWeight: 800,
              letterSpacing: '0.04em',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {periodLabel}
          </div>
          {periodLabel !== fyLabel && (
            <div style={{ fontSize: 10, color: '#dbeafe', fontWeight: 600, marginTop: 1 }}>
              {fyLabel}
            </div>
          )}
          <div style={{ fontSize: 9, color: '#bfdbfe', marginTop: 1 }}>
            Balances carry forward
          </div>
        </div>

        <div
          style={{
            textAlign: 'right',
            fontSize: 10,
            color: '#dbeafe',
            lineHeight: 1.55,
            flexShrink: 0,
          }}
        >
          <div>
            Opening{' '}
            <strong style={{ color: '#ffffff' }}>
              {formatCurrency(balance.openingBalance)}
            </strong>
          </div>
          <div>
            Closing{' '}
            <strong style={{ color: '#ffffff' }}>
              {formatCurrency(balance.closingBalance)}
            </strong>
          </div>
        </div>
      </div>

      {balance.shortfall > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '8px 10px',
            marginBottom: 12,
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 9,
          }}
        >
          <Space size={6} style={{ minWidth: 0 }}>
            <Users size={14} style={{ color: '#c2410c', flexShrink: 0 }} />
            <Text style={{ fontSize: 11, color: '#9a3412' }}>
              Expenses exceed income by{' '}
              <strong>{formatCurrencyPrecise(balance.shortfall)}</strong> for{' '}
              {periodLabel}.{' '}
              {splitUsers.length > 0
                ? `Split equally among ${splitUsers.length} ${splitUsers.length === 1 ? 'user' : 'users'
                }.`
                : 'Add split users to divide this amount.'}
            </Text>
          </Space>
          <Button
            size="small"
            icon={<Users size={12} />}
            onClick={openSplitModal}
            style={{
              borderRadius: 7,
              height: 28,
              paddingInline: 9,
              fontSize: 11,
              fontWeight: 600,
              color: '#c2410c',
              borderColor: '#fdba74',
              background: '#ffffff',
            }}
          >
            {splitUsers.length > 0 ? 'View Split' : 'Add Split Users'}
          </Button>
        </div>
      )}

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Unable to load the office ledger"
          description={error?.response?.data?.error || error?.message}
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
          style={{ marginBottom: 12, borderRadius: 9 }}
        />
      )}

      {isLoading ? (
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Loader />
        </Card>
      ) : (
        <Row gutter={[10, 10]} align="stretch">
          <Col xs={24} lg={12} style={{ display: 'flex', width: '100%' }}>
            <LedgerSection
              type="INCOME"
              entries={incomeEntries}
              total={summary.incomeTotal}
              onAdd={() => openAddModal('INCOME')}
              onEdit={openEditModal}
              onDelete={handleDelete}
              loading={isFetching && !data}
              compact={isMobile}
              minRows={maxLedgerRows}
            />
          </Col>
          <Col xs={24} lg={12} style={{ display: 'flex', width: '100%' }}>
            <LedgerSection
              type="EXPENSE"
              entries={expenseEntries}
              total={summary.expenseTotal}
              onAdd={() => openAddModal('EXPENSE')}
              onEdit={openEditModal}
              onDelete={handleDelete}
              loading={isFetching && !data}
              compact={isMobile}
              minRows={maxLedgerRows}
            />
          </Col>
        </Row>
      )}

      <AddEditOfficeLedgerModal
        open={modalOpen}
        record={editingRecord}
        entryType={modalEntryType}
        onClose={closeModal}
        fyRange={fyRange}
        selectedMonth={filterMode === 'MONTHLY' ? selectedMonth : null}
      />

      <OfficeSplitUsersModal
        open={splitModalOpen}
        onClose={closeSplitModal}
        splitUsers={splitUsers}
        shortfall={balance.shortfall}
        periodLabel={periodLabel}
      />

      <div
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          pointerEvents: 'none',
          zIndex: -100,
        }}
      >
        <div ref={printRef}>
          <OfficeLedgerPrintLayout
            entries={entries}
            balance={balance}
            splitUsers={splitUsers}
            periodLabel={periodLabel}
            fyLabel={fyLabel}
          />
        </div>
      </div>

      <style>{`
        .office-ledger-page .office-ledger-table .ant-table-thead > tr > th {
          padding: 6px 8px !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          background: #f8fafc !important;
          color: #64748b !important;
        }

        .office-ledger-page .office-ledger-table .ant-table-tbody > tr > td {
          padding: 6px 8px !important;
        }

        .office-ledger-page .office-ledger-table .ant-table-summary > tr > td {
          padding: 7px 8px !important;
        }

        .office-ledger-page .office-ledger-table .ant-pagination {
          margin: 8px 0 0 !important;
        }

        @media (max-width: 767px) {
          .office-ledger-page .office-ledger-table .ant-table-thead > tr > th,
          .office-ledger-page .office-ledger-table .ant-table-tbody > tr > td {
            padding: 5px 6px !important;
          }
        }
      `}</style>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Card, Typography, Table, Tag, Button, Space, Tabs, Input, Modal, Popconfirm, message, Badge, Grid, Pagination } from 'antd';
import { Trash2, RotateCcw, Search, AlertTriangle, Calendar, User, CheckSquare, Receipt, Wallet, FileText, Files, GitFork, Zap, ClipboardList, Clock3 } from 'lucide-react';
import { useRecycleBin, useRestoreItem, usePermanentDeleteItem, useEmptyRecycleBin } from '../../hooks/useRecycleBin';
import { MobileListSkeleton, TableLoadingSkeleton } from '../../components/skeletons';
import EmptyState from '../../components/EmptyState';
import OfficePageHeader from '../../components/office/OfficePageHeader';
import OfficeToolbar from '../../components/office/OfficeToolbar';
import { formatCurrency } from '../../utils/currency';
import { formatISTDate } from '../../utils/istDate';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const MOBILE_PAGE_SIZE = 10;

export default function RecycleBin() {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const [activeTab, setActiveTab] = useState('ALL');
  const [mobilePage, setMobilePage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useRecycleBin();
  const restoreMutation = useRestoreItem();
  const permanentDeleteMutation = usePermanentDeleteItem();
  const emptyRecycleBinMutation = useEmptyRecycleBin();

  const counts = data?.counts || {
    clients: 0,
    tasks: 0,
    transactions: 0,
    generalExpenses: 0,
    officeLedgerEntries: 0,
    upads: 0,
    invoices: 0,
    pedhinamus: 0,
    documentTypes: 0,
    verabillEntries: 0,
    nondhStatuses: 0,
    total: 0,
  };

  const rawData = data?.data || {
    clients: [],
    tasks: [],
    transactions: [],
    generalExpenses: [],
    officeLedgerEntries: [],
    upads: [],
    invoices: [],
    pedhinamus: [],
    documentTypes: [],
    verabillEntries: [],
    nondhStatuses: [],
  };

  // Format and flatten items with a unified schema
  const formattedItems = useMemo(() => {
    const list = [];

    // Clients
    (rawData.clients || []).forEach((c) => {
      list.push({
        id: c.id,
        type: 'CLIENT',
        typeName: 'Client',
        typeColor: 'blue',
        title: c.name,
        subtitle: c.mobileNumber ? `Mobile: ${c.mobileNumber}` : (c.referenceName ? `Ref: ${c.referenceName}` : ''),
        details: `${c._count?.tasks || 0} associated tasks`,
        deletedAt: c.deletedAt,
        amount: null,
      });
    });

    // Tasks
    (rawData.tasks || []).forEach((t) => {
      list.push({
        id: t.id,
        type: 'TASK',
        typeName: 'Task',
        typeColor: 'orange',
        title: t.documentType || 'Task',
        subtitle: t.client ? `Client: ${t.client.name}` : (t.clientName ? `Client: ${t.clientName}` : ''),
        details: t.place ? `Place: ${t.place}` : (t.referenceName ? `Ref: ${t.referenceName}` : ''),
        deletedAt: t.deletedAt,
        amount: Number(t.netAmount) || null,
      });
    });

    // Transactions
    (rawData.transactions || []).forEach((tr) => {
      list.push({
        id: tr.id,
        type: 'TRANSACTION',
        typeName: tr.type === 'INCOME' ? 'Income Transaction' : 'Expense Transaction',
        typeColor: tr.type === 'INCOME' ? 'green' : 'red',
        title: tr.description || (tr.type === 'INCOME' ? 'Income Entry' : 'Expense Entry'),
        subtitle: tr.task ? `Task: ${tr.task.documentType}` : (tr.clientName ? `Client: ${tr.clientName}` : ''),
        details: tr.documentType ? `Doc: ${tr.documentType}` : '',
        deletedAt: tr.deletedAt,
        amount: Number(tr.amount) || 0,
      });
    });

    // General Expenses
    (rawData.generalExpenses || []).forEach((ge) => {
      list.push({
        id: ge.id,
        type: 'GENERAL_EXPENSE',
        typeName: 'General Expense',
        typeColor: 'magenta',
        title: ge.description || 'General Expense',
        subtitle: `Date: ${dayjs(ge.date).format('DD/MM/YYYY')}`,
        details: '',
        deletedAt: ge.deletedAt,
        amount: Number(ge.amount) || 0,
      });
    });

    // Office Ledger
    (rawData.officeLedgerEntries || []).forEach((entry) => {
      const isIncome = entry.entryType === 'INCOME';
      list.push({
        id: entry.id,
        type: 'OFFICE_LEDGER',
        typeName: isIncome ? 'Office Income' : 'Office Expense',
        typeColor: isIncome ? 'green' : 'volcano',
        title:
          !isIncome && entry.expenseType
            ? [entry.expenseType, entry.details].filter(Boolean).join(' - ')
            : entry.details || 'Office Ledger Entry',
        subtitle: `${isIncome ? 'Income' : 'Expense'} • Date: ${formatISTDate(entry.entryDate)}`,
        details: '',
        deletedAt: entry.deletedAt,
        amount: Number(entry.amount) || 0,
      });
    });

    // Upads
    (rawData.upads || []).forEach((u) => {
      list.push({
        id: u.id,
        type: 'UPAD',
        typeName: 'Upad',
        typeColor: 'purple',
        title: u.userName ? `Upad - ${u.userName}` : 'Upad Entry',
        subtitle: u.description || '',
        details: `Date: ${dayjs(u.date).format('DD/MM/YYYY')}`,
        deletedAt: u.deletedAt,
        amount: Number(u.amount) || 0,
      });
    });

    // Invoices
    (rawData.invoices || []).forEach((inv) => {
      list.push({
        id: inv.id,
        type: 'INVOICE',
        typeName: 'Invoice',
        typeColor: 'cyan',
        title: inv.invoiceNo ? `Invoice #${inv.invoiceNo}` : 'Invoice',
        subtitle: inv.clientName ? `Client: ${inv.clientName}` : '',
        details: `Date: ${dayjs(inv.date).format('DD/MM/YYYY')}`,
        deletedAt: inv.deletedAt,
        amount: Number(inv.total) || 0,
      });
    });

    // Pedhinamu Drafts
    (rawData.pedhinamus || []).forEach((p) => {
      list.push({
        id: p.id,
        type: 'PEDHINAMU',
        typeName: 'Pedhinamu',
        typeColor: 'gold',
        title: p.title || 'Untitled Pedhinamu',
        subtitle: p.applicantName ? `Applicant: ${p.applicantName}` : '',
        details: p.deceasedName ? `Deceased: ${p.deceasedName}` : '',
        deletedAt: p.deletedAt,
        amount: null,
      });
    });

    // Document Types
    (rawData.documentTypes || []).forEach((dt) => {
      list.push({
        id: dt.id,
        type: 'DOCUMENT_TYPE',
        typeName: 'Document Type',
        typeColor: 'geekblue',
        title: dt.name,
        subtitle: 'Configuration entry',
        details: '',
        deletedAt: dt.deletedAt,
        amount: null,
      });
    });

    // Verabill Entries
    (rawData.verabillEntries || []).forEach((vb) => {
      list.push({
        id: vb.id,
        type: 'VERABILL',
        typeName: 'Verabill / Light Bill',
        typeColor: 'volcano',
        title: vb.clientName,
        subtitle: vb.property ? `Property: ${vb.property}` : (vb.workDescription ? `Work: ${vb.workDescription}` : ''),
        details: vb.workType ? `Type: ${vb.workType}` : '',
        deletedAt: vb.deletedAt,
        amount: null,
      });
    });

    // Nondh Status Entries
    (rawData.nondhStatuses || []).forEach((nd) => {
      list.push({
        id: nd.id,
        type: 'NONDH',
        typeName: 'Nondh Status',
        typeColor: 'purple',
        title: nd.partyName || `Entry #${nd.number}`,
        subtitle: nd.placeName ? `Place: ${nd.placeName}` : (nd.documentType ? `Doc: ${nd.documentType}` : ''),
        details: nd.nondhNumber ? `Nondh No: ${nd.nondhNumber}` : `Status: ${nd.status}`,
        deletedAt: nd.deletedAt,
        amount: nd.vahivatFee ? Number(nd.vahivatFee) : null,
      });
    });

    // Sort by deletedAt desc
    return list.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
  }, [rawData]);

  // Filter items by active tab and search text
  const filteredItems = useMemo(() => {
    return formattedItems.filter((item) => {
      if (activeTab !== 'ALL' && item.type !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchSub = item.subtitle?.toLowerCase().includes(query);
        const matchDetails = item.details?.toLowerCase().includes(query);
        const matchType = item.typeName?.toLowerCase().includes(query);
        return matchTitle || matchSub || matchDetails || matchType;
      }
      return true;
    });
  }, [formattedItems, activeTab, searchQuery]);

  const handleRestore = async (item) => {
    try {
      await restoreMutation.mutateAsync({ type: item.type, id: item.id });
      message.success(`${item.typeName} restored successfully`);
    } catch (error) {
      console.error('Restore error:', error);
      message.error(error.response?.data?.error || 'Failed to restore item');
    }
  };

  const handlePermanentDelete = async (item) => {
    try {
      await permanentDeleteMutation.mutateAsync({ type: item.type, id: item.id });
      message.success(`${item.typeName} permanently deleted`);
    } catch (error) {
      console.error('Delete error:', error);
      message.error(error.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleEmptyRecycleBin = () => {
    const categoryName = activeTab === 'ALL' ? 'all' : activeTab.toLowerCase().replace('_', ' ');
    Modal.confirm({
      title: 'Empty Recycle Bin?',
      icon: <AlertTriangle size={24} color="#ef4444" />,
      content: (
        <div>
          <p>Are you sure you want to permanently delete {categoryName} items in the Recycle Bin?</p>
          <Text type="danger" strong>This action is irreversible and all selected records will be permanently removed.</Text>
        </div>
      ),
      okText: 'Yes, Empty Permanently',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await emptyRecycleBinMutation.mutateAsync({ category: activeTab });
          message.success('Recycle bin emptied successfully');
        } catch (error) {
          console.error('Empty recycle bin error:', error);
          message.error(error.response?.data?.error || 'Failed to empty recycle bin');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Item & Details',
      key: 'item',
      render: (_, item) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
            {item.title}
          </div>
          {item.subtitle && (
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {item.subtitle}
            </div>
          )}
          {item.details && (
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
              {item.details}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'typeName',
      key: 'type',
      width: 160,
      render: (typeName, item) => (
        <Tag color={item.typeColor} style={{ borderRadius: '12px', padding: '2px 10px', fontWeight: 600 }}>
          {typeName}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (amount) => (
        amount !== null && amount !== undefined ? (
          <Text style={{ fontWeight: 700, color: '#4f46e5', fontSize: '13px' }}>
            {formatCurrency(amount)}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Deleted On',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      width: 170,
      render: (date) => (
        <Space size="small">
          <Calendar size={13} style={{ color: '#94a3b8' }} />
          <Text style={{ fontSize: '12px', color: '#475569' }}>
            {date ? dayjs(date).format('DD/MM/YYYY, hh:mm A') : '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, item) => (
        <Space size="small">
          <Button
            type="primary"
            ghost
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={() => handleRestore(item)}
            loading={restoreMutation.isPending}
            style={{ borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}
          >
            Restore
          </Button>

          <Popconfirm
            title="Delete permanently?"
            description="Are you sure you want to permanently delete this item? This action cannot be undone."
            onConfirm={() => handlePermanentDelete(item)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<Trash2 size={15} />}
              title="Delete permanently"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'ALL',
      label: (
        <Space size="small">
          <span>All Items</span>
          <Badge count={counts.total} overflowCount={999} style={{ backgroundColor: '#6366f1' }} />
        </Space>
      ),
    },
    {
      key: 'CLIENT',
      label: (
        <Space size="small">
          <User size={14} />
          <span>Clients</span>
          <Badge count={counts.clients} overflowCount={999} style={{ backgroundColor: '#3b82f6' }} />
        </Space>
      ),
    },
    {
      key: 'TASK',
      label: (
        <Space size="small">
          <CheckSquare size={14} />
          <span>Tasks</span>
          <Badge count={counts.tasks} overflowCount={999} style={{ backgroundColor: '#f97316' }} />
        </Space>
      ),
    },
    {
      key: 'TRANSACTION',
      label: (
        <Space size="small">
          <Receipt size={14} />
          <span>Transactions</span>
          <Badge count={counts.transactions} overflowCount={999} style={{ backgroundColor: '#10b981' }} />
        </Space>
      ),
    },
    {
      key: 'GENERAL_EXPENSE',
      label: (
        <Space size="small">
          <Receipt size={14} />
          <span>General Expenses</span>
          <Badge count={counts.generalExpenses} overflowCount={999} style={{ backgroundColor: '#d946ef' }} />
        </Space>
      ),
    },
    {
      key: 'OFFICE_LEDGER',
      label: (
        <Space size="small">
          <Receipt size={14} />
          <span>Office Ledger</span>
          <Badge count={counts.officeLedgerEntries} overflowCount={999} style={{ backgroundColor: '#f97316' }} />
        </Space>
      ),
    },
    {
      key: 'UPAD',
      label: (
        <Space size="small">
          <Wallet size={14} />
          <span>Upad</span>
          <Badge count={counts.upads} overflowCount={999} style={{ backgroundColor: '#8b5cf6' }} />
        </Space>
      ),
    },
    {
      key: 'INVOICE',
      label: (
        <Space size="small">
          <FileText size={14} />
          <span>Invoices</span>
          <Badge count={counts.invoices} overflowCount={999} style={{ backgroundColor: '#06b6d4' }} />
        </Space>
      ),
    },
    {
      key: 'PEDHINAMU',
      label: (
        <Space size="small">
          <GitFork size={14} />
          <span>Pedhinamu</span>
          <Badge count={counts.pedhinamus} overflowCount={999} style={{ backgroundColor: '#eab308' }} />
        </Space>
      ),
    },
    {
      key: 'DOCUMENT_TYPE',
      label: (
        <Space size="small">
          <Files size={14} />
          <span>Document Types</span>
          <Badge count={counts.documentTypes} overflowCount={999} style={{ backgroundColor: '#64748b' }} />
        </Space>
      ),
    },
    {
      key: 'VERABILL',
      label: (
        <Space size="small">
          <Zap size={14} />
          <span>Verabill</span>
          <Badge count={counts.verabillEntries} overflowCount={999} style={{ backgroundColor: '#f97316' }} />
        </Space>
      ),
    },
    {
      key: 'NONDH',
      label: (
        <Space size="small">
          <ClipboardList size={14} />
          <span>Nondh Status</span>
          <Badge count={counts.nondhStatuses} overflowCount={999} style={{ backgroundColor: '#8b5cf6' }} />
        </Space>
      ),
    },
  ];

  const mobileTabs = (
    <div className="office-tab-strip">
      {tabItems.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`office-tab-chip${activeTab === tab.key ? ' is-active' : ''}`}
          onClick={() => {
            setActiveTab(tab.key);
            setMobilePage(1);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const mobileItems = filteredItems.slice(
    (mobilePage - 1) * MOBILE_PAGE_SIZE,
    mobilePage * MOBILE_PAGE_SIZE
  );

  const mobileList = (
    <>
      <div className="office-recycle-list">
        {mobileItems.map((item) => (
          <div key={`${item.type}-${item.id}`} className="office-recycle-card">
            <div className="office-recycle-top">
              <Tag
                color={item.typeColor}
                style={{ margin: 0, borderRadius: 9, fontSize: 10.5, fontWeight: 700 }}
              >
                {item.typeName}
              </Tag>
              <span className="office-recycle-date">
                <Clock3 size={11} />
                {item.deletedAt ? dayjs(item.deletedAt).format('DD MMM, HH:mm') : '—'}
              </span>
            </div>

            <span className="office-recycle-title">{item.title}</span>
            {item.subtitle ? <span className="office-recycle-sub">{item.subtitle}</span> : null}
            {item.details ? <span className="office-recycle-sub">{item.details}</span> : null}

            <div className="office-recycle-actions">
              {item.amount ? (
                <span className="office-recycle-amount">
                  {String(item.type).includes('EXPENSE') || String(item.type).includes('UPAD')
                    ? '− '
                    : ''}
                  {formatCurrency(item.amount)}
                </span>
              ) : (
                <span />
              )}
              <Button
                size="small"
                icon={<RotateCcw size={13} />}
                onClick={() => handleRestore(item)}
                loading={
                  restoreMutation.isPending &&
                  restoreMutation.variables?.id === item.id
                }
              >
                Restore
              </Button>
              <Popconfirm
                title="Delete permanently?"
                description="This action cannot be undone."
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={() => handlePermanentDelete(item)}
              >
                <Button size="small" danger type="text" icon={<Trash2 size={13} />}>
                  Delete
                </Button>
              </Popconfirm>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length > MOBILE_PAGE_SIZE ? (
        <Pagination
          size="small"
          align="center"
          current={mobilePage}
          pageSize={MOBILE_PAGE_SIZE}
          total={filteredItems.length}
          showSizeChanger={false}
          onChange={setMobilePage}
          style={{ marginTop: 14 }}
        />
      ) : null}
    </>
  );

  return (
    <div className="advocate-module office-page">
      <OfficePageHeader
        title="Recycle Bin"
        subtitle={`${counts.total} deleted ${counts.total === 1 ? 'record' : 'records'} in the bin`}
        icon={Trash2}
        actions={
          counts.total > 0 ? (
            <Button
              danger
              type="primary"
              icon={<Trash2 size={15} />}
              onClick={handleEmptyRecycleBin}
              loading={emptyRecycleBinMutation.isPending}
            >
              Empty bin
            </Button>
          ) : null
        }
      />

      <OfficeToolbar
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setMobilePage(1);
        }}
        searchPlaceholder="Search deleted items…"
      />

      {/* Tabs & Table */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        }}
        styles={{ body: { padding: '12px 14px 18px' } }}
      >
        {isMobile ? (
          mobileTabs
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              setMobilePage(1);
            }}
            items={tabItems}
            style={{ marginBottom: 12 }}
          />
        )}

        {isLoading ? (
          isMobile ? <MobileListSkeleton count={5} /> : <TableLoadingSkeleton rows={7} columns={5} />
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '40px 0' }}>
            <EmptyState
              title={
                searchQuery
                  ? 'No matching deleted items found'
                  : 'Recycle Bin is empty'
              }
              description={
                searchQuery
                  ? 'Try searching with a different keyword.'
                  : 'Items you delete from Clients, Tasks, Expenses, Upad, or Settings will appear here.'
              }
            />
          </div>
        ) : isMobile ? (
          mobileList
        ) : (
          <Table
            className="modern-dashboard-table"
            columns={columns}
            dataSource={filteredItems}
            rowKey={(r) => `${r.type}-${r.id}`}
            pagination={{ pageSize: 12, showSizeChanger: true }}
            size="middle"
          />
        )}
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Modal, Segmented, Skeleton, message } from 'antd';
import { Plus, ReceiptText, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useActiveFinancialYear } from '../../hooks/useFinancialYears';
import { useDeleteLedgerEntry, useOfficeLedger } from '../../hooks/useLedger';
import { getPresetRange } from '../../lib/date';
import { formatDisplayDate } from '../../lib/date';
import { formatCurrency } from '../../lib/currency';
import { getErrorMessage } from '../../lib/errors';
import { sortEntriesNewestFirst, summarizeEntries } from '../../lib/ledger';
import DateFilterChips from '../../components/DateFilterChips';
import TransactionItem from '../../components/TransactionItem';
import EmptyState from '../../components/EmptyState';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { fyRange, isLoading: fyLoading, isError: fyError, error: fyErrorValue } =
    useActiveFinancialYear();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [entryType, setEntryType] = useState('ALL');
  const [preset, setPreset] = useState('THIS_FY');
  const [customRange, setCustomRange] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const selectedRange = useMemo(
    () => getPresetRange(preset, fyRange, customRange),
    [preset, fyRange, customRange]
  );

  const ledgerQuery = useOfficeLedger(
    { fyRange, range: selectedRange, entryType, search },
    { enabled: Boolean(fyRange && selectedRange) }
  );

  const entries = useMemo(
    () => sortEntriesNewestFirst(ledgerQuery.data?.entries || []),
    [ledgerQuery.data]
  );

  const summary = useMemo(() => {
    const serverSummary = ledgerQuery.data?.summary;
    if (serverSummary) {
      return {
        income: Number(serverSummary.incomeTotal) || 0,
        expense: Number(serverSummary.expenseTotal) || 0,
        net: Number(serverSummary.netAmount) || 0,
        count: Number(serverSummary.recordCount) || 0,
      };
    }
    return summarizeEntries(entries);
  }, [ledgerQuery.data, entries]);

  const deleteMutation = useDeleteLedgerEntry(fyRange);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, entryType, preset, customRange?.startDate, customRange?.endDate, fyRange?.id]);

  const confirmDelete = (entry) => {
    Modal.confirm({
      title: 'Delete this transaction?',
      content: (
        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{entry.details}</p>
          <p style={{ margin: 0, color: '#64748b' }}>
            {formatDisplayDate(entry.entryDate)} • {entry.entryType === 'INCOME' ? 'Income' : 'Expense'} •{' '}
            {formatCurrency(entry.amount)}
          </p>
          <p style={{ margin: '8px 0 0', color: '#dc2626' }}>
            The entry moves to the Recycle Bin and disappears from both apps.
          </p>
        </div>
      ),
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      async onOk() {
        try {
          await deleteMutation.mutateAsync(entry.id);
          message.success('Transaction deleted.');
        } catch (error) {
          message.error(getErrorMessage(error, 'Could not delete the transaction.'));
        }
      },
    });
  };

  const hasFilters = Boolean(searchInput || entryType !== 'ALL' || preset !== 'THIS_FY');
  const visibleEntries = entries.slice(0, visibleCount);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setEntryType('ALL');
    setPreset('THIS_FY');
    setCustomRange(null);
  };

  if (fyLoading) {
    return (
      <div className="page">
        <Skeleton active title={{ width: '45%' }} paragraph={{ rows: 1 }} />
        <div className="skeleton-card" style={{ height: 90, marginTop: 14 }} />
        <div className="skeleton-card" style={{ height: 230, marginTop: 12 }} />
      </div>
    );
  }

  if (fyError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Could not load financial years"
        description={getErrorMessage(fyErrorValue)}
      />
    );
  }

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Entries for {user?.name || 'your account'}</p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate('/add')}
          style={{ borderRadius: 12, fontWeight: 700 }}
        >
          Add
        </Button>
      </div>

      <div className="filter-card" style={{ marginTop: 14 }}>
        <Input
          className="search-input"
          size="large"
          allowClear
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          prefix={<Search size={16} color="#94a3b8" />}
          placeholder="Search particulars or category"
          aria-label="Search transactions"
        />

        <div style={{ marginTop: 10 }}>
          <Segmented
            block
            className="type-segment"
            value={entryType}
            onChange={setEntryType}
            options={[
              { label: 'All', value: 'ALL' },
              { label: 'Income', value: 'INCOME' },
              { label: 'Expense', value: 'EXPENSE' },
            ]}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <DateFilterChips
            value={preset}
            onChange={(nextPreset, range) => {
              setPreset(nextPreset);
              if (nextPreset === 'CUSTOM') setCustomRange(range);
            }}
            customRange={customRange}
            fyRange={fyRange}
          />
        </div>

        {hasFilters ? (
          <Button
            type="text"
            size="small"
            icon={<X size={13} />}
            onClick={clearFilters}
            style={{ marginTop: 4, color: '#64748b', fontWeight: 600, paddingInline: 0 }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="summary-strip">
        <div className="summary-strip-item">
          <div className="summary-strip-label">Income</div>
          <div className="summary-strip-value" style={{ color: '#059669' }}>
            {formatCurrency(summary.income)}
          </div>
        </div>
        <div className="summary-strip-item">
          <div className="summary-strip-label">Expense</div>
          <div className="summary-strip-value" style={{ color: '#dc2626' }}>
            {formatCurrency(summary.expense)}
          </div>
        </div>
        <div className="summary-strip-item">
          <div className="summary-strip-label">Net</div>
          <div className="summary-strip-value" style={{ color: summary.net >= 0 ? '#4f46e5' : '#dc2626' }}>
            {formatCurrency(summary.net)}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">
            {summary.count} {summary.count === 1 ? 'transaction' : 'transactions'}
          </h2>
          <SlidersHorizontal size={15} color="#94a3b8" />
        </div>

        {ledgerQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="Could not load transactions"
            description={getErrorMessage(ledgerQuery.error)}
            action={
              <Button size="small" onClick={() => ledgerQuery.refetch()}>
                Retry
              </Button>
            }
          />
        ) : ledgerQuery.isLoading ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton-card" style={{ height: 66 }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={hasFilters ? 'No matching transactions' : 'No transactions yet'}
            text={
              hasFilters
                ? 'Try a different search term, type, or date range.'
                : 'Add your first income or expense entry and it will appear here instantly.'
            }
            action={
              hasFilters ? (
                <Button onClick={clearFilters}>Clear filters</Button>
              ) : (
                <Button
                  type="primary"
                  icon={<Plus size={16} />}
                  onClick={() => navigate('/add')}
                  style={{ borderRadius: 12, fontWeight: 700 }}
                >
                  Add transaction
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="txn-list">
              {visibleEntries.map((entry) => (
                <TransactionItem
                  key={entry.id}
                  entry={entry}
                  onEdit={() => navigate(`/transactions/${entry.id}/edit`)}
                  onDelete={confirmDelete}
                />
              ))}
            </div>

            {visibleCount < entries.length ? (
              <Button
                block
                size="large"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                style={{ marginTop: 12, borderRadius: 12, fontWeight: 700 }}
              >
                Load more ({entries.length - visibleCount} remaining)
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

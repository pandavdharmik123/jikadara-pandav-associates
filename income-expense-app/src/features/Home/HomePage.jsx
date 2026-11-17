import { useMemo, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useActiveFinancialYear } from '../../hooks/useFinancialYears';
import { useOfficeLedger } from '../../hooks/useLedger';
import { getPresetRange } from '../../lib/date';
import {
  buildDashboard,
  filterEntriesByRange,
  sortEntriesNewestFirst,
  summarizeEntries,
} from '../../lib/ledger';
import { formatCurrency } from '../../lib/currency';
import { getErrorMessage } from '../../lib/errors';
import SummaryCard from '../../components/SummaryCard';
import DateFilterChips from '../../components/DateFilterChips';
import TransactionItem from '../../components/TransactionItem';
import EmptyState from '../../components/EmptyState';

function HomeSkeleton() {
  return (
    <div>
      <Skeleton active title={{ width: '58%' }} paragraph={{ rows: 1 }} />
      <div className="skeleton-card" style={{ height: 150, marginTop: 14 }} />
      <div className="summary-grid">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="skeleton-card" style={{ height: 76 }} />
        ))}
      </div>
      <div className="skeleton-card" style={{ height: 74, marginTop: 18 }} />
      <div className="skeleton-card" style={{ height: 150, marginTop: 14 }} />
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { fyRange, isLoading: fyLoading, isError: fyError, error: fyErrorValue, refetch: refetchFy } =
    useActiveFinancialYear();

  const [preset, setPreset] = useState('THIS_FY');
  const [customRange, setCustomRange] = useState(null);

  const ledgerQuery = useOfficeLedger(
    { fyRange, range: fyRange },
    { enabled: Boolean(fyRange) }
  );

  const entries = ledgerQuery.data?.entries || [];
  const selectedRange = useMemo(
    () => getPresetRange(preset, fyRange, customRange),
    [preset, fyRange, customRange]
  );

  const filteredEntries = useMemo(
    () => filterEntriesByRange(entries, selectedRange),
    [entries, selectedRange]
  );
  const filteredSummary = useMemo(() => summarizeEntries(filteredEntries), [filteredEntries]);
  const dashboard = useMemo(() => buildDashboard(entries, fyRange), [entries, fyRange]);
  const recent = useMemo(
    () => sortEntriesNewestFirst(filteredEntries).slice(0, 5),
    [filteredEntries]
  );

  if (fyLoading || (fyRange && ledgerQuery.isLoading)) {
    return <HomeSkeleton />;
  }

  if (fyError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Could not load financial years"
        description={getErrorMessage(fyErrorValue)}
        action={
          <Button size="small" onClick={() => refetchFy()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!fyRange) {
    return (
      <div className="page fade-in">
        <h1 className="page-title">Hello, {user?.name || 'there'}</h1>
        <p className="page-subtitle">Your office income &amp; expense book</p>
        <div style={{ marginTop: 18 }}>
          <EmptyState
            icon={CalendarDays}
            title="No financial year configured"
            text="Create or select a financial year from Profile → Financial Years in the main website, then reopen this app."
          />
        </div>
      </div>
    );
  }

  if (ledgerQuery.isError) {
    return (
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
    );
  }

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 className="page-title">Hello, {user?.name?.split(' ')[0] || 'there'}</h1>
          <p className="page-subtitle">Your office income &amp; expense book</p>
        </div>
        <Button
          type="text"
          aria-label="Refresh data"
          title="Refresh data"
          icon={<RefreshCw size={17} className={ledgerQuery.isFetching ? 'spin-icon' : ''} />}
          onClick={() => ledgerQuery.refetch()}
          style={{ color: '#64748b' }}
        />
      </div>

      <div className="hero-card" style={{ marginTop: 16 }}>
        <p className="hero-label">Net balance</p>
        <p className="hero-balance">{formatCurrency(filteredSummary.net)}</p>
        <div className="hero-split">
          <div className="hero-split-item">
            <span className="hero-split-label">
              <TrendingUp size={13} /> Income
            </span>
            <div className="hero-split-value">{formatCurrency(filteredSummary.income)}</div>
          </div>
          <div className="hero-split-item">
            <span className="hero-split-label">
              <TrendingDown size={13} /> Expenses
            </span>
            <div className="hero-split-value">{formatCurrency(filteredSummary.expense)}</div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <button type="button" className="quick-action income" onClick={() => navigate('/add?type=INCOME')}>
          <span className="quick-action-icon">
            <ArrowDownLeft size={18} />
          </span>
          Add income
        </button>
        <button type="button" className="quick-action expense" onClick={() => navigate('/add?type=EXPENSE')}>
          <span className="quick-action-icon">
            <ArrowUpRight size={18} />
          </span>
          Add expense
        </button>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Today &amp; this month</h2>
        </div>
        <div className="summary-grid">
          <SummaryCard
            icon={TrendingUp}
            label="Today's income"
            value={formatCurrency(dashboard.today.income)}
            tone="income"
          />
          <SummaryCard
            icon={TrendingDown}
            label="Today's expenses"
            value={formatCurrency(dashboard.today.expense)}
            tone="expense"
          />
          <SummaryCard
            icon={Wallet}
            label="Monthly income"
            value={formatCurrency(dashboard.month.income)}
            tone="income"
            sub="This calendar month"
          />
          <SummaryCard
            icon={Wallet}
            label="Monthly expenses"
            value={formatCurrency(dashboard.month.expense)}
            tone="expense"
            sub="This calendar month"
          />
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Period</h2>
        </div>
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

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Recent transactions</h2>
          <button type="button" className="section-link" onClick={() => navigate('/transactions')}>
            View all
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No transactions in this period"
            text="Add your first income or expense entry to get started."
            action={
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => navigate('/add')}
                style={{ borderRadius: 12, fontWeight: 700 }}
              >
                Add transaction
              </Button>
            }
          />
        ) : (
          <div className="txn-list">
            {recent.map((entry) => (
              <TransactionItem
                key={entry.id}
                entry={entry}
                onEdit={() => navigate(`/transactions/${entry.id}/edit`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

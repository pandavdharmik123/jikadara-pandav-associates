import { useState } from 'react';
import { Alert, Button, Skeleton, message } from 'antd';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useActiveFinancialYear } from '../../hooks/useFinancialYears';
import { useCreateLedgerEntry } from '../../hooks/useLedger';
import { getErrorMessage } from '../../lib/errors';
import { ENTRY_TYPE } from '../../lib/ledger';
import EmptyState from '../../components/EmptyState';
import TransactionForm from '../../components/TransactionForm';

export default function AddTransactionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { fyRange, isLoading: fyLoading, isError: fyError, error: fyErrorValue } =
    useActiveFinancialYear();

  const typeParam = searchParams.get('type');
  // Open the expense form by default; the income/expense tabs inside the form
  // still allow switching (no intermediate "choose type" page).
  const initialType = typeParam === ENTRY_TYPE.INCOME
    ? ENTRY_TYPE.INCOME
    : ENTRY_TYPE.EXPENSE;

  const [type, setType] = useState(initialType);
  const [error, setError] = useState('');
  const createMutation = useCreateLedgerEntry(fyRange);

  const handleSubmit = async (payload) => {
    setError('');

    try {
      await createMutation.mutateAsync(payload);
      message.success(`${payload.entryType === ENTRY_TYPE.INCOME ? 'Income' : 'Expense'} added successfully.`);
      navigate('/transactions', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the transaction. Please try again.'));
    }
  };

  if (fyLoading) {
    return (
      <div className="page">
        <Skeleton active title={{ width: '45%' }} paragraph={{ rows: 1 }} />
        <div className="skeleton-card" style={{ height: 300, marginTop: 16 }} />
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

  if (!fyRange) {
    return (
      <div className="page">
        <h1 className="page-title">Add transaction</h1>
        <p className="page-subtitle">Choose where this entry should go</p>
        <div style={{ marginTop: 18 }}>
          <EmptyState
            icon={Plus}
            title="No financial year configured"
            text="Create or select a financial year from Profile → Financial Years in the main website, then try again."
          />
        </div>
      </div>
    );
  }

  const isIncome = type === ENTRY_TYPE.INCOME;

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Button
          type="text"
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          aria-label="Go back"
          style={{ color: '#64748b', paddingInline: 4 }}
        />
        <div>
          <h1 className="page-title">{isIncome ? 'Add income' : 'Add expense'}</h1>
          <p className="page-subtitle">Saved straight to the shared office ledger</p>
        </div>
      </div>

      <div className="form-card">
        <TransactionForm
          mode="create"
          entryType={type}
          fyRange={fyRange}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending}
          error={error}
          onTypeChange={(nextType) => {
            setType(nextType);
            setSearchParams({ type: nextType });
          }}
        />
      </div>
    </div>
  );
}

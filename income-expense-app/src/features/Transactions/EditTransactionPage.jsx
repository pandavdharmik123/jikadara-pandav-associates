import { useState } from 'react';
import { Alert, Button, Modal, Skeleton, message } from 'antd';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActiveFinancialYear } from '../../hooks/useFinancialYears';
import {
  useDeleteLedgerEntry,
  useLedgerEntry,
  useUpdateLedgerEntry,
} from '../../hooks/useLedger';
import { formatCurrency } from '../../lib/currency';
import { formatDisplayDate } from '../../lib/date';
import { getErrorMessage } from '../../lib/errors';
import EmptyState from '../../components/EmptyState';
import TransactionForm from '../../components/TransactionForm';

export default function EditTransactionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fyRange, isLoading: fyLoading, isError: fyError, error: fyErrorValue } =
    useActiveFinancialYear();

  const entryQuery = useLedgerEntry({ fyRange, id });
  const updateMutation = useUpdateLedgerEntry(fyRange);
  const deleteMutation = useDeleteLedgerEntry(fyRange);
  const [error, setError] = useState('');

  const entry = entryQuery.data;

  const handleSubmit = async (payload) => {
    setError('');

    try {
      await updateMutation.mutateAsync({ id, ...payload });
      message.success('Transaction updated successfully.');
      navigate('/transactions', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update the transaction. Please try again.'));
    }
  };

  const confirmDelete = (record) => {
    if (!record) return;

    Modal.confirm({
      title: 'Delete this transaction?',
      content: (
        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{record.details}</p>
          <p style={{ margin: 0, color: '#64748b' }}>
            {formatDisplayDate(record.entryDate)} •{' '}
            {record.entryType === 'INCOME' ? 'Income' : 'Expense'} • {formatCurrency(record.amount)}
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
          await deleteMutation.mutateAsync(record.id);
          message.success('Transaction deleted.');
          navigate('/transactions', { replace: true });
        } catch (err) {
          message.error(getErrorMessage(err, 'Could not delete the transaction.'));
        }
      },
    });
  };

  if (fyLoading || entryQuery.isLoading) {
    return (
      <div className="page">
        <Skeleton active title={{ width: '50%' }} paragraph={{ rows: 1 }} />
        <div className="skeleton-card" style={{ height: 340, marginTop: 16 }} />
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

  if (entryQuery.isError) {
    const notFound = entryQuery.error?.response?.status === 404;

    return (
      <div className="page">
        <Button
          type="text"
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate('/transactions')}
          style={{ color: '#64748b', paddingInline: 4, marginBottom: 8 }}
        >
          Back to transactions
        </Button>

        {notFound ? (
          <EmptyState
            icon={FileQuestion}
            title="Transaction not found"
            text="This entry does not belong to the selected financial year, or it may have already been deleted. Change the financial year from the header and try again."
            action={<Button onClick={() => navigate('/transactions')}>View transactions</Button>}
          />
        ) : (
          <Alert
            type="error"
            showIcon
            message="Could not load this transaction"
            description={getErrorMessage(entryQuery.error)}
            action={
              <Button size="small" onClick={() => entryQuery.refetch()}>
                Retry
              </Button>
            }
          />
        )}
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="page">
        <EmptyState
          icon={FileQuestion}
          title="Transaction not found"
          text="The entry may have been deleted or moved outside the selected financial year."
          action={<Button onClick={() => navigate('/transactions')}>Back to transactions</Button>}
        />
      </div>
    );
  }

  const isIncome = entry.entryType === 'INCOME';

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Button
          type="text"
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate('/transactions')}
          aria-label="Back to transactions"
          style={{ color: '#64748b', paddingInline: 4 }}
        />
        <div>
          <h1 className="page-title">Edit {isIncome ? 'income' : 'expense'}</h1>
          <p className="page-subtitle">Update the shared transaction record</p>
        </div>
      </div>

      <div className="form-card">
        <TransactionForm
          mode="edit"
          initialEntry={entry}
          fyRange={fyRange}
          onSubmit={handleSubmit}
          onDelete={confirmDelete}
          submitting={updateMutation.isPending}
          deleting={deleteMutation.isPending}
          error={error}
        />
      </div>
    </div>
  );
}

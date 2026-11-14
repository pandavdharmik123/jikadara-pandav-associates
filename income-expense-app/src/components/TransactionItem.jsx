import { Button, Tooltip } from 'antd';
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { formatSignedAmount } from '../lib/currency';
import { formatDisplayDate } from '../lib/date';

export default function TransactionItem({ entry, onEdit, onDelete, showActions = true }) {
  const isIncome = entry.entryType === 'INCOME';
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
  const tone = isIncome ? 'income' : 'expense';
  const category = !isIncome && entry.expenseType && entry.expenseType !== 'અન્ય'
    ? entry.expenseType
    : '';

  return (
    <div className="txn-item rise">
      <span className={`txn-icon ${tone}`}>
        <Icon size={18} strokeWidth={2.4} />
      </span>

      <div className="txn-main">
        <p className="txn-title">{entry.details || (isIncome ? 'Income entry' : 'Expense entry')}</p>
        <div className="txn-meta">
          <span>{formatDisplayDate(entry.entryDate)}</span>
          <span>•</span>
          <span>{isIncome ? 'Income' : 'Expense'}</span>
          {category ? <span className="txn-category">{category}</span> : null}
        </div>
      </div>

      <div className="txn-right">
        <span className={`txn-amount ${tone}`}>{formatSignedAmount(entry.entryType, entry.amount)}</span>
        {showActions ? (
          <div className="txn-actions">
            {onEdit ? (
              <Tooltip title="Edit transaction">
                <Button
                  type="text"
                  size="small"
                  aria-label="Edit transaction"
                  icon={<Pencil size={13} />}
                  onClick={() => onEdit(entry)}
                />
              </Tooltip>
            ) : null}
            {onDelete ? (
              <Tooltip title="Delete transaction">
                <Button
                  type="text"
                  size="small"
                  danger
                  aria-label="Delete transaction"
                  icon={<Trash2 size={13} />}
                  onClick={() => onDelete(entry)}
                />
              </Tooltip>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

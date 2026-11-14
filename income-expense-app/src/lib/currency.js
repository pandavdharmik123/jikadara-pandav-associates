export function formatCurrency(value) {
  const amount = Number(value || 0);
  const hasPaise = Math.abs(Math.round(amount * 100) % 100) !== 0;

  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: hasPaise ? 2 : 0,
  });
}

export function formatAmountOnly(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

export function formatSignedAmount(type, value) {
  const prefix = type === 'INCOME' ? '+' : '-';
  return `${prefix} ${formatCurrency(Math.abs(Number(value || 0)))}`;
}

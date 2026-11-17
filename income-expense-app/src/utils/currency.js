export const formatCurrency = (val) => {
  const amount = Number(val || 0);
  const hasPaise = Math.abs(Math.round(amount * 100) % 100) !== 0;

  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: hasPaise ? 2 : 0,
  });
};

/**
 * Formats derived split shares. Paise are shown only when the value actually
 * contains paise, so equal splits still read cleanly.
 */
export const formatCurrencyPrecise = (val) => {
  const amount = Number(val || 0);
  const hasPaise = Math.round(amount * 100) % 100 !== 0;

  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: hasPaise ? 2 : 0
  });
};

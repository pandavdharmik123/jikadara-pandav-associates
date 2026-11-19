/**
 * Two-column compact stat tiles.
 *
 * `items`: [{ label, value, icon, tone, hint, onClick }]
 * `tone`: brand | income | expense | warning | violet | cyan | slate
 *
 * Tiles are small enough that two fit on a 360px phone, which keeps the
 * important numbers above the fold instead of stacking full-width cards.
 */
const TONES = {
  brand: { bg: 'var(--brand-soft)', fg: 'var(--brand-dark)' },
  income: { bg: 'var(--income-soft)', fg: '#047857' },
  expense: { bg: 'var(--expense-soft)', fg: '#b91c1c' },
  warning: { bg: '#fffbeb', fg: '#b45309' },
  violet: { bg: '#f5f3ff', fg: '#6d28d9' },
  cyan: { bg: '#ecfeff', fg: '#0e7490' },
  slate: { bg: '#f1f5f9', fg: '#475569' },
};

export default function OfficeStatGrid({ items = [], columns = 2 }) {
  if (items.length === 0) return null;

  return (
    <div className="office-stat-grid" data-columns={columns}>
      {items.map((item) => {
        const { label, value, icon: Icon, tone = 'brand', hint, onClick } = item;
        const palette = TONES[tone] || TONES.brand;
        const Tag = onClick ? 'button' : 'div';

        return (
          <Tag
            key={label}
            type={onClick ? 'button' : undefined}
            className={`office-stat${onClick ? ' office-stat--action' : ''}`}
            onClick={onClick}
          >
            <span
              className="office-stat-icon"
              style={{ background: palette.bg, color: palette.fg }}
            >
              {Icon ? <Icon size={15} strokeWidth={2.3} /> : null}
            </span>
            <span className="office-stat-label">{label}</span>
            <span className="office-stat-value">{value}</span>
            {hint ? <span className="office-stat-hint">{hint}</span> : null}
          </Tag>
        );
      })}
    </div>
  );
}

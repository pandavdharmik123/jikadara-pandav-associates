export default function SummaryCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  return (
    <div className="summary-card">
      <span className={`summary-icon ${tone}`}>{Icon ? <Icon size={17} /> : null}</span>
      <div className="summary-body">
        <p className="summary-label">{label}</p>
        <p className={`summary-value ${tone}`}>{value}</p>
        {sub ? <p className="summary-sub">{sub}</p> : null}
      </div>
    </div>
  );
}

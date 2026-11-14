export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state">
      {Icon ? (
        <span className="empty-icon">
          <Icon size={24} />
        </span>
      ) : null}
      <h2 className="empty-title">{title}</h2>
      {text ? <p className="empty-text">{text}</p> : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

export default function EmptyState({ icon: Icon, title, text, description, action }) {
  const message = text ?? description;

  return (
    <div className="empty-state">
      {Icon ? (
        <span className="empty-icon">
          <Icon size={24} />
        </span>
      ) : null}
      <h2 className="empty-title">{title}</h2>
      {message ? <p className="empty-text">{message}</p> : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

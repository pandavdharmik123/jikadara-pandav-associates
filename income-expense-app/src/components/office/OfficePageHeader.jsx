/**
 * Compact page header used by every Office module.
 * Title + subtitle on the left, primary action(s) on the right.
 * On phones the action collapses to a small pill button so the title stays
 * readable instead of stacking a full-width button under it.
 */
export default function OfficePageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
}) {
  return (
    <div className="office-header">
      <div className="office-header-main">
        {Icon ? (
          <span className="office-header-icon">
            <Icon size={19} strokeWidth={2.2} />
          </span>
        ) : null}
        <div className="office-header-copy">
          <h1 className="office-header-title">{title}</h1>
          {subtitle ? <p className="office-header-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="office-header-actions">{actions}</div> : null}
      {children ? <div className="office-header-extra">{children}</div> : null}
    </div>
  );
}

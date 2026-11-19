import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CalendarRange, ChevronRight } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useActiveFinancialYear } from '../../hooks/useFinancialYears';
import { getAdvocateSections } from './advocateCatalog';

function OfficeTile({ item, onOpen }) {
  const Icon = item.icon;

  return (
    <button type="button" className="tool-tile" onClick={() => onOpen(item.key)}>
      <span className="tool-tile-icon">
        <Icon size={19} strokeWidth={2.2} />
      </span>
      <span className="tool-tile-copy">
        <span className="tool-tile-label">{item.label}</span>
        <span className="tool-tile-description">{item.description}</span>
      </span>
      <ChevronRight className="tool-tile-chevron" size={18} />
    </button>
  );
}

export default function AdvocateHub() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { fy } = useActiveFinancialYear();

  const sections = useMemo(() => getAdvocateSections(user), [user]);
  const total = sections.reduce((count, section) => count + section.items.length, 0);

  return (
    <div className="tools-page advocate-hub">
      <div className="tools-hero">
        <span className="tools-hero-icon">
          <Briefcase size={22} />
        </span>
        <div>
          <h1 className="page-title">Office</h1>
          <p className="page-subtitle">
            {total} {total === 1 ? 'module' : 'modules'} available for your account
          </p>
        </div>
      </div>

      {fy ? (
        <div className="advocate-fy-pill">
          <CalendarRange size={14} />
          <span>
            Financial year <strong>{fy.name}</strong>
          </span>
        </div>
      ) : null}

      {sections.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <span className="empty-icon">
            <Briefcase size={22} />
          </span>
          <h2 className="empty-title">No office modules enabled</h2>
          <p className="empty-text">
            Ask an administrator to grant Advocate Management page access from
            the existing Admin → Users page.
          </p>
        </div>
      ) : (
        sections.map((section) => (
          <section className="section tools-group" key={section.title}>
            <div className="section-head">
              <h2 className="section-title">{section.title}</h2>
              <span className="tools-group-count">{section.items.length}</span>
            </div>
            <p className="tools-group-description">{section.description}</p>
            <div className="tool-tile-list">
              {section.items.map((item) => (
                <OfficeTile key={item.key} item={item} onOpen={navigate} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

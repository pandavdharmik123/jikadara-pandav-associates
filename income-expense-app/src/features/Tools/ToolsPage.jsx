import { useMemo, useState } from 'react';
import { Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, Wrench } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { canAccessTool } from '../../lib/permissions';
import { TOOL_GROUPS } from './toolsCatalog';

function ToolTile({ tool, onOpen }) {
  const Icon = tool.icon;

  return (
    <button type="button" className="tool-tile" onClick={() => onOpen(tool.key)}>
      <span className="tool-tile-icon">
        <Icon size={19} strokeWidth={2.2} />
      </span>
      <span className="tool-tile-copy">
        <span className="tool-tile-label">{tool.label}</span>
        <span className="tool-tile-description">{tool.description}</span>
      </span>
      <ChevronRight className="tool-tile-chevron" size={18} />
    </button>
  );
}

export default function ToolsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return TOOL_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((tool) => {
        if (!canAccessTool(user, tool)) return false;
        if (!needle) return true;
        return `${tool.label} ${tool.description}`.toLowerCase().includes(needle);
      }),
    })).filter((group) => group.items.length > 0);
  }, [query, user]);

  const total = groups.reduce((count, group) => count + group.items.length, 0);

  return (
    <div className="tools-page">
      <div className="tools-hero">
        <span className="tools-hero-icon">
          <Wrench size={22} />
        </span>
        <div>
          <h1 className="page-title">Tools</h1>
          <p className="page-subtitle">
            {total} {total === 1 ? 'tool' : 'tools'} available for your account
          </p>
        </div>
      </div>

      <Input
        allowClear
        className="tools-search"
        placeholder="Search tools"
        prefix={<Search size={16} />}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {groups.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <span className="empty-icon">
            <Wrench size={22} />
          </span>
          <h2 className="empty-title">
            {query ? 'No matching tools' : 'No tools enabled'}
          </h2>
          <p className="empty-text">
            {query
              ? 'Try a different word, such as translate, invoice or PAN.'
              : 'Ask an administrator to grant tool access from the existing Admin → Users page.'}
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section className="section tools-group" key={group.title}>
            <div className="section-head">
              <h2 className="section-title">{group.title}</h2>
              <span className="tools-group-count">{group.items.length}</span>
            </div>
            <p className="tools-group-description">{group.description}</p>
            <div className="tool-tile-list">
              {group.items.map((tool) => (
                <ToolTile key={tool.key} tool={tool} onOpen={navigate} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

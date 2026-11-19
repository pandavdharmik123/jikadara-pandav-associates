import { useEffect } from 'react';
import { Button, Select } from 'antd';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Briefcase, House, Plus, ReceiptText, UserRound, Wrench } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useActiveFinancialYear } from '../hooks/useFinancialYears';
import { COMPANY_NAME, COMPANY_TAGLINE } from '../lib/config';

function initials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const activeFinancialYear = useAuthStore((state) => state.activeFinancialYear);
  const setActiveFinancialYear = useAuthStore((state) => state.setActiveFinancialYear);
  const { financialYears, fy, selectFy } = useActiveFinancialYear();

  // Advocate Management pages (ported from the website) read the active FY
  // from the auth store. Keep it in sync with the app-wide FY selector.
  useEffect(() => {
    if (fy && fy.id !== activeFinancialYear?.id) {
      setActiveFinancialYear(fy);
    }
  }, [fy, activeFinancialYear?.id, setActiveFinancialYear]);

  const isAdvocateRoute = [
    '/app/advocate',
    '/app/dashboard',
    '/app/clients',
    '/app/tasks',
    '/app/reports',
    '/app/upad',
    '/app/recycle-bin',
    '/app/admin',
    '/app/excel-sheets',
  ].some((prefix) => location.pathname.startsWith(prefix));

  const active = location.pathname === '/'
    ? 'home'
    : location.pathname.startsWith('/transactions')
      ? 'transactions'
      : location.pathname === '/add'
        ? 'add'
        : isAdvocateRoute
          ? 'advocate'
          : location.pathname.startsWith('/app/tools')
            ? 'tools'
            : location.pathname === '/profile'
              ? 'profile'
              : 'home';

  const isInsideTool = location.pathname.startsWith('/app/tools/') && location.pathname !== '/app/tools';

  const navItems = [
    { key: 'home', label: 'Home', icon: House, onClick: () => navigate('/') },
    {
      key: 'transactions',
      label: 'Transactions',
      icon: ReceiptText,
      onClick: () => navigate('/transactions'),
    },
    { key: 'add', label: 'Add', isAdd: true, onClick: () => navigate('/add') },
    {
      key: 'advocate',
      label: 'Office',
      icon: Briefcase,
      onClick: () => navigate('/app/advocate'),
    },
    { key: 'tools', label: 'Tools', icon: Wrench, onClick: () => navigate('/app/tools') },
    { key: 'profile', label: 'Profile', icon: UserRound, onClick: () => navigate('/profile') },
  ];

  return (
    <div className={`app-shell${isInsideTool ? ' app-shell--inside-tool' : ''}`}>
      <header className="app-header">
        <button
          type="button"
          className="brand"
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}
          aria-label="Go to home"
        >
          <img className="brand-logo" src="/logo-icon.png" alt="Jikadara & Pandav Associates logo" />
          <span className="brand-text">
            <span className="brand-name">{COMPANY_NAME}</span>
            <span className="brand-tagline">{COMPANY_TAGLINE}</span>
          </span>
        </button>

        <div className="header-actions">
          {financialYears.length > 0 ? (
            <Select
              className="fy-select"
              aria-label="Select financial year"
              value={fy?.id}
              onChange={selectFy}
              options={financialYears.map((year) => ({ value: year.id, label: year.name }))}
              popupMatchSelectWidth={false}
              variant="borderless"
              size="small"
            />
          ) : null}

          <Button
            className="avatar-button"
            aria-label="Open profile"
            title="Open profile"
            onClick={() => navigate('/profile')}
          >
            {initials(user?.name)}
          </Button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      {!isInsideTool && (
        <nav className="bottom-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.isAdd) {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`nav-add${active === 'add' ? ' active' : ''}`}
                  onClick={item.onClick}
                  aria-current={active === 'add' ? 'page' : undefined}
                >
                  <span className="nav-add-button">
                    <Plus size={24} strokeWidth={2.6} />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item${active === item.key ? ' active' : ''}`}
                onClick={item.onClick}
                aria-current={active === item.key ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={active === item.key ? 2.5 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

import { Button, Modal, Select, message } from 'antd';
import {
  Building2,
  CalendarRange,
  Download,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import useAuthStore from '../../store/authStore';
import { useActiveFinancialYear } from '../../hooks/useFinancialYears';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { APP_VERSION, COMPANY_NAME, COMPANY_TAGLINE } from '../../lib/config';
import { dayjs } from '../../lib/date';

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  SENIOR: 'Senior Advocate',
  JUNIOR: 'Junior Advocate',
};

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

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="info-row">
      <span className="info-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} color="#94a3b8" />
        {label}
      </span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { financialYears, fy, selectFy } = useActiveFinancialYear();
  const { canInstall, isStandalone, install } = useInstallPrompt();
  // Inside the native shells the app is already installed; browser install
  // prompts would be confusing and cannot work there.
  const isNative = Capacitor.isNativePlatform();

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === 'accepted') message.success('App installed.');
    if (outcome === 'dismissed') message.info('Installation cancelled.');
    if (outcome === 'unavailable') {
      message.info('Use your browser menu → “Add to Home Screen” to install this app.');
    }
  };

  const confirmLogout = () => {
    Modal.confirm({
      title: 'Log out?',
      content: 'You will need to sign in again to view the income & expense book.',
      okText: 'Log out',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk() {
        logout();
        message.success('Logged out.');
        navigate('/login', { replace: true });
      },
    });
  };

  const memberSince = user?.createdAt ? dayjs(user.createdAt).format('DD MMM YYYY') : '—';

  return (
    <div className="page fade-in">
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Your account and app settings</p>

      <div className="profile-hero" style={{ marginTop: 14 }}>
        <span className="profile-avatar">{initials(user?.name)}</span>
        <div style={{ minWidth: 0 }}>
          <h2 className="profile-name">{user?.name || 'User'}</h2>
          <span className="profile-role">{ROLE_LABELS[user?.role] || user?.role || 'User'}</span>
          <p className="profile-email">{user?.email}</p>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Account</h2>
        </div>
        <div className="card" style={{ padding: '4px 14px' }}>
          <InfoRow icon={Mail} label="Email" value={user?.email || '—'} />
          <InfoRow icon={Phone} label="Mobile" value={user?.mobileNumber || 'Not added'} />
          <InfoRow icon={ShieldCheck} label="Role" value={ROLE_LABELS[user?.role] || user?.role || '—'} />
          <InfoRow icon={CalendarRange} label="Member since" value={memberSince} />
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">Financial year</h2>
        </div>
        <div className="card" style={{ padding: 14 }}>
          {financialYears.length > 0 ? (
            <>
              <Select
                style={{ width: '100%' }}
                size="large"
                value={fy?.id}
                onChange={selectFy}
                options={financialYears.map((year) => ({ value: year.id, label: year.name }))}
                aria-label="Active financial year"
              />
              <p style={{ margin: '8px 2px 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                This selection is shared with the same financial-year ranges used by the main
                website. Entries are always saved inside the selected year.
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              No financial year found. Add one from Profile → Financial Years in the main website.
            </p>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">About this app</h2>
        </div>
        <div className="card" style={{ padding: '4px 14px' }}>
          <InfoRow icon={Building2} label="Company" value={COMPANY_NAME} />
          <InfoRow icon={Smartphone} label="Version" value={`v${APP_VERSION}`} />
          <InfoRow
            icon={ShieldCheck}
            label="Data"
            value="Shared office ledger"
          />
        </div>
        <p style={{ margin: '8px 2px 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          {COMPANY_TAGLINE}. Every entry is stored in the same database and transaction table used
          by the main website, so both apps always show the same records.
        </p>
      </div>

      {!isNative && (canInstall || !isStandalone) ? (
        <div className="section">
          <Button
            block
            size="large"
            icon={<Download size={17} />}
            onClick={handleInstall}
            style={{ height: 46, borderRadius: 13, fontWeight: 700 }}
          >
            {canInstall ? 'Install app on this device' : 'Add to Home Screen'}
          </Button>
          <p style={{ margin: '8px 2px 0', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
            On Android, open the browser menu and choose “Add to Home Screen”.
          </p>
        </div>
      ) : null}

      <div className="section">
        <Button
          block
          danger
          size="large"
          icon={<LogOut size={17} />}
          onClick={confirmLogout}
          style={{ height: 46, borderRadius: 13, fontWeight: 800 }}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}

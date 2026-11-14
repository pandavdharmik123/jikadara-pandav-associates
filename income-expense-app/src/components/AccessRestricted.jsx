import { Button } from 'antd';
import { LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { hasAnyToolAccess } from '../lib/permissions';

export default function AccessRestricted({
  title = 'Office Reports access required',
  message = (
    <>
      Your account does not have permission to open the office income &amp; expense ledger. Ask an
      administrator to grant <strong>Office Reports</strong> access from the existing Admin Panel.
    </>
  ),
}) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const canOpenTools = hasAnyToolAccess(user);

  return (
    <div className="empty-state" style={{ marginTop: 24 }}>
      <span className="empty-icon">
        <LockKeyhole size={24} />
      </span>
      <h2 className="empty-title">{title}</h2>
      <p className="empty-text">{message}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 }}>
        {canOpenTools ? <Button onClick={() => navigate('/app/tools')}>Open Tools</Button> : null}
        <Button onClick={() => navigate('/profile')}>View profile</Button>
        <Button type="primary" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}

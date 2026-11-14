import { Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { canUseOfficeLedger } from '../lib/permissions';
import AccessRestricted from './AccessRestricted';

export default function LedgerGate() {
  const user = useAuthStore((state) => state.user);

  if (!canUseOfficeLedger(user)) {
    return <AccessRestricted />;
  }

  return <Outlet />;
}

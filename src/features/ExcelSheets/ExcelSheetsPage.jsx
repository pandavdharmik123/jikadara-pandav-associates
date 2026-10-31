import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { getInitialUserRoute, hasPageAccess } from '../../utils/pagePermissions';
import OfficeLedgerPage from '../OfficeLedger/OfficeLedgerPage';
import NondhStatusList from '../NondhStatus/NondhStatusList';

const OFFICE_REPORTS_KEY = 'office-reports';
const NONDH_STATUS_KEY = 'nondh-status';

/**
 * Office Reports and Nondh Status live under Excel Sheets. The sidebar submenu
 * controls which sheet is open, so each URL renders its page directly without
 * a second tab header.
 */
export function ExcelSheetsRedirect() {
  const { user } = useAuthStore();
  const canViewOfficeReports = hasPageAccess(user, '/app/office-expenses');
  const canViewNondhStatus = hasPageAccess(user, '/app/nondh-status');

  if (canViewOfficeReports) {
    return <Navigate to={`/app/excel-sheets/${OFFICE_REPORTS_KEY}`} replace />;
  }

  if (canViewNondhStatus) {
    return <Navigate to={`/app/excel-sheets/${NONDH_STATUS_KEY}`} replace />;
  }

  return <Navigate to={getInitialUserRoute(user)} replace />;
}

export default function ExcelSheetsPage() {
  const { user } = useAuthStore();
  const location = useLocation();

  const canViewOfficeReports = hasPageAccess(user, '/app/office-expenses');
  const canViewNondhStatus = hasPageAccess(user, '/app/nondh-status');
  const isNondhStatusPage = location.pathname.endsWith(`/${NONDH_STATUS_KEY}`);

  if (isNondhStatusPage) {
    return canViewNondhStatus ? (
      <NondhStatusList />
    ) : (
      <Navigate to={`/app/excel-sheets/${OFFICE_REPORTS_KEY}`} replace />
    );
  }

  return canViewOfficeReports ? (
    <OfficeLedgerPage />
  ) : (
    <Navigate to={`/app/excel-sheets/${NONDH_STATUS_KEY}`} replace />
  );
}

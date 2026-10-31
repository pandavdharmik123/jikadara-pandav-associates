import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { getInitialUserRoute, hasPageAccess } from '../../utils/pagePermissions';
import OfficeLedgerPage from '../OfficeLedger/OfficeLedgerPage';
import NondhStatusList from '../NondhStatus/NondhStatusList';
import VerabillPage from '../Verabill/VerabillPage';

const OFFICE_REPORTS_KEY = 'office-reports';
const NONDH_STATUS_KEY = 'nondh-status';
const VERABILL_KEY = 'verabill';

export function ExcelSheetsRedirect() {
  const { user } = useAuthStore();
  const canViewOfficeReports = hasPageAccess(user, '/app/office-expenses');
  const canViewNondhStatus = hasPageAccess(user, '/app/nondh-status');
  const canViewVerabill = hasPageAccess(user, '/app/verabill');

  if (canViewOfficeReports) {
    return <Navigate to={`/app/excel-sheets/${OFFICE_REPORTS_KEY}`} replace />;
  }

  if (canViewNondhStatus) {
    return <Navigate to={`/app/excel-sheets/${NONDH_STATUS_KEY}`} replace />;
  }

  if (canViewVerabill) {
    return <Navigate to={`/app/excel-sheets/${VERABILL_KEY}`} replace />;
  }

  return <Navigate to={getInitialUserRoute(user)} replace />;
}

export default function ExcelSheetsPage() {
  const { user } = useAuthStore();
  const location = useLocation();

  const canViewOfficeReports = hasPageAccess(user, '/app/office-expenses');
  const canViewNondhStatus = hasPageAccess(user, '/app/nondh-status');
  const canViewVerabill = hasPageAccess(user, '/app/verabill');
  const isNondhStatusPage = location.pathname.endsWith(`/${NONDH_STATUS_KEY}`);
  const isVerabillPage = location.pathname.endsWith(`/${VERABILL_KEY}`);

  if (isVerabillPage) {
    return canViewVerabill ? (
      <VerabillPage />
    ) : (
      <Navigate to={`/app/excel-sheets/${OFFICE_REPORTS_KEY}`} replace />
    );
  }

  if (isNondhStatusPage) {
    return canViewNondhStatus ? (
      <NondhStatusList />
    ) : (
      <Navigate to={`/app/excel-sheets/${OFFICE_REPORTS_KEY}`} replace />
    );
  }

  return canViewOfficeReports ? (
    <OfficeLedgerPage />
  ) : canViewVerabill ? (
    <Navigate to={`/app/excel-sheets/${VERABILL_KEY}`} replace />
  ) : (
    <Navigate to={`/app/excel-sheets/${NONDH_STATUS_KEY}`} replace />
  );
}

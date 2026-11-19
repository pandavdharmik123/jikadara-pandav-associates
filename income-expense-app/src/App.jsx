import { lazy, Suspense, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import LedgerGate from './components/LedgerGate';
import ToolGate from './components/ToolGate';
import AdvocateGate from './components/AdvocateGate';
import LoginPage from './features/Auth/LoginPage';
import HomePage from './features/Home/HomePage';
import TransactionsPage from './features/Transactions/TransactionsPage';
import AddTransactionPage from './features/Transactions/AddTransactionPage';
import EditTransactionPage from './features/Transactions/EditTransactionPage';
import ProfilePage from './features/Profile/ProfilePage';
import ToolsPage from './features/Tools/ToolsPage';
import ToolPageFrame from './features/Tools/ToolPageFrame';
import { TOOL_BY_KEY } from './features/Tools/toolsCatalog';
import useAuthStore from './store/authStore';
import { canUseOfficeLedger, hasAnyToolAccess } from './lib/permissions';
import { PageSkeleton } from './components/skeletons';

// Tools pull in heavy PDF/OCR libraries. Loading them on demand keeps the
// ledger screens (and the native app's first paint) small and fast.
const Translator = lazy(() => import('./features/Translator/Translator'));
const AITranslator = lazy(() => import('./features/AITranslator/AITranslator'));
const UniversalConverter = lazy(() => import('./features/UniversalConverter/UniversalConverter'));
const JantriCalculator = lazy(() => import('./features/JantriCalculator/JantriCalculator'));
const MortgageStampDutyCalculator = lazy(() => import('./features/MortgageStampDuty/MortgageStampDutyCalculator'));
const RentAgreementCalculator = lazy(() => import('./features/RentAgreementCalculator/RentAgreementCalculator'));
const InvoiceGenerator = lazy(() => import('./features/InvoiceGenerator/InvoiceGenerator'));
const NumberToWordsConverter = lazy(() => import('./features/NumberToWordsConverter/NumberToWordsConverter'));
const DocumentAI = lazy(() => import('./features/DocumentAI/DocumentAI'));
const PedhinamuBuilder = lazy(() => import('./features/PedhinamuBuilder/PedhinamuBuilder'));
const FormBuilderPage = lazy(() => import('./features/FormBuilder/FormBuilderPage'));

// Advocate Management (ported from the website, mobile-adapted)
const AdvocateHub = lazy(() => import('./features/Advocate/AdvocateHub'));
const DashboardPage = lazy(() => import('./features/Dashboard/Dashboard'));
const ClientRoutes = lazy(() => import('./features/Clients/index.jsx'));
const TaskRoutes = lazy(() => import('./features/Tasks/index.jsx'));
const ExpenseReportPage = lazy(() => import('./features/Reports/ExpenseReport'));
const UpadListPage = lazy(() => import('./features/Upad/UpadList'));
const RecycleBinPage = lazy(() => import('./features/RecycleBin/RecycleBin'));
const AdminUsersPage = lazy(() => import('./features/Admin/AdminUsers'));
const BackupManagerPage = lazy(() => import('./features/Admin/BackupManager'));
const DocumentTypesAdminPage = lazy(() => import('./features/Admin/DocumentTypesAdmin'));
const ExcelSheetsPage = lazy(() => import('./features/ExcelSheets/ExcelSheetsPage'));

const ACCENT = '#6366f1';

const FORM_BUILDER_TOOL = {
  key: '/app/tools/form-builder',
  permissionKey: '/app/tools/form-builder',
  label: 'Form Builder',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The two apps share one ledger, so always revalidate when a screen is
      // opened or the browser tab becomes active again.
      staleTime: 0,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function ToolLoading() {
  return (
    <div style={{ padding: '16px 12px', width: '100%', boxSizing: 'border-box' }}>
      <PageSkeleton stats={2} tableRows={5} />
    </div>
  );
}

function DefaultRedirect() {
  const user = useAuthStore((state) => state.user);

  // Tools-only users should not be stranded on the ledger's access message.
  if (!canUseOfficeLedger(user) && hasAnyToolAccess(user)) {
    return <Navigate to="/app/tools" replace />;
  }

  return <Navigate to="/" replace />;
}

function toolPage(toolKey, element) {
  const tool = TOOL_BY_KEY[toolKey];

  return (
    <Route element={<ToolGate tool={tool} />}>
      <Route
        path={toolKey.replace(/^\//, '')}
        element={
          <ToolPageFrame title={tool.label} subtitle={tool.description}>
            <Suspense fallback={<ToolLoading />}>{element}</Suspense>
          </ToolPageFrame>
        }
      />
    </Route>
  );
}

function advocatePage({ path, pageKey, adminOnly = false, title, element }) {
  return (
    <Route
      path={path}
      element={
        <AdvocateGate pageKey={pageKey} adminOnly={adminOnly} title={title}>
          <Suspense fallback={<ToolLoading />}>{element}</Suspense>
        </AdvocateGate>
      }
    />
  );
}

export default function App() {
  useEffect(() => {
    // In a browser, refetchOnWindowFocus covers "tab became active again".
    // Native WebViews do not emit that reliably, so refresh the shared ledger
    // whenever the app returns to the foreground.
    if (!Capacitor.isNativePlatform()) return undefined;

    let cancelled = false;
    let listener = null;

    NativeApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) queryClient.invalidateQueries();
    }).then((handle) => {
      if (cancelled) handle.remove();
      else listener = handle;
    });

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#6366f1',
            colorInfo: '#6366f1',
            colorSuccess: '#059669',
            colorError: '#dc2626',
            colorText: '#0f172a',
            colorTextSecondary: '#64748b',
            colorBorder: '#e2e8f0',
            colorBgLayout: '#f4f6fb',
            borderRadius: 12,
            fontFamily: '"Inter", "Noto Sans Gujarati", system-ui, sans-serif',
            fontSize: 13,
          },
          components: {
            Button: {
              fontWeight: 700,
            },
            Segmented: {
              itemSelectedBg: '#6366f1',
              itemSelectedColor: '#ffffff',
            },
          },
        }}
      >
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route element={<LedgerGate />}>
                  <Route index element={<HomePage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="transactions/:id/edit" element={<EditTransactionPage />} />
                  <Route path="add" element={<AddTransactionPage />} />
                </Route>

                <Route path="profile" element={<ProfilePage />} />

                {/* Advocate Management — mobile office hub and modules */}
                <Route
                  path="app/advocate"
                  element={
                    <Suspense fallback={<ToolLoading />}>
                      <AdvocateHub />
                    </Suspense>
                  }
                />
                {advocatePage({
                  path: 'app/dashboard',
                  pageKey: '/app/dashboard',
                  title: 'Dashboard',
                  element: <DashboardPage />,
                })}
                {advocatePage({
                  path: 'app/clients/*',
                  pageKey: '/app/clients',
                  title: 'Clients',
                  element: <ClientRoutes />,
                })}
                {advocatePage({
                  path: 'app/tasks/*',
                  pageKey: '/app/tasks',
                  title: 'Tasks',
                  element: <TaskRoutes />,
                })}
                {advocatePage({
                  path: 'app/reports',
                  pageKey: '/app/reports',
                  title: 'Reports',
                  element: <ExpenseReportPage />,
                })}
                {advocatePage({
                  path: 'app/upad',
                  pageKey: '/app/upad',
                  title: 'Upad List',
                  element: <UpadListPage />,
                })}
                {advocatePage({
                  path: 'app/recycle-bin',
                  pageKey: '/app/recycle-bin',
                  title: 'Recycle Bin',
                  element: <RecycleBinPage />,
                })}
                {advocatePage({
                  path: 'app/admin/document-types',
                  pageKey: '/app/admin/document-types',
                  title: 'Document Types',
                  element: <DocumentTypesAdminPage />,
                })}
                {advocatePage({
                  path: 'app/admin/users',
                  adminOnly: true,
                  title: 'Admin Panel',
                  element: <AdminUsersPage />,
                })}
                {advocatePage({
                  path: 'app/admin/backup',
                  adminOnly: true,
                  title: 'Database Backups',
                  element: <BackupManagerPage />,
                })}

                {/* Excel-sheet registers, each with its own page permission */}
                <Route path="app/excel-sheets">
                  <Route index element={<Navigate to="/app/excel-sheets/office-reports" replace />} />
                </Route>
                {advocatePage({
                  path: 'app/excel-sheets/office-reports',
                  pageKey: '/app/office-expenses',
                  title: 'Office Reports',
                  element: <ExcelSheetsPage />,
                })}
                {advocatePage({
                  path: 'app/excel-sheets/nondh-status',
                  pageKey: '/app/nondh-status',
                  title: 'Nondh Status',
                  element: <ExcelSheetsPage />,
                })}
                {advocatePage({
                  path: 'app/excel-sheets/notary-hisab',
                  pageKey: '/app/notary-hisab',
                  title: 'Notary Hisab',
                  element: <ExcelSheetsPage />,
                })}
                {advocatePage({
                  path: 'app/excel-sheets/verabill',
                  pageKey: '/app/verabill',
                  title: 'Verabill / Light Bill',
                  element: <ExcelSheetsPage />,
                })}
                <Route path="app/office-expenses" element={<Navigate to="/app/excel-sheets/office-reports" replace />} />
                <Route path="app/nondh-status" element={<Navigate to="/app/excel-sheets/nondh-status" replace />} />
                <Route path="app/notary-hisab" element={<Navigate to="/app/excel-sheets/notary-hisab" replace />} />
                <Route path="app/verabill" element={<Navigate to="/app/excel-sheets/verabill" replace />} />

                <Route path="app/tools" element={<ToolsPage />} />

                {toolPage(
                  '/app/tools/translator',
                  <Translator themeMode="light" currentAccentColor={ACCENT} />
                )}
                {toolPage(
                  '/app/tools/ai-translator',
                  <AITranslator currentAccentColor={ACCENT} />
                )}
                {toolPage(
                  '/app/tools/universal',
                  <UniversalConverter themeMode="light" currentAccentColor={ACCENT} />
                )}
                {toolPage(
                  '/app/tools/jantri',
                  <JantriCalculator currentAccentColor={ACCENT} />
                )}
                {toolPage(
                  '/app/tools/mortgage_stamp_duty',
                  <MortgageStampDutyCalculator currentAccentColor={ACCENT} />
                )}
                {toolPage(
                  '/app/tools/rent_agreement',
                  <RentAgreementCalculator themeMode="light" currentAccentColor={ACCENT} />
                )}
                {toolPage(
                  '/app/tools/invoice',
                  <InvoiceGenerator currentAccentColor={ACCENT} />
                )}
                {toolPage(
                  '/app/tools/number_to_words',
                  <NumberToWordsConverter currentAccentColor={ACCENT} />
                )}
                {toolPage(
                  '/app/tools/document-ai',
                  <DocumentAI />
                )}
                {toolPage(
                  '/app/tools/pedhinamu',
                  <PedhinamuBuilder currentAccentColor={ACCENT} />
                )}

                <Route
                  path="app/tools/form-builder"
                  element={<Navigate to="/app/tools/form-builder/pan-new-application" replace />}
                />
                <Route element={<ToolGate tool={FORM_BUILDER_TOOL} />}>
                  <Route
                    path="app/tools/form-builder/:formKey"
                    element={
                      <ToolPageFrame
                        title={FORM_BUILDER_TOOL.label}
                        subtitle="PAN, marriage registration and property tax forms"
                      >
                        <Suspense fallback={<ToolLoading />}>
                          <FormBuilderPage />
                        </Suspense>
                      </ToolPageFrame>
                    }
                  />
                </Route>

                {/* Website alias kept working for saved links/deep links. */}
                <Route path="pedhinamu/create" element={<Navigate to="/app/tools/pedhinamu" replace />} />

                <Route path="*" element={<DefaultRedirect />} />
              </Route>
            </Route>
          </Routes>
        </HashRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

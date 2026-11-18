import { lazy, Suspense, useEffect } from 'react';
import { ConfigProvider, Spin } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import LedgerGate from './components/LedgerGate';
import ToolGate from './components/ToolGate';
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
    <div style={{ display: 'grid', placeItems: 'center', gap: 10, padding: '56px 0' }}>
      <Spin size="large" />
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Loading tool…</span>
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

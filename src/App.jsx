import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import { COLOR_PALETTES } from './utils/constants';

// Layouts and Auth
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './features/Auth/LoginPage';
import ForgotPasswordPage from './features/Auth/ForgotPasswordPage';

import Dashboard from './features/Dashboard/Dashboard';
import ClientRoutes from './features/Clients';
import TaskRoutes from './features/Tasks';
import ExpenseReport from './features/Reports/ExpenseReport';
import AdminUsers from './features/Admin/AdminUsers';
import DocumentTypesAdmin from './features/Admin/DocumentTypesAdmin';
import UserProfile from './features/Profile/UserProfile';

// Existing Tools
import FontStudio from './features/FontStudio/FontStudio';
import Translator from './features/Translator/Translator';
import UniversalConverter from './features/UniversalConverter/UniversalConverter';
import JantriCalculator from './features/JantriCalculator/JantriCalculator';
import RentAgreementCalculator from './features/RentAgreementCalculator/RentAgreementCalculator';
import InvoiceGenerator from './features/InvoiceGenerator/InvoiceGenerator';
import NumberToWordsConverter from './features/NumberToWordsConverter/NumberToWordsConverter';
import DocumentAI from './features/DocumentAI/DocumentAI';

// Styles
import './styles/main.scss';

import useAuthStore from './store/authStore';
import { getInitialUserRoute } from './utils/pagePermissions';

// Intercept fetch calls for AI4Bharat API (same as before)
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) ? input.url : '';

  if (url && (url.includes('xlit-api.ai4bharat.org') || url.includes('/tl/'))) {
    try {
      const parts = url.split('/');
      const tlIndex = parts.indexOf('tl');
      if (tlIndex !== -1 && parts.length > tlIndex + 2) {
        const lang = parts[tlIndex + 1];
        const word = decodeURIComponent(parts[tlIndex + 2]);

        const googleUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&ime=transliteration_en_${lang}&num=5&cp=0&cs=0&ie=utf-8&oe=utf-8&app=jsapi`;
        const googleResponse = await originalFetch(googleUrl);
        const googleData = await googleResponse.json();

        let suggestions = [];
        if (googleData && googleData[0] === 'SUCCESS' && googleData[1] && googleData[1][0]) {
          suggestions = googleData[1][0][1] || [];
        }

        const mockData = { result: suggestions };
        return new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (err) {
      console.error('Failed to intercept and transliterate via Google API:', err);
    }
  }
  return originalFetch.apply(this, arguments);
};

// Create a client
const queryClient = new QueryClient();

function AppIndexRedirect() {
  const { user } = useAuthStore();
  const target = getInitialUserRoute(user);
  return <Navigate to={target} replace />;
}

export default function App() {
  // Global State
  const themeMode = 'light'; // Kept light as default per original
  const [activeColor, setActiveColor] = useState(() => localStorage.getItem('font-conv-accent') || 'indigo');
  const [studioText, setStudioText] = useState('');

  const currentAccentColor = COLOR_PALETTES[activeColor]?.primary || '#6366f1';
  const { defaultAlgorithm, darkAlgorithm } = theme;

  useEffect(() => {
    document.body.className = 'light-theme';
    document.documentElement.style.setProperty('--accent-color', currentAccentColor);
    localStorage.setItem('font-conv-accent', activeColor);
  }, [activeColor, currentAccentColor]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: themeMode === 'dark' ? darkAlgorithm : defaultAlgorithm,
          token: {
            colorPrimary: currentAccentColor,
            fontFamily: '"Inter", "Anek Gujarati", system-ui, sans-serif',
            colorBgContainer: themeMode === 'dark' ? '#141414' : '#ffffff',
            colorBgElevated: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
            borderRadius: 8,
            boxShadowSecondary: themeMode === 'dark'
              ? '0 6px 16px 0 rgba(0, 0, 0, 0.4), 0 3px 6px -4px rgba(0, 0, 0, 0.2), 0 9px 28px 8px rgba(0, 0, 0, 0.3)'
              : '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
          },
          components: {
            Layout: {
              headerBg: themeMode === 'dark' ? '#0d1117' : '#ffffff',
              bodyBg: themeMode === 'dark' ? '#000000' : '#f8fafc',
              siderBg: themeMode === 'dark' ? '#0d1117' : '#f8fafc',
            },
            Card: {
              headerBg: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
            }
          }
        }}
      >
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<MainLayout themeMode={themeMode} currentAccentColor={currentAccentColor} />}>
                {/* Redirect /app to role/user specific initial route */}
                <Route index element={<AppIndexRedirect />} />
                
                {/* Advocate Modules with Page Access Checks */}
                <Route element={<ProtectedRoute pageKey="/app/dashboard" />}>
                  <Route path="dashboard" element={<Dashboard />} />
                </Route>

                <Route element={<ProtectedRoute pageKey="/app/clients" />}>
                  <Route path="clients/*" element={<ClientRoutes />} />
                </Route>

                <Route element={<ProtectedRoute pageKey="/app/tasks" />}>
                  <Route path="tasks/*" element={<TaskRoutes />} />
                </Route>

                <Route element={<ProtectedRoute pageKey="/app/reports" />}>
                  <Route path="reports" element={<ExpenseReport />} />
                </Route>

                <Route path="profile" element={<UserProfile />} />
                
                {/* Admin Only Route */}
                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route path="admin/users" element={<AdminUsers />} />
                </Route>

                {/* Document Types Route */}
                <Route element={<ProtectedRoute pageKey="/app/admin/document-types" />}>
                  <Route path="admin/document-types" element={<DocumentTypesAdmin />} />
                </Route>

                {/* Tools with Individual Page Checks */}
                <Route path="tools">
                  <Route element={<ProtectedRoute pageKey="/app/tools/studio" />}>
                    <Route path="studio" element={
                      <FontStudio
                        themeMode={themeMode}
                        currentAccentColor={currentAccentColor}
                        activeColor={activeColor}
                        setActiveColor={setActiveColor}
                        text={studioText}
                        setText={setStudioText}
                      />
                    } />
                  </Route>

                  <Route element={<ProtectedRoute pageKey="/app/tools/translator" />}>
                    <Route path="translator" element={<Translator themeMode={themeMode} currentAccentColor={currentAccentColor} />} />
                  </Route>

                  <Route element={<ProtectedRoute pageKey="/app/tools/universal" />}>
                    <Route path="universal" element={<UniversalConverter themeMode={themeMode} currentAccentColor={currentAccentColor} />} />
                  </Route>

                  <Route element={<ProtectedRoute pageKey="/app/tools/jantri" />}>
                    <Route path="jantri" element={<JantriCalculator themeMode={themeMode} currentAccentColor={currentAccentColor} />} />
                  </Route>

                  <Route element={<ProtectedRoute pageKey="/app/tools/rent_agreement" />}>
                    <Route path="rent_agreement" element={<RentAgreementCalculator themeMode={themeMode} currentAccentColor={currentAccentColor} />} />
                  </Route>

                  <Route element={<ProtectedRoute pageKey="/app/tools/invoice" />}>
                    <Route path="invoice" element={<InvoiceGenerator currentAccentColor={currentAccentColor} />} />
                  </Route>

                  <Route element={<ProtectedRoute pageKey="/app/tools/number_to_words" />}>
                    <Route path="number_to_words" element={<NumberToWordsConverter currentAccentColor={currentAccentColor} />} />
                  </Route>

                  <Route element={<ProtectedRoute pageKey="/app/tools/document-ai" />}>
                    <Route path="document-ai" element={<DocumentAI />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            {/* Default Redirect */}
            <Route path="*" element={<AppIndexRedirect />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

/* App — route definitions with Supabase auth protection */

import React, { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';

/* Auth */
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ConfirmProvider } from './components/DeleteConfirmationModal.jsx';
import ErrorPage from './pages/ErrorPage.jsx';

/* Pages */
import { SignIn, SignUp, Forgot, CheckEmail, ResetPassword } from './pages/Auth.jsx';
import Dashboard, { HiFiDashboardEmpty } from './pages/Dashboard.jsx';
import DataSources, { DataSourceUpload } from './pages/DataSources.jsx';
import Settings from './pages/Settings.jsx';
import { NotFound, ServerError, Forbidden, Offline } from './pages/Errors.jsx';

/* Migrated High-Fidelity Pages */
import HiFiLoading, { LoadingScreen } from './pages/Loading.jsx';
import {
  HiFiOnbWelcome,
  HiFiOnbCompany,
  HiFiOnbBrand,
  HiFiOnbTemplate,
  HiFiOnbImport,
  HiFiOnbInvite,
  HiFiOnbReady
} from './pages/Onboarding.jsx';
import {
  HiFiTplUpload,
  HiFiTplSettings,
  HiFiTplGen1,
  HiFiTplGen2,
  HiFiTplGen3,
  HiFiTplGen4,
  HiFiTplPreview
} from './pages/TemplateGen.jsx';
import {
  HiFiGenSelect,
  HiFiGenMapping,
  HiFiGenRun
} from './pages/Generate.jsx';
import Templates from './pages/Templates.jsx';
import { HiFiLedger, HiFiLedgerEmpty } from './pages/Ledger.jsx';
import HiFiPreviewTicket from './pages/PreviewTicket.jsx';

const RootLayout = () => (
  <>
    <Outlet />
  </>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      /* Splash Loading (public) */
      { path: '/loading', element: <HiFiLoading /> },

      /* Auth (public — no login required) */
      { path: '/signin', element: <SignIn /> },
      { path: '/signup', element: <SignUp /> },
      { path: '/forgot', element: <Forgot /> },
      { path: '/check-email', element: <CheckEmail /> },
      { path: '/reset', element: <ResetPassword /> },

      /* ── Protected routes — require authentication ────────── */
      {
        element: <ProtectedRoute />,
        children: [
          /* Onboarding */
          { path: '/onboarding/welcome', element: <HiFiOnbWelcome /> },
          { path: '/onboarding/business', element: <HiFiOnbCompany /> },
          { path: '/onboarding/brand', element: <HiFiOnbBrand /> },
          { path: '/onboarding/template', element: <HiFiOnbTemplate /> },
          { path: '/onboarding/import', element: <HiFiOnbImport /> },
          { path: '/onboarding/invite', element: <HiFiOnbInvite /> },
          { path: '/onboarding/ready', element: <HiFiOnbReady /> },

          /* Core pipeline — 6 pages */
          { path: '/', element: <Dashboard /> },
          { path: '/empty', element: <HiFiDashboardEmpty /> },
          { path: '/data-sources', element: <DataSources /> },
          { path: '/data-sources/upload', element: <DataSourceUpload /> },
          { path: '/templates', element: <Templates /> },
          { path: '/preview/ticket', element: <HiFiPreviewTicket /> },
          { path: '/ledger', element: <HiFiLedger /> },
          { path: '/ledger/empty', element: <HiFiLedgerEmpty /> },
          { path: '/settings', element: <Settings /> },

          /* Generate invoice flow */
          { path: '/generate', element: <HiFiGenSelect /> },
          { path: '/generate/mapping', element: <HiFiGenMapping /> },
          { path: '/generate/run', element: <HiFiGenRun /> },

          /* Custom template generation */
          { path: '/template-gen/upload', element: <HiFiTplUpload /> },
          { path: '/template-gen/settings', element: <HiFiTplSettings /> },
          { path: '/template-gen/reading', element: <HiFiTplGen1 /> },
          { path: '/template-gen/mapping', element: <HiFiTplGen2 /> },
          { path: '/template-gen/overlaps', element: <HiFiTplGen3 /> },
          { path: '/template-gen/composing', element: <HiFiTplGen4 /> },
          { path: '/template-gen/review', element: <HiFiTplPreview /> },
        ]
      },

      /* Errors (public) */
      { path: '/error', element: <ErrorPage /> },
      { path: '/404', element: <NotFound /> },
      { path: '/500', element: <ServerError /> },
      { path: '/403', element: <Forbidden /> },
      { path: '/offline', element: <Offline /> },

      /* Catch-all → unified error page (404) */
      { path: '*', element: <ErrorPage /> },
    ]
  }
]);

export default function App() {
  /* Show the splash for at least 2s on every app start, then mount the router. */
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConfirmProvider>
          {booting ? <LoadingScreen /> : <RouterProvider router={router} />}
        </ConfirmProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

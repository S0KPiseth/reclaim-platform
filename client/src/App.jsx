import AppShell from "./components/layout/AppShell";
import RequireAuth from "./components/layout/RequireAuth";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { ToastProvider } from "./context/ToastContext";
import { RouterProvider, useLocation } from "./lib/router";
import BrowsePage from "./pages/BrowsePage";
import HomePage from "./pages/HomePage";
import HowItWorksPage from "./pages/HowItWorksPage";
import ItemPage from "./pages/ItemPage";
import LoginPage from "./pages/LoginPage";
import MyClaimsPage from "./pages/MyClaimsPage";
import MyItemsPage from "./pages/MyItemsPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import ReportPage from "./pages/ReportPage";

function Routes() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/") return <HomePage />;
  if (path === "/browse") return <BrowsePage />;
  if (path === "/how-it-works") return <HowItWorksPage />;
  if (path === "/login") return <LoginPage />;
  if (path === "/register") return <RegisterPage />;

  if (path === "/report") {
    return (
      <RequireAuth>
        <ReportPage />
      </RequireAuth>
    );
  }

  if (path === "/my-items") {
    return (
      <RequireAuth>
        <MyItemsPage />
      </RequireAuth>
    );
  }

  if (path === "/my-claims") {
    return (
      <RequireAuth>
        <MyClaimsPage />
      </RequireAuth>
    );
  }

  if (path === "/profile") {
    return (
      <RequireAuth>
        <ProfilePage />
      </RequireAuth>
    );
  }

  if (/^\/items\/[^/]+\/edit$/.test(path)) {
    return (
      <RequireAuth>
        <ReportPage key={path} />
      </RequireAuth>
    );
  }

  if (/^\/items\/[^/]+$/.test(path)) return <ItemPage key={path} />;

  return <NotFoundPage />;
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppShell>
              <Routes />
            </AppShell>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

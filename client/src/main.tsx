import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Switch, Route, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import UsersPage from "@/pages/users-page";
import GroupsPage from "@/pages/groups-page";
import OUsPage from "@/pages/ous-page";
import ComputersPage from "@/pages/computers-page";
import DomainsPage from "@/pages/domains-page";
import ApiTokensPage from "@/pages/api-tokens-page";
import LdapConnectionsPage from "@/pages/ldap-connections-page";
import LdapQueryBuilderPage from "@/pages/ldap-query-builder-page";
import SettingsPage from "@/pages/settings-page";
import UserManagementPage from "@/pages/user-management-page";
import AuditLogsPage from "@/pages/audit-logs-page";
import "./index.css";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { queryClient } from "./lib/queryClient";

// Create the App and use context appropriately
function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="ad-management-theme">
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
      <Toaster />
    </>
  );
}

// Protected route component that uses the useAuth hook
function ProtectedRoute({ 
  path, 
  component: Component 
}: { 
  path: string; 
  component: () => React.JSX.Element; 
}) {
  const { user } = useAuth();
  
  return (
    <Route path={path}>
      {user ? <Component /> : <Redirect to="/auth" />}
    </Route>
  );
}

// App content with routes that can safely use the useAuth hook
function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth">
        <AuthPage />
      </Route>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/groups" component={GroupsPage} />
      <ProtectedRoute path="/organizational-units" component={OUsPage} />
      <ProtectedRoute path="/computers" component={ComputersPage} />
      <ProtectedRoute path="/domains" component={DomainsPage} />
      <ProtectedRoute path="/api-tokens" component={ApiTokensPage} />
      <ProtectedRoute path="/ldap-connections" component={LdapConnectionsPage} />
      <ProtectedRoute path="/ldap-query-builder" component={LdapQueryBuilderPage} />
      <ProtectedRoute path="/audit-logs" component={AuditLogsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/user-management" component={UserManagementPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Render the app
createRoot(document.getElementById("root")!).render(<App />);

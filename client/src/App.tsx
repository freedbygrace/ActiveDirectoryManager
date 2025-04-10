import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Switch, Route, Redirect } from "wouter";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { queryClient } from "./lib/queryClient";
import ProtectedRoute from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import MainDashboardPage from "@/pages/main-dashboard-page";
import CustomDashboardsPage from "@/pages/custom-dashboards-page";
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
import SitesPage from "@/pages/sites-page";
import DynamicGroupsPage from "@/pages/dynamic-groups-page";

export default function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="ad-management-theme">
          <AuthProvider>
            <Switch>
              <Route path="/auth">
                <AuthPage />
              </Route>
              <ProtectedRoute path="/" component={MainDashboardPage} />
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
              <ProtectedRoute path="/sites" component={SitesPage} />
              <ProtectedRoute path="/dynamic-groups" component={DynamicGroupsPage} />
              <ProtectedRoute path="/reporting/dashboards" component={CustomDashboardsPage} />
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
      <Toaster />
    </>
  );
}

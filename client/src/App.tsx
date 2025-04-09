import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
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
import { ProtectedRoute } from "./lib/protected-route";
import { Loader2 } from "lucide-react";

function Router() {
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

function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;

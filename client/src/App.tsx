import { Switch, Route } from "wouter";
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
import SettingsPage from "@/pages/settings-page";
import UserManagementPage from "@/pages/user-management-page";
import { ProtectedRoute } from "./lib/protected-route";

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

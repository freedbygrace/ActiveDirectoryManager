import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Moon, Sun, Laptop } from "lucide-react";

// Safe theme selector that doesn't throw errors if ThemeProvider is missing
function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    // Read from localStorage or default to system
    return localStorage.getItem("ad-management-theme") || "system";
  });
  
  const handleThemeChange = (value: string) => {
    setCurrentTheme(value);
    
    try {
      // Handle theme change manually if context is missing
      localStorage.setItem("ad-management-theme", value);
      
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      
      if (value === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(value);
      }
    } catch (error) {
      console.error("Error changing theme:", error);
    }
  };
  
  return (
    <RadioGroup value={currentTheme} onValueChange={handleThemeChange}>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="light" id="light-theme" />
        <Label htmlFor="light-theme" className="flex items-center">
          <Sun className="mr-2 h-4 w-4" />
          Light
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="dark" id="dark-theme" />
        <Label htmlFor="dark-theme" className="flex items-center">
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="system" id="system-theme" />
        <Label htmlFor="system-theme" className="flex items-center">
          <Laptop className="mr-2 h-4 w-4" />
          System
        </Label>
      </div>
    </RadioGroup>
  );
}

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" description="Configure your AD Management API application">
      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general application settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input id="app-name" defaultValue="Active Directory Management API" />
                </div>
                
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <ThemeSelector />
                </div>
                
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select defaultValue="mdy">
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY/MM/DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Help Tips</Label>
                    <div className="text-sm text-muted-foreground">
                      Show contextual help and tooltips throughout the application
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="security">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security related settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input id="session-timeout" type="number" defaultValue="30" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <div className="text-sm text-muted-foreground">
                      Require two-factor authentication for all users
                    </div>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>HTTPS Only</Label>
                    <div className="text-sm text-muted-foreground">
                      Enforce HTTPS for all connections
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="space-y-2">
                  <Label>Password Policy</Label>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="min-length" className="text-sm font-normal">Minimum Length</Label>
                      <Input id="min-length" type="number" defaultValue="8" className="w-20" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="require-uppercase" className="text-sm font-normal">Require Uppercase</Label>
                      <Switch id="require-uppercase" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="require-numbers" className="text-sm font-normal">Require Numbers</Label>
                      <Switch id="require-numbers" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="require-symbols" className="text-sm font-normal">Require Symbols</Label>
                      <Switch id="require-symbols" defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="api">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Settings</CardTitle>
                <CardDescription>
                  Configure API related settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="rate-limit">Rate Limit (requests per minute)</Label>
                  <Input id="rate-limit" type="number" defaultValue="100" />
                </div>
                
                <div className="space-y-2">
                  <Label>Default Token Expiration</Label>
                  <Select defaultValue="30">
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable API Documentation</Label>
                    <div className="text-sm text-muted-foreground">
                      Make Swagger documentation publicly accessible
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>CORS</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable Cross-Origin Resource Sharing
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="allowed-origins">Allowed Origins</Label>
                  <Input id="allowed-origins" defaultValue="*" />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of allowed origins, or * for all origins
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="authentication">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Methods</CardTitle>
                <CardDescription>
                  Configure login methods for your application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Local Authentication</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable username and password login
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow User Registration</Label>
                    <div className="text-sm text-muted-foreground">
                      Allow new users to register accounts
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">LDAP Authentication</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable LDAP Login</Label>
                      <div className="text-sm text-muted-foreground">
                        Allow users to login via LDAP
                      </div>
                    </div>
                    <Switch id="enable-ldap" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ldap-connection-name">Connection Display Name</Label>
                    <Input id="ldap-connection-name" placeholder="LDAP Authentication" />
                    <p className="text-xs text-muted-foreground">
                      Name shown to users on the login screen
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ldap-url">LDAP Server URL</Label>
                    <Input id="ldap-url" placeholder="ldap://ldap.example.com:389" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ldap-bind-dn">Bind DN</Label>
                    <Input id="ldap-bind-dn" placeholder="cn=admin,dc=example,dc=com" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ldap-bind-password">Bind Password</Label>
                    <Input id="ldap-bind-password" type="password" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ldap-search-base">Search Base</Label>
                    <Input id="ldap-search-base" placeholder="ou=users,dc=example,dc=com" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ldap-search-filter">Search Filter</Label>
                    <Input id="ldap-search-filter" placeholder="(uid=&#123;&#123;username&#125;&#125;)" />
                    <p className="text-xs text-muted-foreground">
                      Use &#123;&#123;username&#125;&#125; as a placeholder for the user's input
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>TLS/SSL</Label>
                      <div className="text-sm text-muted-foreground">
                        Require secure connection
                      </div>
                    </div>
                    <Switch id="ldap-tls" defaultChecked />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">OpenID Connect Authentication</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable OIDC Login</Label>
                      <div className="text-sm text-muted-foreground">
                        Allow users to login via OpenID Connect
                      </div>
                    </div>
                    <Switch id="enable-oidc" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oidc-provider-name">Provider Display Name</Label>
                    <Input id="oidc-provider-name" placeholder="Single Sign-On" />
                    <p className="text-xs text-muted-foreground">
                      Name shown to users on the login screen
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oidc-issuer">Issuer</Label>
                    <Input id="oidc-issuer" placeholder="https://accounts.google.com" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oidc-auth-url">Authorization URL</Label>
                    <Input id="oidc-auth-url" placeholder="https://accounts.google.com/o/oauth2/v2/auth" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oidc-token-url">Token URL</Label>
                    <Input id="oidc-token-url" placeholder="https://oauth2.googleapis.com/token" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oidc-userinfo-url">UserInfo URL</Label>
                    <Input id="oidc-userinfo-url" placeholder="https://openidconnect.googleapis.com/v1/userinfo" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oidc-client-id">Client ID</Label>
                    <Input id="oidc-client-id" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oidc-client-secret">Client Secret</Label>
                    <Input id="oidc-client-secret" type="password" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oidc-callback-url">Callback URL</Label>
                    <Input id="oidc-callback-url" placeholder="http://localhost:3000/api/auth/oidc/callback" />
                    <p className="text-xs text-muted-foreground">
                      Must match the redirect URI configured with your OIDC provider
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Requested Scopes</Label>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="scope-openid" defaultChecked disabled />
                        <Label htmlFor="scope-openid" className="text-sm font-normal">openid</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="scope-profile" defaultChecked />
                        <Label htmlFor="scope-profile" className="text-sm font-normal">profile</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="scope-email" defaultChecked />
                        <Label htmlFor="scope-email" className="text-sm font-normal">email</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="notifications">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how notifications are handled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <div className="text-sm text-muted-foreground">
                      Send notifications via email
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input id="email-address" type="email" defaultValue="admin@example.com" />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Notification Types</h3>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-login" className="text-sm font-normal">Login Attempts</Label>
                    <Switch id="notify-login" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-api-token" className="text-sm font-normal">API Token Creation/Deletion</Label>
                    <Switch id="notify-api-token" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-ldap" className="text-sm font-normal">LDAP Connection Changes</Label>
                    <Switch id="notify-ldap" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-user" className="text-sm font-normal">User Management</Label>
                    <Switch id="notify-user" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 flex justify-end">
        <Button variant="outline" className="mr-2">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    </DashboardLayout>
  );
}

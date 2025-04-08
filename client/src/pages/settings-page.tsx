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

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings" description="Configure your AD Management API application">
      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
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
                  <RadioGroup defaultValue="light">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="light" />
                      <Label htmlFor="light">Light</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dark" id="dark" />
                      <Label htmlFor="dark">Dark</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="system" id="system" />
                      <Label htmlFor="system">System</Label>
                    </div>
                  </RadioGroup>
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

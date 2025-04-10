import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout, DashboardConfig } from "@/components/dashboard/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Dashboard creation form schema
const dashboardSchema = z.object({
  name: z.string().min(1, "Dashboard name is required"),
});

type DashboardFormValues = z.infer<typeof dashboardSchema>;

export default function DashboardPage() {
  const { toast } = useToast();
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string>("dashboard-overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dataSourcesLoading, setDataSourcesLoading] = useState(true);
  const [dataSources, setDataSources] = useState<Array<{
    id: string;
    name: string;
    data: any[];
    fields: Array<{ name: string; type: string }>;
  }>>([]);

  // Form for creating a new dashboard
  const form = useForm<DashboardFormValues>({
    resolver: zodResolver(dashboardSchema),
    defaultValues: {
      name: "",
    },
  });

  // Fetch LDAP connections to use as data sources
  const { data: connections = [], isLoading: isLoadingConnections } = useQuery<any[]>({
    queryKey: ['/api/ldap-connections'],
  });

  // Get users as a data source
  const { data: usersData, isLoading: isLoadingUsers } = useQuery<any>({
    queryKey: ['/api/user-dashboard-data'],
    queryFn: async () => {
      const response = await fetch('/api/user-dashboard-data');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      
      // Get the structure of the data to determine field types
      const userData = users.data || [];
      const fields = getFieldTypes(userData);
      
      console.log('User data fields:', fields);
      
      return {
        id: 'users',
        name: 'Active Directory Users',
        data: userData,
        fields,
      };
    },
    enabled: true,
  });

  // Get computers as a data source
  const { data: computersData, isLoading: isLoadingComputers } = useQuery<any>({
    queryKey: ['/api/computer-dashboard-data'],
    queryFn: async () => {
      const response = await fetch('/api/computer-dashboard-data');
      if (!response.ok) throw new Error('Failed to fetch computers');
      const computers = await response.json();
      
      // Get the structure of the data to determine field types
      const computerData = computers.data || [];
      const fields = getFieldTypes(computerData);
      
      console.log('Computer data fields:', fields);
      
      return {
        id: 'computers',
        name: 'Active Directory Computers',
        data: computerData,
        fields,
      };
    },
    enabled: true,
  });

  // Get groups as a data source
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery<any>({
    queryKey: ['/api/group-dashboard-data'],
    queryFn: async () => {
      const response = await fetch('/api/group-dashboard-data');
      if (!response.ok) throw new Error('Failed to fetch groups');
      const groups = await response.json();
      
      // Get the structure of the data to determine field types
      const groupData = groups.data || [];
      const fields = getFieldTypes(groupData);
      
      console.log('Group data fields:', fields);
      
      return {
        id: 'groups',
        name: 'Active Directory Groups',
        data: groupData,
        fields,
      };
    },
    enabled: true,
  });

  // Load saved dashboards from localStorage
  useEffect(() => {
    try {
      const savedDashboards = localStorage.getItem('dashboards');
      if (savedDashboards) {
        setDashboards(JSON.parse(savedDashboards));
        
        // Set the active tab to the first dashboard if it exists
        const parsedDashboards = JSON.parse(savedDashboards) as DashboardConfig[];
        if (parsedDashboards.length > 0) {
          setActiveTab(parsedDashboards[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load dashboards from localStorage', e);
    }
  }, []);

  // Update data sources when API data is loaded
  useEffect(() => {
    if (!isLoadingUsers && !isLoadingComputers && !isLoadingGroups) {
      const sources = [];
      
      if (usersData) sources.push(usersData);
      if (computersData) sources.push(computersData);
      if (groupsData) sources.push(groupsData);
      
      // Add a mock audit logs data source
      sources.push({
        id: 'audit-logs',
        name: 'Audit Logs',
        data: generateMockAuditLogs(),
        fields: [
          { name: 'timestamp', type: 'date' },
          { name: 'action', type: 'string' },
          { name: 'user', type: 'string' },
          { name: 'objectType', type: 'string' },
          { name: 'objectName', type: 'string' },
          { name: 'status', type: 'string' },
          { name: 'details', type: 'string' },
        ],
      });
      
      setDataSources(sources);
      setDataSourcesLoading(false);
    }
  }, [isLoadingUsers, isLoadingComputers, isLoadingGroups, usersData, computersData, groupsData]);

  // Helper function to determine field types from data
  function getFieldTypes(data: any[]): Array<{ name: string; type: string }> {
    if (!data || data.length === 0) return [];
    
    const sample = data[0];
    const fields: Array<{ name: string; type: string }> = [];
    
    Object.keys(sample).forEach(key => {
      let type = 'string';
      const value = sample[key];
      
      if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'integer' : 'float';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (value instanceof Date) {
        type = 'date';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else if (value === null) {
        // Try to infer type from other records
        for (let i = 1; i < Math.min(data.length, 10); i++) {
          const otherValue = data[i][key];
          if (otherValue !== null) {
            if (typeof otherValue === 'number') {
              type = Number.isInteger(otherValue) ? 'integer' : 'float';
            } else if (typeof otherValue === 'boolean') {
              type = 'boolean';
            } else if (otherValue instanceof Date) {
              type = 'date';
            } else if (Array.isArray(otherValue)) {
              type = 'array';
            }
            break;
          }
        }
      }
      
      fields.push({ name: key, type });
    });
    
    return fields;
  }

  // Mock function to generate audit logs for the dashboard demo
  function generateMockAuditLogs() {
    const actions = ['create', 'update', 'delete', 'move', 'enable', 'disable'];
    const objectTypes = ['user', 'computer', 'group', 'organizationalUnit'];
    const statuses = ['success', 'failure'];
    const users = ['admin', 'system', 'operator1', 'operator2'];
    
    const logs = [];
    const now = new Date();
    
    // Generate 100 mock logs
    for (let i = 0; i < 100; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const objectType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      
      // Create a random date within the last 30 days
      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      logs.push({
        timestamp: date.toISOString(),
        action,
        user,
        objectType,
        objectName: `${objectType}-${Math.floor(Math.random() * 1000)}`,
        status,
        details: `${action} operation on ${objectType} by ${user} ${status === 'success' ? 'completed successfully' : 'failed'}`,
      });
    }
    
    // Sort by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return logs;
  }

  // Save dashboard to localStorage
  const saveDashboards = (updatedDashboards: DashboardConfig[]) => {
    localStorage.setItem('dashboards', JSON.stringify(updatedDashboards));
    setDashboards(updatedDashboards);
  };

  // Create a new dashboard
  const handleCreateDashboard = (values: DashboardFormValues) => {
    const newDashboard: DashboardConfig = {
      id: `dashboard-${Date.now().toString(36)}`,
      name: values.name,
      layouts: {
        lg: [],
        md: [],
        sm: [],
        xs: [],
        xxs: [],
      },
      widgets: [],
    };
    
    const updatedDashboards = [...dashboards, newDashboard];
    saveDashboards(updatedDashboards);
    setActiveTab(newDashboard.id);
    setIsCreateDialogOpen(false);
    form.reset();
    
    toast({
      title: "Dashboard Created",
      description: `A new dashboard named "${values.name}" has been created.`,
    });
  };

  // Save dashboard changes
  const handleSaveDashboard = (updatedConfig: DashboardConfig) => {
    const updatedDashboards = dashboards.map(dash => 
      dash.id === updatedConfig.id ? updatedConfig : dash
    );
    saveDashboards(updatedDashboards);
  };

  // Delete a dashboard
  const handleDeleteDashboard = (dashboardId: string) => {
    const updatedDashboards = dashboards.filter(dash => dash.id !== dashboardId);
    saveDashboards(updatedDashboards);
    
    // Set active tab to overview or first dashboard
    if (updatedDashboards.length > 0) {
      setActiveTab(updatedDashboards[0].id);
    } else {
      setActiveTab("dashboard-overview");
    }
    
    toast({
      title: "Dashboard Deleted",
      description: "The dashboard has been deleted.",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboards</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Dashboard
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          {dashboards.map((dashboard) => (
            <TabsTrigger key={dashboard.id} value={dashboard.id}>
              {dashboard.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {dashboards.map((dashboard) => (
          <TabsContent key={dashboard.id} value={dashboard.id}>
            {dataSourcesLoading ? (
              <div className="flex justify-center items-center min-h-[60vh]">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading data sources...</span>
              </div>
            ) : (
              <DashboardLayout
                config={dashboard}
                onSave={handleSaveDashboard}
                dataSources={dataSources}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Create Dashboard Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Dashboard</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateDashboard)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dashboard Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter dashboard name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your dashboard a descriptive name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Dashboard</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
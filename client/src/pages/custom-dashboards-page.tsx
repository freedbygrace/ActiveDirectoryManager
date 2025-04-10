import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { DashboardLayout, DashboardConfig } from "@/components/dashboard/dashboard-layout";
import { ShareDashboardDialog } from "@/components/dashboard/share-dashboard-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Share2, Trash2, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from 'uuid';
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";

// Schema for form validation
const dashboardSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

type DashboardFormValues = z.infer<typeof dashboardSchema>;

export default function CustomDashboardsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string>("dashboard-overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dashboardToDelete, setDashboardToDelete] = useState<string | null>(null);
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

  // Data source queries
  const { data: userData } = useQuery<{ data: any[] }>({
    queryKey: ['/api/user-dashboard-data'],
    enabled: !isLoadingConnections && connections.length > 0,
  });

  const { data: computerData } = useQuery<{ data: any[] }>({
    queryKey: ['/api/computer-dashboard-data'],
    enabled: !isLoadingConnections && connections.length > 0,
  });

  const { data: groupData } = useQuery<{ data: any[] }>({
    queryKey: ['/api/group-dashboard-data'],
    enabled: !isLoadingConnections && connections.length > 0,
  });

  const { data: ouData } = useQuery<{ data: any[] }>({
    queryKey: ['/api/ou-dashboard-data'],
    enabled: !isLoadingConnections && connections.length > 0,
  });

  const { data: domainData } = useQuery<{ data: any[] }>({
    queryKey: ['/api/domain-dashboard-data'],
    enabled: !isLoadingConnections && connections.length > 0,
  });

  const { data: siteData } = useQuery<{ data: any[] }>({
    queryKey: ['/api/site-dashboard-data'],
    enabled: !isLoadingConnections && connections.length > 0,
  });

  const { data: subnetData } = useQuery<{ data: any[] }>({
    queryKey: ['/api/subnet-dashboard-data'],
    enabled: !isLoadingConnections && connections.length > 0,
  });

  // Load saved dashboards
  useEffect(() => {
    const savedDashboards = localStorage.getItem('dashboards');
    if (savedDashboards) {
      try {
        setDashboards(JSON.parse(savedDashboards));
      } catch (error) {
        console.error('Error parsing saved dashboards:', error);
        setDashboards([]);
      }
    }
  }, []);

  // Set initial active tab
  useEffect(() => {
    if (dashboards.length > 0 && activeTab === "dashboard-overview") {
      setActiveTab(dashboards[0].id);
    }
  }, [dashboards, activeTab]);

  // Prepare data sources when data is loaded
  useEffect(() => {
    if (userData || computerData || groupData || ouData || domainData || siteData || subnetData) {
      const sources = [];

      if (userData?.data) {
        sources.push({
          id: 'users',
          name: 'Users',
          data: userData.data,
          fields: getFieldTypes(userData.data),
        });
      }

      if (computerData?.data) {
        sources.push({
          id: 'computers',
          name: 'Computers',
          data: computerData.data,
          fields: getFieldTypes(computerData.data),
        });
      }

      if (groupData?.data) {
        sources.push({
          id: 'groups',
          name: 'Groups',
          data: groupData.data,
          fields: getFieldTypes(groupData.data),
        });
      }

      if (ouData?.data) {
        sources.push({
          id: 'ous',
          name: 'Organizational Units',
          data: ouData.data,
          fields: getFieldTypes(ouData.data),
        });
      }

      if (domainData?.data) {
        sources.push({
          id: 'domains',
          name: 'Domains',
          data: domainData.data,
          fields: getFieldTypes(domainData.data),
        });
      }

      if (siteData?.data) {
        sources.push({
          id: 'sites',
          name: 'Sites',
          data: siteData.data,
          fields: getFieldTypes(siteData.data),
        });
      }

      if (subnetData?.data) {
        sources.push({
          id: 'subnets',
          name: 'Subnets',
          data: subnetData.data,
          fields: getFieldTypes(subnetData.data),
        });
      }

      setDataSources(sources);
      setDataSourcesLoading(false);
    }
  }, [userData, computerData, groupData, ouData, domainData, siteData, subnetData]);

  function getFieldTypes(data: any[]): Array<{ name: string; type: string }> {
    if (!data || data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).map(key => {
      const value = sample[key];
      let type = 'string';
      
      if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (value instanceof Date) {
        type = 'date';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else if (value !== null && typeof value === 'object') {
        type = 'object';
      }
      
      return { name: key, type };
    });
  }

  const handleCreateDashboard = (values: DashboardFormValues) => {
    const newDashboard: DashboardConfig = {
      id: uuidv4(),
      name: values.name,
      layout: { lg: [] },
      widgets: [],
      branding: {
        title: values.name,
        showHeader: true,
        logo: null,
        primaryColor: '#3b82f6',
        secondaryColor: '#f59e0b',
        showFooter: true,
        footerText: `Created by AD Management API - ${new Date().toLocaleDateString()}`
      }
    };
    
    const updatedDashboards = [...dashboards, newDashboard];
    setDashboards(updatedDashboards);
    setActiveTab(newDashboard.id);
    setIsCreateDialogOpen(false);
    form.reset();
    
    // Save to localStorage
    localStorage.setItem('dashboards', JSON.stringify(updatedDashboards));
    
    toast({
      title: "Dashboard Created",
      description: `New dashboard "${values.name}" has been created.`,
    });
  };

  const handleSaveDashboard = (updatedConfig: DashboardConfig) => {
    const updatedDashboards = dashboards.map(dashboard => 
      dashboard.id === updatedConfig.id ? updatedConfig : dashboard
    );
    
    setDashboards(updatedDashboards);
    
    // Save to localStorage
    localStorage.setItem('dashboards', JSON.stringify(updatedDashboards));
    
    toast({
      title: "Dashboard Saved",
      description: "Your changes have been saved.",
    });
  };

  const confirmDelete = (dashboardId: string) => {
    setDashboardToDelete(dashboardId);
    setDeleteDialogOpen(true);
  };

  const executeDelete = () => {
    if (!dashboardToDelete) return;
    
    const updatedDashboards = dashboards.filter(dashboard => dashboard.id !== dashboardToDelete);
    setDashboards(updatedDashboards);
    setDeleteDialogOpen(false);
    
    if (updatedDashboards.length > 0) {
      setActiveTab(updatedDashboards[0].id);
    } else {
      setActiveTab("dashboard-overview");
    }
    
    setDashboardToDelete(null);
    
    // Save to localStorage
    localStorage.setItem('dashboards', JSON.stringify(updatedDashboards));
    
    toast({
      title: "Dashboard Deleted",
      description: "The dashboard has been deleted.",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.history.back()}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Custom Dashboards</h1>
        </div>
        <div className="flex gap-2">
          {dashboards.length > 0 && activeTab !== "dashboard-overview" && (
            <Button 
              variant="outline" 
              onClick={() => confirmDelete(activeTab)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Dashboard
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Dashboard
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          {dashboards.map((dashboard) => (
            <TabsTrigger key={dashboard.id} value={dashboard.id}>
              {dashboard.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {dashboards.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-2">No Dashboards Created</h3>
            <p className="text-muted-foreground mb-6">Create your first dashboard to start visualizing data</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Dashboard
            </Button>
          </div>
        ) : (
          dashboards.map((dashboard) => (
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
          ))
        )}
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

      {/* Delete Dashboard Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the dashboard
              and all its widgets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDashboardToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
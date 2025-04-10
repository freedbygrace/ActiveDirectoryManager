import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { 
  Users,
  Monitor,
  UserPlus,
  Globe,
  Building2,
  Network,
  AlertCircle,
  Activity,
  Loader2
} from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DashboardExport } from "@/components/dashboard/dashboard-export";

interface DashboardSummary {
  userCount: number;
  computerCount: number;
  groupCount: number;
  sitesCount: number;
  domainsCount: number;
  subnetsCount: number;
  message?: string;
}

export default function MainDashboardPage() {
  // Create a ref for the dashboard content
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Fetch summary data
  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ['/api/dashboard-summary'],
    retry: false
  });

  // Fetch Users Data
  const { data: usersData, isLoading: usersLoading } = useQuery<{data: any[]}>({
    queryKey: ['/api/user-dashboard-data'],
    retry: false
  });

  // Fetch Computers Data
  const { data: computersData, isLoading: computersLoading } = useQuery<{data: any[]}>({
    queryKey: ['/api/computer-dashboard-data'],
    retry: false
  });

  // Fetch Groups Data
  const { data: groupsData, isLoading: groupsLoading } = useQuery<{data: any[]}>({
    queryKey: ['/api/group-dashboard-data'],
    retry: false
  });

  const isLoading = summaryLoading || usersLoading || computersLoading || groupsLoading;

  const usersByOU = React.useMemo(() => {
    if (!usersData?.data) return [];
    
    // Group users by organizational unit
    const ouGroups: Record<string, number> = {};
    
    usersData.data.forEach(user => {
      const ou = user.organizationalUnit || 'None';
      ouGroups[ou] = (ouGroups[ou] || 0) + 1;
    });
    
    // Convert to array format for charts
    return Object.entries(ouGroups).map(([name, value]) => ({ name, value }));
  }, [usersData]);

  const computersByOS = React.useMemo(() => {
    if (!computersData?.data) return [];
    
    // Group computers by operating system
    const osGroups: Record<string, number> = {};
    
    computersData.data.forEach(computer => {
      const os = computer.operatingSystem || 'Unknown';
      osGroups[os] = (osGroups[os] || 0) + 1;
    });
    
    // Convert to array format for charts
    return Object.entries(osGroups).map(([name, value]) => ({ name, value }));
  }, [computersData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#F4D03F'];

  return (
    <DashboardLayout title="Active Directory Dashboard" description="Overview of your Active Directory environment">
      <div className="flex justify-end mb-4">
        <DashboardExport dashboardRef={dashboardRef} title="Active Directory Dashboard" />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading dashboard data...</span>
        </div>
      ) : (
        <div ref={dashboardRef}>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.userCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total active users</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Computers</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.computerCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total computers</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Groups</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.groupCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total groups</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Domains</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.domainsCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total domains</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sites</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.sitesCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total sites</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subnets</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.subnetsCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total subnets</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Users by Organizational Unit</CardTitle>
                <CardDescription>
                  Distribution of users across organizational units
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {usersByOU.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usersByOU}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {usersByOU.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mr-2" />
                    <span>No data available</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Computers by Operating System</CardTitle>
                <CardDescription>
                  Distribution of computer operating systems
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {computersByOS.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={computersByOS}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" name="Computers" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mr-2" />
                    <span>No data available</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Most recent changes in your Active Directory environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                {/* This would show recent audit logs */}
                <div className="p-4 text-center text-muted-foreground">
                  View detailed logs in the Audit Logs section
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
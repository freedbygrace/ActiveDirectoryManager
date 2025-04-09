import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import DashboardLayout from "@/layouts/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

// Define the audit log type based on schema
interface AuditLog {
  id: number;
  timestamp: string;
  userId: number | null;
  action: string;
  targetId: string;
  details: Record<string, any>;
  connectionId: number;
}

// Define the connection type for filtering
interface Connection {
  id: number;
  name: string;
}

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [selectedConnection, setSelectedConnection] = useState<string>("all");
  
  // Fetch LDAP connections for the filter dropdown
  const { data: connections = [], isLoading: isLoadingConnections } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
    staleTime: 60000,
  });
  
  // Fetch audit logs with connection filter if needed
  const { 
    data: auditLogs = [], 
    isLoading: isLoadingLogs,
    refetch, 
    isRefetching
  } = useQuery<AuditLog[]>({
    queryKey: [
      selectedConnection === "all" 
        ? "/api/audit-logs" 
        : `/api/connections/${selectedConnection}/audit-logs`
    ],
    staleTime: 30000,
  });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(date);
  };
  
  // Format the action for display
  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };
  
  // Get the connection name from ID
  const getConnectionName = (connectionId: number) => {
    const connection = connections.find(c => c.id === connectionId);
    return connection ? connection.name : `Connection ${connectionId}`;
  };
  
  // Get the appropriate badge color based on action
  const getActionColor = (action: string) => {
    if (action.includes("ADD") || action.includes("CREATE")) return "bg-green-600";
    if (action.includes("REMOVE") || action.includes("DELETE")) return "bg-red-600";
    if (action.includes("MOVE") || action.includes("UPDATE")) return "bg-blue-600";
    return "bg-gray-600";
  };
  
  return (
    <DashboardLayout title="Audit Logs">
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="connection-filter">Connection:</Label>
              <Select
                value={selectedConnection}
                onValueChange={setSelectedConnection}
                disabled={isLoadingConnections}
              >
                <SelectTrigger id="connection-filter" className="w-[200px]">
                  <SelectValue placeholder="All Connections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Connections</SelectItem>
                  {connections.map(connection => (
                    <SelectItem key={connection.id} value={connection.id.toString()}>
                      {connection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              A detailed record of all actions performed in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isLoadingLogs || isRefetching) ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Connection</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {formatAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {log.targetId}
                        </TableCell>
                        <TableCell>
                          {getConnectionName(log.connectionId)}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <pre className="text-xs overflow-x-auto p-2 bg-muted rounded">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
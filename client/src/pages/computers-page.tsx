import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, FileDown, FileUp } from "lucide-react";
import { AdComputer, LdapConnection } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function ComputersPage() {
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data: connections = [], isLoading: isLoadingConnections } = useQuery<LdapConnection[]>({
    queryKey: ["/api/ldap-connections"],
  });

  const { data: computers = [], isLoading: isLoadingComputers } = useQuery<AdComputer[]>({
    queryKey: [
      `/api/connections/${selectedConnection}/ad-computers`,
      { select: "id,name,distinguishedName,dnsHostName,operatingSystem,operatingSystemVersion,lastLogon,enabled" }
    ],
    enabled: !!selectedConnection,
  });

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "DNS Host Name",
      accessorKey: "dnsHostName",
    },
    {
      header: "Operating System",
      accessorKey: (row: AdComputer) => 
        row.operatingSystem ? 
          `${row.operatingSystem}${row.operatingSystemVersion ? ` (${row.operatingSystemVersion})` : ''}` : 
          'Unknown',
    },
    {
      header: "Status",
      accessorKey: "enabled",
      cell: (row: AdComputer) => (
        row.enabled ? 
          <StatusBadge status="connected">Enabled</StatusBadge> : 
          <StatusBadge status="disconnected">Disabled</StatusBadge>
      ),
    },
    {
      header: "Last Logon",
      accessorKey: "lastLogon",
      cell: (row: AdComputer) => row.lastLogon ? format(new Date(row.lastLogon), 'MMM dd, yyyy') : 'Never',
    },
  ];

  return (
    <DashboardLayout title="Computers" description="Manage Active Directory Computers">
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div className="flex gap-2 flex-wrap">
          {connections.map((connection) => (
            <Badge
              key={connection.id}
              variant={selectedConnection === connection.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedConnection(connection.id)}
            >
              {connection.name}
            </Badge>
          ))}
          {connections.length === 0 && !isLoadingConnections && (
            <div className="text-muted-foreground">
              No LDAP connections available. Add a connection first.
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" variant="outline">
            <FileUp className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Computer
          </Button>
        </div>
      </div>

      <DataTable
        data={computers}
        columns={columns}
        isLoading={isLoadingComputers || isLoadingConnections}
        searchable
        filterable
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(computers.length / pageSize),
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
        }}
      />
    </DashboardLayout>
  );
}

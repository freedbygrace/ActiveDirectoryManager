import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, FileDown, FileUp } from "lucide-react";
import { AdDomain, LdapConnection } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function DomainsPage() {
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data: connections = [], isLoading: isLoadingConnections } = useQuery<LdapConnection[]>({
    queryKey: ["/api/ldap-connections"],
  });

  const { data: domains = [], isLoading: isLoadingDomains } = useQuery<AdDomain[]>({
    queryKey: [
      `/api/connections/${selectedConnection}/ad-domains`,
      { select: "id,name,distinguishedName,netBIOSName,forestName,domainFunctionality" }
    ],
    enabled: !!selectedConnection,
  });

  const columns = [
    {
      header: "Domain Name",
      accessorKey: "name",
    },
    {
      header: "NetBIOS Name",
      accessorKey: "netBIOSName",
    },
    {
      header: "Forest Name",
      accessorKey: "forestName",
    },
    {
      header: "Functionality Level",
      accessorKey: "domainFunctionality",
    },
    {
      header: "Distinguished Name",
      accessorKey: "distinguishedName",
      cell: (row: AdDomain) => (
        <div className="max-w-md truncate" title={row.distinguishedName}>
          {row.distinguishedName}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Domains" description="Manage Active Directory Domains">
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
            Add Domain
          </Button>
        </div>
      </div>

      <DataTable
        data={domains}
        columns={columns}
        isLoading={isLoadingDomains || isLoadingConnections}
        searchable
        filterable
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(domains.length / pageSize),
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
        }}
      />
    </DashboardLayout>
  );
}

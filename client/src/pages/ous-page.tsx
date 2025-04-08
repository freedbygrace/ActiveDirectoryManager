import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, FileDown, FileUp } from "lucide-react";
import { AdOrgUnit, LdapConnection } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function OUsPage() {
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data: connections = [], isLoading: isLoadingConnections } = useQuery<LdapConnection[]>({
    queryKey: ["/api/ldap-connections"],
  });

  const { data: orgUnits = [], isLoading: isLoadingOUs } = useQuery<AdOrgUnit[]>({
    queryKey: [
      `/api/connections/${selectedConnection}/ad-org-units`,
      { select: "id,name,distinguishedName,description" }
    ],
    enabled: !!selectedConnection,
  });

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Distinguished Name",
      accessorKey: "distinguishedName",
      cell: (row: AdOrgUnit) => (
        <div className="max-w-md truncate" title={row.distinguishedName}>
          {row.distinguishedName}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Organizational Units" description="Manage Active Directory Organizational Units">
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
            Add OU
          </Button>
        </div>
      </div>

      <DataTable
        data={orgUnits}
        columns={columns}
        isLoading={isLoadingOUs || isLoadingConnections}
        searchable
        filterable
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(orgUnits.length / pageSize),
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
        }}
      />
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { LdapConnection } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AddLdapModal } from "@/components/modals/add-ldap-modal";
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

export default function LdapConnectionsPage() {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState<LdapConnection | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<LdapConnection | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data: connections = [], isLoading } = useQuery<LdapConnection[]>({
    queryKey: ["/api/ldap-connections"],
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ldap-connections/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Connection deleted",
        description: "The LDAP connection has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ldap-connections"] });
      setConnectionToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete connection: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEditConnection = (connection: LdapConnection) => {
    setConnectionToEdit(connection);
    setIsAddModalOpen(true);
  };

  const handleDeleteConnection = (connection: LdapConnection) => {
    setConnectionToDelete(connection);
  };

  const confirmDeleteConnection = () => {
    if (connectionToDelete) {
      deleteConnectionMutation.mutate(connectionToDelete.id);
    }
  };

  const columns = [
    {
      header: "Connection Name",
      accessorKey: "name",
    },
    {
      header: "Server",
      accessorKey: "server",
    },
    {
      header: "Domain",
      accessorKey: "domain",
    },
    {
      header: "Port",
      accessorKey: "port",
    },
    {
      header: "SSL",
      accessorKey: "useSSL",
      cell: (row: LdapConnection) => row.useSSL ? "Yes" : "No",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: LdapConnection) => (
        <StatusBadge status={row.status === "connected" ? "connected" : "disconnected"}>
          {row.status === "connected" ? "Connected" : "Disconnected"}
        </StatusBadge>
      ),
    },
    {
      header: "Last Connected",
      accessorKey: "lastConnected",
      cell: (row: LdapConnection) => row.lastConnected ? format(new Date(row.lastConnected), 'MMM dd, yyyy HH:mm') : 'Never',
    },
    {
      header: "Actions",
      accessorKey: (row: LdapConnection) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleEditConnection(row); 
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleDeleteConnection(row); 
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="LDAP Connections" description="Manage connections to Active Directory Servers">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Set up and manage connections to your Active Directory servers.
          </p>
        </div>
        <Button onClick={() => {
          setConnectionToEdit(null);
          setIsAddModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </Button>
      </div>

      <DataTable
        data={connections}
        columns={columns}
        isLoading={isLoading}
        searchable
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(connections.length / pageSize),
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
        }}
      />

      <AddLdapModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setConnectionToEdit(null);
        }} 
        connectionToEdit={connectionToEdit}
      />

      <AlertDialog open={!!connectionToDelete} onOpenChange={() => setConnectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete LDAP Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the LDAP connection "{connectionToDelete?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteConnection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

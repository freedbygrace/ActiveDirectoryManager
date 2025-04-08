import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { LdapConnection } from "@shared/schema";
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

interface LdapConnectionsCardProps {
  connections: LdapConnection[];
}

export default function LdapConnectionsCard({ connections }: LdapConnectionsCardProps) {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState<LdapConnection | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<LdapConnection | null>(null);

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

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
        <CardTitle>LDAP Connections</CardTitle>
        <Button 
          variant="link" 
          className="p-0 h-auto font-medium text-sm text-primary"
          onClick={() => {
            setConnectionToEdit(null);
            setIsAddModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Connection
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {connections.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No LDAP connections configured. Add a connection to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 font-medium text-left">Connection Name</th>
                  <th className="py-3 px-4 font-medium text-left">Server</th>
                  <th className="py-3 px-4 font-medium text-left">Domain</th>
                  <th className="py-3 px-4 font-medium text-left">Port</th>
                  <th className="py-3 px-4 font-medium text-left">SSL</th>
                  <th className="py-3 px-4 font-medium text-left">Status</th>
                  <th className="py-3 px-4 font-medium text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((connection, index) => (
                  <tr key={connection.id} className={index < connections.length - 1 ? "border-b" : ""}>
                    <td className="py-3 px-4">{connection.name}</td>
                    <td className="py-3 px-4">{connection.server}</td>
                    <td className="py-3 px-4">{connection.domain}</td>
                    <td className="py-3 px-4">{connection.port}</td>
                    <td className="py-3 px-4">{connection.useSSL ? "Yes" : "No"}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={connection.status === "connected" ? "connected" : "disconnected"}>
                        {connection.status === "connected" ? "Connected" : "Disconnected"}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditConnection(connection)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteConnection(connection)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
      
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
    </Card>
  );
}

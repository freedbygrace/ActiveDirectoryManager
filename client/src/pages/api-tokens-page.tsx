import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { ApiToken } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CreateTokenModal } from "@/components/modals/create-token-modal";
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

export default function ApiTokensPage() {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<ApiToken | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { data: tokens = [], isLoading } = useQuery<ApiToken[]>({
    queryKey: ["/api/tokens"],
  });

  const deleteTokenMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tokens/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Token deleted",
        description: "The API token has been successfully revoked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      setTokenToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete token: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDeleteToken = (token: ApiToken) => {
    setTokenToDelete(token);
  };

  const confirmDeleteToken = () => {
    if (tokenToDelete) {
      deleteTokenMutation.mutate(tokenToDelete.id);
    }
  };

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (row: ApiToken) => row.createdAt ? format(new Date(row.createdAt), 'MMM dd, yyyy') : '',
    },
    {
      header: "Expires",
      accessorKey: "expiresAt",
      cell: (row: ApiToken) => row.expiresAt ? format(new Date(row.expiresAt), 'MMM dd, yyyy') : 'Never',
    },
    {
      header: "Actions",
      accessorKey: (row: ApiToken) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleDeleteToken(row); 
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="API Tokens" description="Manage API Tokens for accessing the AD Management API">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Create and manage API tokens for accessing the AD Management API programmatically.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Token
        </Button>
      </div>

      <DataTable
        data={tokens}
        columns={columns}
        isLoading={isLoading}
        searchable
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(tokens.length / pageSize),
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
        }}
      />

      <CreateTokenModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      <AlertDialog open={!!tokenToDelete} onOpenChange={() => setTokenToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Token</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the API token "{tokenToDelete?.name}"? 
              This action cannot be undone and will immediately invalidate any applications using this token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteToken}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

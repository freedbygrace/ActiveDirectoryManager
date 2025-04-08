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
import { Plus, Trash2 } from "lucide-react";
import { ApiToken } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiTokensCardProps {
  tokens: ApiToken[];
}

export default function ApiTokensCard({ tokens }: ApiTokensCardProps) {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<ApiToken | null>(null);
  const [expiration, setExpiration] = useState("30");

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

  const updateExpirationPolicyMutation = useMutation({
    mutationFn: async (days: string) => {
      // This would typically update a setting in the backend
      await new Promise(resolve => setTimeout(resolve, 500));
      return days;
    },
    onSuccess: (days) => {
      toast({
        title: "Policy updated",
        description: `Token expiration policy updated to ${days === "never" ? "never expire" : `${days} days`}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update policy: ${error.message}`,
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

  const handleApplyExpiration = () => {
    updateExpirationPolicyMutation.mutate(expiration);
  };

  const getCreatedTime = (createdAt: string | null | undefined) => {
    if (!createdAt) return "";
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch (e) {
      return "Unknown";
    }
  };

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b flex justify-between items-center">
        <CardTitle>Active API Tokens</CardTitle>
        <Button 
          variant="link" 
          className="p-0 h-auto font-medium text-sm text-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Token
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {tokens.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No active API tokens. Create a token to get started.
            </div>
          ) : (
            tokens.slice(0, 3).map((token) => (
              <div key={token.id} className="p-3 border rounded-md flex justify-between items-center">
                <div>
                  <div className="font-medium">{token.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Created {getCreatedTime(token.createdAt)}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteToken(token)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
          
          {tokens.length > 3 && (
            <Button 
              variant="outline" 
              className="w-full text-sm"
              onClick={() => window.location.href = "/api-tokens"}
            >
              View all {tokens.length} tokens
            </Button>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">Token Expiration Policy</div>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Select
                value={expiration}
                onValueChange={setExpiration}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expiration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleApplyExpiration}
              disabled={updateExpirationPolicyMutation.isPending}
            >
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
      
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
    </Card>
  );
}

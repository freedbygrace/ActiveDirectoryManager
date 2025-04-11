import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { AlertCircle, Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Token name is required"),
  expiration: z.string(),
  permissions: z.object({
    users_read: z.boolean().default(true),
    users_write: z.boolean().default(false),
    groups_read: z.boolean().default(true),
    groups_write: z.boolean().default(false),
    ous_read: z.boolean().default(true),
    ous_write: z.boolean().default(false),
    computers_read: z.boolean().default(true),
    computers_write: z.boolean().default(false),
    domains_read: z.boolean().default(true),
    domains_write: z.boolean().default(false),
    sites_read: z.boolean().default(true),
    sites_write: z.boolean().default(false),
    subnets_read: z.boolean().default(true),
    subnets_write: z.boolean().default(false),
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateTokenModal({ isOpen, onClose }: CreateTokenModalProps) {
  const { toast } = useToast();
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      expiration: "30",
      permissions: {
        users_read: true,
        users_write: false,
        groups_read: true,
        groups_write: false,
        ous_read: true,
        ous_write: false,
        computers_read: true,
        computers_write: false,
        domains_read: true,
        domains_write: false,
        sites_read: true,
        sites_write: false,
        subnets_read: true,
        subnets_write: false,
      },
    },
  });
  
  const createTokenMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const expiresAt = values.expiration === "never" 
        ? null 
        : new Date(Date.now() + parseInt(values.expiration) * 24 * 60 * 60 * 1000).toISOString();
      
      const res = await apiRequest("POST", "/api/tokens", {
        name: values.name,
        expiresAt,
        permissions: values.permissions,
      });
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Display the token for the user to copy
      setCreatedToken(data.token);
      
      // Invalidate the tokens query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create token",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    createTokenMutation.mutate(values);
  };
  
  const handleCopyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      toast({
        title: "Token copied",
        description: "API token copied to clipboard",
      });
    }
  };
  
  const handleClose = () => {
    setCreatedToken(null);
    form.reset();
    onClose();
  };
  
  const permissionItems = [
    { id: "users_read", label: "Users - Read" },
    { id: "users_write", label: "Users - Write" },
    { id: "groups_read", label: "Groups - Read" },
    { id: "groups_write", label: "Groups - Write" },
    { id: "ous_read", label: "OUs - Read" },
    { id: "ous_write", label: "OUs - Write" },
    { id: "computers_read", label: "Computers - Read" },
    { id: "computers_write", label: "Computers - Write" },
    { id: "domains_read", label: "Domains - Read" },
    { id: "domains_write", label: "Domains - Write" },
    { id: "sites_read", label: "Sites - Read" },
    { id: "sites_write", label: "Sites - Write" },
    { id: "subnets_read", label: "Subnets - Read" },
    { id: "subnets_write", label: "Subnets - Write" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>API Token Created</DialogTitle>
              <DialogDescription>
                Copy your API token now. For security reasons, it won't be shown again.
              </DialogDescription>
            </DialogHeader>
            
            <div className="my-4">
              <Alert className="border-amber-500 text-amber-800 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Please copy and store this token securely. It will not be displayed again.
                </AlertDescription>
              </Alert>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm bg-muted p-3 rounded w-full overflow-x-scroll whitespace-nowrap">
                    {createdToken}
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="ml-2 flex-shrink-0"
                    onClick={handleCopyToken}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API Token</DialogTitle>
              <DialogDescription>
                Create a new token to access the AD Management API
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. Integration API" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expiration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select token expiration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="180">180 days</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormLabel>Permissions</FormLabel>
                  <div className="border rounded-md p-4 mt-1 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {permissionItems.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name={`permissions.${item.id as keyof FormValues["permissions"]}`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTokenMutation.isPending}
                  >
                    {createTokenMutation.isPending ? "Creating..." : "Create Token"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

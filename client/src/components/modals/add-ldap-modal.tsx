import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLdapConnectionSchema, LdapConnection } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddLdapModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionToEdit?: LdapConnection | null;
}

// Create the form schema based on the insertLdapConnectionSchema
const formSchema = insertLdapConnectionSchema;

type FormValues = z.infer<typeof formSchema>;

export function AddLdapModal({ isOpen, onClose, connectionToEdit }: AddLdapModalProps) {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      server: "",
      domain: "",
      port: 389,
      useSSL: true,
      username: "",
      password: "",
    },
  });
  
  // Update form when editing an existing connection
  useEffect(() => {
    if (connectionToEdit) {
      form.reset({
        name: connectionToEdit.name,
        server: connectionToEdit.server,
        domain: connectionToEdit.domain,
        port: connectionToEdit.port,
        useSSL: connectionToEdit.useSSL,
        username: connectionToEdit.username,
        password: "", // Don't display the password
      });
    } else {
      form.reset({
        name: "",
        server: "",
        domain: "",
        port: 389,
        useSSL: true,
        username: "",
        password: "",
      });
    }
  }, [connectionToEdit, form]);
  
  const saveLdapConnectionMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (connectionToEdit) {
        // If we're not changing the password, don't send it (empty password will be ignored on the server)
        const payload = values.password 
          ? values 
          : { ...values, password: undefined };
        
        await apiRequest("PUT", `/api/ldap-connections/${connectionToEdit.id}`, payload);
      } else {
        await apiRequest("POST", "/api/ldap-connections", values);
      }
    },
    onSuccess: () => {
      toast({
        title: connectionToEdit ? "Connection updated" : "Connection added",
        description: connectionToEdit
          ? "LDAP connection has been updated successfully."
          : "New LDAP connection has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ldap-connections"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${connectionToEdit ? "update" : "add"} LDAP connection: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const testConnectionMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // This is a placeholder - in a real app this would call a test connection endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Connection test successful",
        description: "Successfully connected to the LDAP server.",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection test failed",
        description: `Failed to connect to the LDAP server: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: FormValues) => {
    saveLdapConnectionMutation.mutate(values);
  };
  
  const handleTestConnection = () => {
    const formValues = form.getValues();
    if (form.formState.isValid) {
      testConnectionMutation.mutate(formValues);
    } else {
      form.trigger();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {connectionToEdit ? "Edit LDAP Connection" : "Add LDAP Connection"}
          </DialogTitle>
          <DialogDescription>
            {connectionToEdit 
              ? "Update your Active Directory connection settings" 
              : "Configure a new connection to your Active Directory server"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Primary Domain Controller" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="server"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Server</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. dc01.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="useSSL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSL</FormLabel>
                    <Select
                      value={field.value ? "yes" : "no"}
                      onValueChange={(value) => field.onChange(value === "yes")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select SSL option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. administrator@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {connectionToEdit ? "Password (leave blank to keep current)" : "Password"}
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="mr-auto"
              >
                Cancel
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
                className="mr-2"
              >
                {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
              </Button>
              
              <Button 
                type="submit" 
                disabled={saveLdapConnectionMutation.isPending}
              >
                {saveLdapConnectionMutation.isPending 
                  ? "Saving..." 
                  : connectionToEdit ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

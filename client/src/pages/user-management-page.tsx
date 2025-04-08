import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Shield, ShieldOff } from "lucide-react";
import { User } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

// User form schema
const userFormSchema = insertUserSchema.extend({
  confirmPassword: z.string().optional(),
  id: z.number().optional(),
}).refine(data => {
  // If password is provided, confirmPassword must match
  if (data.password && data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UserManagementPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      fullName: "",
      role: "user",
    },
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const { confirmPassword, id, ...userData } = values;
      if (id) {
        // Update existing user
        await apiRequest("PUT", `/api/users/${id}`, userData);
      } else {
        // Create new user
        await apiRequest("POST", "/api/register", userData);
      }
    },
    onSuccess: () => {
      toast({
        title: userToEdit ? "User updated" : "User created",
        description: userToEdit 
          ? "The user has been successfully updated." 
          : "The user has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddDialogOpen(false);
      setUserToEdit(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${userToEdit ? "update" : "create"} user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddUser = () => {
    form.reset({
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      fullName: "",
      role: "user",
    });
    setUserToEdit(null);
    setIsAddDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    form.reset({
      id: user.id,
      username: user.username,
      password: "",
      confirmPassword: "",
      email: user.email || "",
      fullName: user.fullName || "",
      role: user.role || "user",
    });
    setUserToEdit(user);
    setIsAddDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const onSubmit = (values: UserFormValues) => {
    createUserMutation.mutate(values);
  };

  const columns = [
    {
      header: "Username",
      accessorKey: "username",
    },
    {
      header: "Full Name",
      accessorKey: "fullName",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: (row: User) => (
        <Badge variant={row.role === "admin" ? "default" : "secondary"}>
          {row.role || "user"}
        </Badge>
      ),
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (row: User) => row.createdAt ? format(new Date(row.createdAt), 'MMM dd, yyyy') : '',
    },
    {
      header: "Actions",
      accessorKey: (row: User) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleEditUser(row); 
            }}
            title="Edit user"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.role === "admin" ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { 
                e.stopPropagation(); 
                // Make user regular instead of admin
              }}
              title="Remove admin privileges"
            >
              <ShieldOff className="h-4 w-4 text-amber-600" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { 
                e.stopPropagation(); 
                // Make user admin
              }}
              title="Make admin"
            >
              <Shield className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleDeleteUser(row); 
            }}
            title="Delete user"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="User Management" description="Manage application users and permissions">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage users who can access the AD Management admin interface.
          </p>
        </div>
        <Button onClick={handleAddUser}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        isLoading={isLoading}
        searchable
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(users.length / pageSize),
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
        }}
      />

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userToEdit ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {userToEdit 
                ? "Update user information and permissions." 
                : "Fill in the details to create a new user."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter username" 
                        {...field}
                        disabled={!!userToEdit} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
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
                    <FormLabel>{userToEdit ? "New Password (optional)" : "Password"}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={userToEdit ? "Leave blank to keep current" : "Enter password"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{userToEdit ? "Confirm New Password" : "Confirm Password"}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setUserToEdit(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending 
                    ? "Saving..." 
                    : userToEdit ? "Update User" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the user "{userToDelete?.username}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
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

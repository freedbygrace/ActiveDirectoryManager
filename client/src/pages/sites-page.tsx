import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, RefreshCw, HardDrive, Network, ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AdSite {
  id: number;
  objectGUID: string;
  name: string;
  dn: string;
  canonicalName: string;
  description: string;
  location: string;
  subnets: string[] | null;
  managedBy: string | null;
  objectType: string;
  connectionId: number;
  adProperties: Record<string, any>;
}

interface AdSubnet {
  id: number;
  objectGUID: string;
  name: string;
  dn: string;
  canonicalName: string;
  description: string;
  location: string;
  siteObject: string | null;
  cidr: string | null;
  managedBy: string | null;
  objectType: string;
  connectionId: number;
  adProperties: Record<string, any>;
}

const siteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  location: z.string().optional(),
});

const subnetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  siteObject: z.string().optional(),
  cidr: z.string().optional(),
});

type SiteFormValues = z.infer<typeof siteSchema>;
type SubnetFormValues = z.infer<typeof subnetSchema>;

const MAX_ITEMS_PER_PAGE = 10;

export default function SitesPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("sites");
  
  // Pagination state
  const [currentSitePage, setCurrentSitePage] = useState(1);
  const [totalSitePages, setTotalSitePages] = useState(1);
  
  const [currentSubnetPage, setCurrentSubnetPage] = useState(1);
  const [totalSubnetPages, setTotalSubnetPages] = useState(1);
  
  // Editing state
  const [editingSite, setEditingSite] = useState<AdSite | null>(null);
  const [editingSubnet, setEditingSubnet] = useState<AdSubnet | null>(null);
  
  // Dialog state
  const [isSiteFormOpen, setIsSiteFormOpen] = useState(false);
  const [isSubnetFormOpen, setIsSubnetFormOpen] = useState(false);
  
  // Get LDAP connections
  const { data: connections = [], isLoading: isLoadingConnections } = useQuery<any[]>({
    queryKey: ['/api/ldap-connections'],
  });
  
  // Set first connection as default when data loads
  useEffect(() => {
    if (connections.length > 0 && !selectedConnection) {
      setSelectedConnection(connections[0].id);
    }
  }, [connections, selectedConnection]);
  
  interface ApiResponse<T> {
    data: T[];
    metadata: {
      totalPages: number;
      currentPage: number;
      totalRecordCount: number;
    };
  }
  
  // Get sites from the selected connection
  const {
    data: sitesData,
    isLoading: isLoadingSites,
    refetch: refetchSites,
    error: sitesError
  } = useQuery<ApiResponse<AdSite>>({
    queryKey: selectedConnection ? [`/api/connections/${selectedConnection}/ad-sites`, { top: MAX_ITEMS_PER_PAGE, skip: (currentSitePage - 1) * MAX_ITEMS_PER_PAGE }] : [],
    enabled: !!selectedConnection,
  });
  
  // Get subnets from the selected connection
  const {
    data: subnetsData,
    isLoading: isLoadingSubnets,
    refetch: refetchSubnets,
    error: subnetsError
  } = useQuery<ApiResponse<AdSubnet>>({
    queryKey: selectedConnection ? [`/api/connections/${selectedConnection}/ad-subnets`, { top: MAX_ITEMS_PER_PAGE, skip: (currentSubnetPage - 1) * MAX_ITEMS_PER_PAGE }] : [],
    enabled: !!selectedConnection,
  });
  
  // Update pagination information when data changes
  useEffect(() => {
    // Debug logging
    console.log("Sites Data:", sitesData);
    console.log("Sites Error:", sitesError);
    console.log("Subnets Data:", subnetsData);
    console.log("Subnets Error:", subnetsError);
    
    if (sitesData?.metadata) {
      setTotalSitePages(sitesData.metadata.totalPages || 1);
    }
    
    if (subnetsData?.metadata) {
      setTotalSubnetPages(subnetsData.metadata.totalPages || 1);
    }
  }, [sitesData, subnetsData, sitesError, subnetsError]);
  
  // Site form setup
  const siteForm = useForm<SiteFormValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
    },
  });
  
  // Subnet form setup
  const subnetForm = useForm<SubnetFormValues>({
    resolver: zodResolver(subnetSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      siteObject: "",
      cidr: "",
    },
  });
  
  // Reset and populate forms when editing
  useEffect(() => {
    if (editingSite) {
      siteForm.reset({
        name: editingSite.name,
        description: editingSite.description || "",
        location: editingSite.location || "",
      });
      setIsSiteFormOpen(true);
    } else {
      siteForm.reset({
        name: "",
        description: "",
        location: "",
      });
    }
  }, [editingSite, siteForm]);
  
  useEffect(() => {
    if (editingSubnet) {
      subnetForm.reset({
        name: editingSubnet.name,
        description: editingSubnet.description || "",
        location: editingSubnet.location || "",
        siteObject: editingSubnet.siteObject || "",
        cidr: editingSubnet.cidr || "",
      });
      setIsSubnetFormOpen(true);
    } else {
      subnetForm.reset({
        name: "",
        description: "",
        location: "",
        siteObject: "",
        cidr: "",
      });
    }
  }, [editingSubnet, subnetForm]);
  
  // Create site mutation
  const createSiteMutation = useMutation({
    mutationFn: async (data: SiteFormValues) => {
      const response = await fetch(`/api/connections/${selectedConnection}/ad-sites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create site');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Site created",
        description: "The site has been created successfully.",
      });
      setIsSiteFormOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${selectedConnection}/ad-sites`] });
    },
    onError: (error) => {
      toast({
        title: "Error creating site",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update site mutation
  const updateSiteMutation = useMutation({
    mutationFn: async ({ objectGUID, data }: { objectGUID: string; data: SiteFormValues }) => {
      const response = await fetch(`/api/connections/${selectedConnection}/ad-sites/${objectGUID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update site');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Site updated",
        description: "The site has been updated successfully.",
      });
      setEditingSite(null);
      setIsSiteFormOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${selectedConnection}/ad-sites`] });
    },
    onError: (error) => {
      toast({
        title: "Error updating site",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete site mutation
  const deleteSiteMutation = useMutation({
    mutationFn: async (objectGUID: string) => {
      const response = await fetch(`/api/connections/${selectedConnection}/ad-sites/${objectGUID}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete site');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Site deleted",
        description: "The site has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${selectedConnection}/ad-sites`] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting site",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create subnet mutation
  const createSubnetMutation = useMutation({
    mutationFn: async (data: SubnetFormValues) => {
      const response = await fetch(`/api/connections/${selectedConnection}/ad-subnets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create subnet');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subnet created",
        description: "The subnet has been created successfully.",
      });
      setIsSubnetFormOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${selectedConnection}/ad-subnets`] });
    },
    onError: (error) => {
      toast({
        title: "Error creating subnet",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update subnet mutation
  const updateSubnetMutation = useMutation({
    mutationFn: async ({ objectGUID, data }: { objectGUID: string; data: SubnetFormValues }) => {
      const response = await fetch(`/api/connections/${selectedConnection}/ad-subnets/${objectGUID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update subnet');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subnet updated",
        description: "The subnet has been updated successfully.",
      });
      setEditingSubnet(null);
      setIsSubnetFormOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${selectedConnection}/ad-subnets`] });
    },
    onError: (error) => {
      toast({
        title: "Error updating subnet",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete subnet mutation
  const deleteSubnetMutation = useMutation({
    mutationFn: async (objectGUID: string) => {
      const response = await fetch(`/api/connections/${selectedConnection}/ad-subnets/${objectGUID}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete subnet');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subnet deleted",
        description: "The subnet has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/connections/${selectedConnection}/ad-subnets`] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting subnet",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle site form submission
  const onSiteSubmit = (data: SiteFormValues) => {
    if (editingSite) {
      updateSiteMutation.mutate({ objectGUID: editingSite.objectGUID, data });
    } else {
      createSiteMutation.mutate(data);
    }
  };
  
  // Handle subnet form submission
  const onSubnetSubmit = (data: SubnetFormValues) => {
    if (editingSubnet) {
      updateSubnetMutation.mutate({ objectGUID: editingSubnet.objectGUID, data });
    } else {
      createSubnetMutation.mutate(data);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">AD Sites and Subnets</h1>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedConnection?.toString() || ""}
            onValueChange={(value) => {
              setSelectedConnection(parseInt(value));
              setCurrentSitePage(1);
              setCurrentSubnetPage(1);
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a connection" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingConnections ? (
                <SelectItem value="loading" disabled>
                  Loading connections...
                </SelectItem>
              ) : connections?.length === 0 ? (
                <SelectItem value="none" disabled>
                  No connections available
                </SelectItem>
              ) : (
                connections?.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id.toString()}>
                    {connection.name} ({connection.domain})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="sites" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="sites" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            <span>Sites</span>
          </TabsTrigger>
          <TabsTrigger value="subnets" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            <span>Subnets</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Active Directory Sites</CardTitle>
                <CardDescription>
                  View and manage sites in your Active Directory environment.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchSites()}
                  disabled={!selectedConnection}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setEditingSite(null);
                    setIsSiteFormOpen(true);
                  }}
                  disabled={!selectedConnection}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Site
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Associated Subnets</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selectedConnection ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <p className="text-muted-foreground">Please select a connection to view sites.</p>
                      </TableCell>
                    </TableRow>
                  ) : isLoadingSites ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0 border-0">
                        <div className="space-y-3 p-4">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sitesError ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <p className="text-destructive font-medium">Error loading sites</p>
                        <p className="text-muted-foreground">{sitesError.message || "Unknown error occurred"}</p>
                      </TableCell>
                    </TableRow>
                  ) : sitesData?.data && sitesData.data.length > 0 ? (
                    sitesData.data.map((site: AdSite) => (
                      <TableRow key={site.objectGUID}>
                        <TableCell className="font-medium">{site.name}</TableCell>
                        <TableCell>{site.description || '—'}</TableCell>
                        <TableCell>{site.location || '—'}</TableCell>
                        <TableCell>
                          {site.subnets && site.subnets.length > 0 
                            ? site.subnets.map((subnet, idx) => (
                                <Badge key={idx} variant="outline" className="mr-1">
                                  {subnet.split(',')[0].replace('CN=', '')}
                                </Badge>
                              ))
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingSite(site)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you sure you want to delete this site?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    site "{site.name}" and all of its data from the server.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSiteMutation.mutate(site.objectGUID)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <p className="text-muted-foreground">No sites found for this connection.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination for sites */}
              {sitesData?.data && sitesData.data.length > 0 && totalSitePages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentSitePage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentSitePage === 1}
                          className="gap-1 pl-2.5"
                        >
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" />
                          </svg>
                          <span>Previous</span>
                        </Button>
                      </PaginationItem>
                      {Array.from({ length: totalSitePages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <Button
                            variant={currentSitePage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentSitePage(page)}
                          >
                            {page}
                          </Button>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentSitePage((prev) => Math.min(prev + 1, totalSitePages))}
                          disabled={currentSitePage === totalSitePages}
                          className="gap-1 pr-2.5"
                        >
                          <span>Next</span>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M6.1584 3.13514C5.95694 3.32401 5.94673 3.64042 6.13559 3.84188L9.565 7.49991L6.13559 11.1579C5.94673 11.3594 5.95694 11.6758 6.1584 11.8647C6.35986 12.0535 6.67627 12.0433 6.86514 11.8419L10.6151 7.84188C10.7954 7.64955 10.7954 7.35027 10.6151 7.15794L6.86514 3.15794C6.67627 2.95648 6.35986 2.94628 6.1584 3.13514Z" fill="currentColor" />
                          </svg>
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Site Form Dialog */}
          <Dialog open={isSiteFormOpen} onOpenChange={setIsSiteFormOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>{editingSite ? 'Edit Site' : 'Create New Site'}</DialogTitle>
              </DialogHeader>
              <Form {...siteForm}>
                <form onSubmit={siteForm.handleSubmit(onSiteSubmit)} className="space-y-4">
                  <FormField
                    control={siteForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Site name" {...field} />
                        </FormControl>
                        <FormDescription>
                          The name of the Active Directory site.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={siteForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Site description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={siteForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Site location" {...field} />
                        </FormControl>
                        <FormDescription>
                          Physical location of this site, e.g., "New York Office"
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button 
                      type="submit"
                      disabled={createSiteMutation.isPending || updateSiteMutation.isPending}
                    >
                      {(createSiteMutation.isPending || updateSiteMutation.isPending) && (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingSite ? 'Update Site' : 'Create Site'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="subnets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Active Directory Subnets</CardTitle>
                <CardDescription>
                  Define network subnets and associate them with physical sites.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchSubnets()}
                  disabled={!selectedConnection}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setEditingSubnet(null);
                    setIsSubnetFormOpen(true);
                  }}
                  disabled={!selectedConnection}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subnet
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>CIDR</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selectedConnection ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        <p className="text-muted-foreground">Please select a connection to view subnets.</p>
                      </TableCell>
                    </TableRow>
                  ) : isLoadingSubnets ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0 border-0">
                        <div className="space-y-3 p-4">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : subnetsError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        <p className="text-destructive font-medium">Error loading subnets</p>
                        <p className="text-muted-foreground">{subnetsError.message || "Unknown error occurred"}</p>
                      </TableCell>
                    </TableRow>
                  ) : subnetsData?.data && subnetsData.data.length > 0 ? (
                    subnetsData.data.map((subnet: AdSubnet) => (
                      <TableRow key={subnet.objectGUID}>
                        <TableCell className="font-medium">{subnet.name}</TableCell>
                        <TableCell>{subnet.cidr || '—'}</TableCell>
                        <TableCell>{subnet.description || '—'}</TableCell>
                        <TableCell>{subnet.location || '—'}</TableCell>
                        <TableCell>
                          {subnet.siteObject ? (
                            <Badge variant="outline">
                              {subnet.siteObject.split(',')[0].replace('CN=', '')}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingSubnet(subnet)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you sure you want to delete this subnet?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    subnet "{subnet.name}" and all of its data from the server.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSubnetMutation.mutate(subnet.objectGUID)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        <p className="text-muted-foreground">No subnets found for this connection.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination for subnets */}
              {subnetsData?.data && subnetsData.data.length > 0 && totalSubnetPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentSubnetPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentSubnetPage === 1}
                          className="gap-1 pl-2.5"
                        >
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" />
                          </svg>
                          <span>Previous</span>
                        </Button>
                      </PaginationItem>
                      {Array.from({ length: totalSubnetPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <Button
                            variant={currentSubnetPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentSubnetPage(page)}
                          >
                            {page}
                          </Button>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentSubnetPage((prev) => Math.min(prev + 1, totalSubnetPages))}
                          disabled={currentSubnetPage === totalSubnetPages}
                          className="gap-1 pr-2.5"
                        >
                          <span>Next</span>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M6.1584 3.13514C5.95694 3.32401 5.94673 3.64042 6.13559 3.84188L9.565 7.49991L6.13559 11.1579C5.94673 11.3594 5.95694 11.6758 6.1584 11.8647C6.35986 12.0535 6.67627 12.0433 6.86514 11.8419L10.6151 7.84188C10.7954 7.64955 10.7954 7.35027 10.6151 7.15794L6.86514 3.15794C6.67627 2.95648 6.35986 2.94628 6.1584 3.13514Z" fill="currentColor" />
                          </svg>
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subnet Form Dialog */}
          <Dialog open={isSubnetFormOpen} onOpenChange={setIsSubnetFormOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>{editingSubnet ? 'Edit Subnet' : 'Create New Subnet'}</DialogTitle>
              </DialogHeader>
              <Form {...subnetForm}>
                <form onSubmit={subnetForm.handleSubmit(onSubnetSubmit)} className="space-y-4">
                  <FormField
                    control={subnetForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Subnet name (e.g., 192.168.1.0)" {...field} />
                        </FormControl>
                        <FormDescription>
                          The network address for this subnet.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subnetForm.control}
                    name="cidr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CIDR Notation</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 192.168.1.0/24" {...field} />
                        </FormControl>
                        <FormDescription>
                          The subnet in CIDR notation format.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subnetForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Subnet description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subnetForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Subnet location" {...field} />
                        </FormControl>
                        <FormDescription>
                          Physical location of this subnet, e.g., "Floor 3, Building B"
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subnetForm.control}
                    name="siteObject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a site" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {!isLoadingSites && sitesData?.data?.map((site: AdSite) => (
                                <SelectItem key={site.objectGUID} value={site.dn}>
                                  {site.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          The site that this subnet is associated with.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button 
                      type="submit"
                      disabled={createSubnetMutation.isPending || updateSubnetMutation.isPending}
                    >
                      {(createSubnetMutation.isPending || updateSubnetMutation.isPending) && (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingSubnet ? 'Update Subnet' : 'Create Subnet'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
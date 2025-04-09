import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash, History, ArrowLeftRight, RefreshCw, Play } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

type LdapConnection = {
  id: number;
  name: string;
  server: string;
  domain: string;
};

type LdapFilter = {
  id: number;
  name: string;
  description: string | null;
  filter: any;
  ldapFilter: string;
  connectionId: number;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedAt: string | null;
  isActive: boolean;
};

type LdapFilterRevision = {
  id: number;
  filterId: number;
  filter: any;
  ldapFilter: string;
  modifiedBy: number;
  modifiedAt: string;
};

const LdapQueryBuilderPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | undefined>();
  const [selectedFilter, setSelectedFilter] = useState<LdapFilter | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterDescription, setFilterDescription] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [objectClass, setObjectClass] = useState<string>("user");
  const [showRevisionsDialog, setShowRevisionsDialog] = useState(false);
  const [showTestResultsDialog, setShowTestResultsDialog] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [filterBuilder, setFilterBuilder] = useState<any>({
    operator: "and",
    conditions: [{ attribute: "", operator: "equals", value: "" }]
  });

  // Query to get LDAP connections
  const { 
    data: connections,
    isLoading: connectionsLoading 
  } = useQuery({
    queryKey: ["/api/ldap-connections"],
    enabled: !!user
  });

  // Query to get LDAP filters for the selected connection
  const { 
    data: filters,
    isLoading: filtersLoading 
  } = useQuery({
    queryKey: ["/api/connections", selectedConnectionId, "ldap-filters"],
    enabled: !!selectedConnectionId,
  });

  // Query to get LDAP filter revisions
  const { 
    data: revisions,
    isLoading: revisionsLoading,
    refetch: refetchRevisions
  } = useQuery({
    queryKey: ["/api/ldap-filters", selectedFilter?.id, "revisions"],
    enabled: !!selectedFilter?.id && showRevisionsDialog,
  });

  // Mutation to save a new filter
  const createFilterMutation = useMutation({
    mutationFn: async (newFilter: any) => {
      if (!selectedConnectionId) throw new Error("No connection selected");
      const res = await apiRequest("POST", `/api/connections/${selectedConnectionId}/ldap-filters`, newFilter);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Filter created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections", selectedConnectionId, "ldap-filters"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating filter",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation to update an existing filter
  const updateFilterMutation = useMutation({
    mutationFn: async (updatedFilter: any) => {
      if (!selectedFilter) throw new Error("No filter selected");
      const res = await apiRequest("PUT", `/api/ldap-filters/${selectedFilter.id}`, updatedFilter);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Filter updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections", selectedConnectionId, "ldap-filters"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating filter",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation to delete a filter
  const deleteFilterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFilter) throw new Error("No filter selected");
      return await apiRequest("DELETE", `/api/ldap-filters/${selectedFilter.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Filter deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections", selectedConnectionId, "ldap-filters"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting filter",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation to revert to a previous version
  const revertToRevisionMutation = useMutation({
    mutationFn: async (revisionId: number) => {
      if (!selectedFilter) throw new Error("No filter selected");
      const res = await apiRequest("POST", `/api/ldap-filters/${selectedFilter.id}/revert/${revisionId}`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Filter reverted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections", selectedConnectionId, "ldap-filters"] });
      setSelectedFilter(data);
      setFilterName(data.name);
      setFilterDescription(data.description || "");
      setFilterQuery(data.ldapFilter);
      setIsActive(data.isActive);
      setShowRevisionsDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error reverting filter",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation to test the LDAP filter
  const testFilterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConnectionId) throw new Error("No connection selected");
      const res = await apiRequest("POST", `/api/connections/${selectedConnectionId}/test-ldap-filter`, {
        ldapFilter: filterQuery,
        objectClass
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setTestResults(data);
      setShowTestResultsDialog(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error testing filter",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reset form
  const resetForm = () => {
    setSelectedFilter(null);
    setFilterName("");
    setFilterDescription("");
    setFilterQuery("");
    setIsActive(true);
  };

  // Select filter
  const handleSelectFilter = (filter: LdapFilter) => {
    setSelectedFilter(filter);
    setFilterName(filter.name);
    setFilterDescription(filter.description || "");
    setFilterQuery(filter.ldapFilter);
    setIsActive(filter.isActive);
  };

  // Save filter
  const handleSaveFilter = () => {
    if (!filterName || !filterQuery) {
      toast({
        title: "Validation Error",
        description: "Filter name and query are required",
        variant: "destructive",
      });
      return;
    }

    const filterData = {
      name: filterName,
      description: filterDescription || null,
      ldapFilter: filterQuery,
      filter: filterBuilder,
      isActive
    };

    if (selectedFilter) {
      updateFilterMutation.mutate(filterData);
    } else {
      createFilterMutation.mutate(filterData);
    }
  };

  // Render connections dropdown
  const renderConnectionsDropdown = () => {
    if (connectionsLoading) {
      return <SelectTrigger disabled>
        <SelectValue placeholder="Loading connections..." />
      </SelectTrigger>;
    }

    return (
      <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
        <SelectTrigger>
          <SelectValue placeholder="Select a connection" />
        </SelectTrigger>
        <SelectContent>
          {connections?.map((conn: LdapConnection) => (
            <SelectItem key={conn.id} value={conn.id.toString()}>
              {conn.name} ({conn.domain})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  // Render filters list
  const renderFiltersList = () => {
    if (!selectedConnectionId) {
      return <p className="text-muted-foreground text-sm">Select a connection to view filters</p>;
    }

    if (filtersLoading) {
      return <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>;
    }

    if (!filters || filters.length === 0) {
      return <p className="text-muted-foreground text-sm py-4">No filters found for this connection</p>;
    }

    return (
      <div className="space-y-2 mt-4">
        {filters.map((filter: LdapFilter) => (
          <div 
            key={filter.id} 
            className={`p-3 border rounded-md cursor-pointer hover:bg-secondary/40 ${selectedFilter?.id === filter.id ? 'bg-secondary' : ''}`}
            onClick={() => handleSelectFilter(filter)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{filter.name}</h4>
                {filter.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{filter.description}</p>
                )}
              </div>
              {!filter.isActive && (
                <span className="text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded-full">
                  Inactive
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render revisions dialog
  const renderRevisionsDialog = () => {
    return (
      <Dialog open={showRevisionsDialog} onOpenChange={setShowRevisionsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Revision History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of "{selectedFilter?.name}"
            </DialogDescription>
          </DialogHeader>

          {revisionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Modified By</TableHead>
                    <TableHead>LDAP Filter</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisions && revisions.length > 0 ? (
                    revisions.map((rev: LdapFilterRevision) => (
                      <TableRow key={rev.id}>
                        <TableCell>
                          {new Date(rev.modifiedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>User ID: {rev.modifiedBy}</TableCell>
                        <TableCell>
                          <code className="text-xs max-w-[300px] block overflow-hidden text-ellipsis">
                            {rev.ldapFilter}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => revertToRevisionMutation.mutate(rev.id)}
                            disabled={revertToRevisionMutation.isPending}
                          >
                            {revertToRevisionMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Revert
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        No revision history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRevisionsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Render test results dialog
  const renderTestResultsDialog = () => {
    return (
      <Dialog open={showTestResultsDialog} onOpenChange={setShowTestResultsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Test Results</DialogTitle>
            <DialogDescription>
              Results for LDAP filter: <code>{filterQuery}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {testResults.length > 0 ? (
              <Table>
                <TableCaption>Found {testResults.length} results</TableCaption>
                <TableHeader>
                  <TableRow>
                    {Object.keys(testResults[0]).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testResults.map((result, index) => (
                    <TableRow key={index}>
                      {Object.entries(result).map(([key, value]) => (
                        <TableCell key={key}>
                          {typeof value === 'object' 
                            ? JSON.stringify(value) 
                            : String(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8">No results found for this filter</p>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTestResultsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <DashboardLayout title="LDAP Query Builder">
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">LDAP Query Builder</h1>
            <p className="text-muted-foreground">
              Create, test and manage LDAP queries for Active Directory
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Side - Filters List */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>LDAP Filters</CardTitle>
                <CardDescription>Select a connection to view filters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="connection">LDAP Connection</Label>
                    <div className="mt-1">
                      {renderConnectionsDropdown()}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Saved Filters</h3>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 px-2"
                        onClick={resetForm}
                      >
                        New Filter
                      </Button>
                    </div>
                    {renderFiltersList()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Side - Filter Editor */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedFilter ? `Edit Filter: ${selectedFilter.name}` : 'Create New Filter'}
                </CardTitle>
                <CardDescription>
                  {selectedFilter 
                    ? 'Update your LDAP filter and test it against your Active Directory'
                    : 'Create a new LDAP filter and test it against your Active Directory'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <Label htmlFor="filterName">Filter Name</Label>
                      <Input 
                        id="filterName" 
                        value={filterName} 
                        onChange={(e) => setFilterName(e.target.value)}
                        placeholder="Enter a name for your filter"
                      />
                    </div>
                    <div>
                      <Label htmlFor="objectClass">Object Class</Label>
                      <Select value={objectClass} onValueChange={setObjectClass}>
                        <SelectTrigger id="objectClass">
                          <SelectValue placeholder="Select object type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="group">Group</SelectItem>
                          <SelectItem value="organizationalUnit">OU</SelectItem>
                          <SelectItem value="computer">Computer</SelectItem>
                          <SelectItem value="domain">Domain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="filterDescription">Description (Optional)</Label>
                    <Input 
                      id="filterDescription" 
                      value={filterDescription} 
                      onChange={(e) => setFilterDescription(e.target.value)}
                      placeholder="Enter a description"
                    />
                  </div>
                  
                  <Tabs defaultValue="manual" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual">Manual LDAP Query</TabsTrigger>
                      <TabsTrigger value="builder" disabled>
                        Visual Query Builder (Coming Soon)
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="manual" className="py-4">
                      <div className="space-y-2">
                        <Label htmlFor="ldapQuery">LDAP Query</Label>
                        <Textarea 
                          id="ldapQuery"
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                          placeholder="Enter your LDAP query string (e.g. (objectClass=user)(sAMAccountName=*))"
                          className="font-mono h-32"
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="builder">
                      <div className="py-8 text-center text-muted-foreground">
                        <p>Visual query builder will be available in a future update</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="isActive" className="flex items-center cursor-pointer space-x-2">
                      <input
                        id="isActive"
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span>Active</span>
                    </Label>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <div className="space-x-2">
                      {selectedFilter && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this filter?")) {
                                deleteFilterMutation.mutate();
                              }
                            }}
                            disabled={deleteFilterMutation.isPending}
                          >
                            {deleteFilterMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Trash className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              refetchRevisions();
                              setShowRevisionsDialog(true);
                            }}
                          >
                            <History className="h-4 w-4 mr-2" />
                            History
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => testFilterMutation.mutate()}
                        disabled={!selectedConnectionId || !filterQuery || testFilterMutation.isPending}
                      >
                        {testFilterMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Test Query
                      </Button>
                      <Button
                        onClick={handleSaveFilter}
                        disabled={
                          !selectedConnectionId || 
                          !filterName || 
                          !filterQuery || 
                          createFilterMutation.isPending || 
                          updateFilterMutation.isPending
                        }
                      >
                        {(createFilterMutation.isPending || updateFilterMutation.isPending) ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Filter
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      {renderRevisionsDialog()}
      {renderTestResultsDialog()}
    </DashboardLayout>
  );
}

export default LdapQueryBuilderPage;
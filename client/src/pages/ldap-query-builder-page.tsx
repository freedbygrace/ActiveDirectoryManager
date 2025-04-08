import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Save, History, RotateCcw, Play, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { format } from "date-fns";

// Types for LDAP objects
interface LdapAttribute {
  id: number;
  connectionId: number;
  name: string;
  displayName: string;
  description: string;
  type: string;
  multiValued: boolean;
  objectClass: string;
  isIndexed: boolean;
}

interface LdapFilter {
  id: number;
  connectionId: number;
  name: string;
  description: string;
  objectClass: string;
  filter: any;
  ldapFilter: string;
  createdAt: string;
  createdBy: number;
  modifiedAt: string;
  modifiedBy: number;
  currentVersion: number;
  isActive: boolean;
}

interface LdapFilterRevision {
  id: number;
  filterId: number;
  version: number;
  filter: any;
  ldapFilter: string;
  createdAt: string;
  createdBy: number;
  comment: string;
}

interface LdapConnection {
  id: number;
  name: string;
  server: string;
  domain: string;
  port: number;
  useSSL: boolean;
  status: string;
}

interface FilterCondition {
  attribute: string;
  operator: string;
  value: string;
}

interface FilterGroup {
  type: "AND" | "OR";
  conditions: (FilterCondition | FilterGroup)[];
}

export default function LdapQueryBuilderPage() {
  const { toast } = useToast();
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [selectedObjectClass, setSelectedObjectClass] = useState<string>("user");
  const [filterToEdit, setFilterToEdit] = useState<LdapFilter | null>(null);
  const [filterToDelete, setFilterToDelete] = useState<LdapFilter | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterDescription, setFilterDescription] = useState("");
  const [ldapFilter, setLdapFilter] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterGroup>({
    type: "AND",
    conditions: []
  });
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [revisionToRevert, setRevisionToRevert] = useState<LdapFilterRevision | null>(null);

  // Get all LDAP connections
  const { data: connections = [], isLoading: isLoadingConnections } = useQuery<LdapConnection[]>({
    queryKey: ["/api/ldap-connections"],
  });

  // Get attributes for the selected object class
  const { data: attributes = [], isLoading: isLoadingAttributes } = useQuery<LdapAttribute[]>({
    queryKey: ["/api/connections", selectedConnection, "ldap-attributes", selectedObjectClass],
    queryFn: async () => {
      if (!selectedConnection) return [];
      const res = await apiRequest("GET", `/api/connections/${selectedConnection}/ldap-attributes?objectClass=${selectedObjectClass}`);
      return await res.json();
    },
    enabled: !!selectedConnection,
  });

  // Get saved filters for the selected connection
  const { data: savedFilters = [], isLoading: isLoadingSavedFilters } = useQuery<LdapFilter[]>({
    queryKey: ["/api/connections", selectedConnection, "ldap-filters"],
    queryFn: async () => {
      if (!selectedConnection) return [];
      const res = await apiRequest("GET", `/api/connections/${selectedConnection}/ldap-filters`);
      return await res.json();
    },
    enabled: !!selectedConnection,
  });

  // Get revision history for the selected filter
  const { data: filterRevisions = [], isLoading: isLoadingRevisions } = useQuery<LdapFilterRevision[]>({
    queryKey: ["/api/ldap-filters", filterToEdit?.id, "revisions"],
    queryFn: async () => {
      if (!filterToEdit) return [];
      const res = await apiRequest("GET", `/api/ldap-filters/${filterToEdit.id}/revisions`);
      return await res.json();
    },
    enabled: !!filterToEdit && showHistory,
  });

  // Create new filter
  const createFilterMutation = useMutation({
    mutationFn: async (filterData: any) => {
      const res = await apiRequest("POST", `/api/connections/${selectedConnection}/ldap-filters`, filterData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Filter created",
        description: "The LDAP filter has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections", selectedConnection, "ldap-filters"] });
      resetFilterForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create filter: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update filter
  const updateFilterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/ldap-filters/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Filter updated",
        description: "The LDAP filter has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections", selectedConnection, "ldap-filters"] });
      resetFilterForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update filter: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete filter
  const deleteFilterMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ldap-filters/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Filter deleted",
        description: "The LDAP filter has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connections", selectedConnection, "ldap-filters"] });
      setFilterToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete filter: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Test filter
  const testFilterMutation = useMutation({
    mutationFn: async (data: { ldapFilter: string; objectClass: string }) => {
      if (!selectedConnection) throw new Error("No connection selected");
      const res = await apiRequest("POST", `/api/connections/${selectedConnection}/test-filter`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      setTestResults(data);
      toast({
        title: "Filter tested",
        description: `Found ${data.length} results.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Test failed",
        description: `Failed to test filter: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Revert to a previous revision
  const revertToRevisionMutation = useMutation({
    mutationFn: async ({ filterId, revisionId }: { filterId: number; revisionId: number }) => {
      const res = await apiRequest("POST", `/api/ldap-filters/${filterId}/revert/${revisionId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Filter reverted",
        description: "The filter has been reverted to the selected revision.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ldap-filters", filterToEdit?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/ldap-filters", filterToEdit?.id, "revisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connections", selectedConnection, "ldap-filters"] });
      setRevisionToRevert(null);
      
      // Update the current filter with the reverted data
      if (filterToEdit) {
        setFilterToEdit(data);
        setCurrentFilter(data.filter);
        setLdapFilter(data.ldapFilter);
      }
    },
    onError: (error) => {
      toast({
        title: "Revert failed",
        description: `Failed to revert filter: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle filter selection
  const handleSelectFilter = (filter: LdapFilter) => {
    setFilterToEdit(filter);
    setFilterName(filter.name);
    setFilterDescription(filter.description || "");
    setCurrentFilter(filter.filter);
    setLdapFilter(filter.ldapFilter);
    setSelectedObjectClass(filter.objectClass);
  };

  // Convert the filter object to LDAP filter string
  const buildLdapFilter = (filter: FilterGroup): string => {
    if (!filter.conditions || filter.conditions.length === 0) {
      return "(objectClass=*)";
    }

    const operator = filter.type === "AND" ? "&" : "|";
    const conditions = filter.conditions.map(condition => {
      if ('type' in condition) {
        // This is a nested group
        return buildLdapFilter(condition);
      } else {
        // This is a basic condition
        let value = condition.value;
        let attr = condition.attribute;
        
        switch (condition.operator) {
          case "equals":
            return `(${attr}=${value})`;
          case "notEquals":
            return `(!(${attr}=${value}))`;
          case "contains":
            return `(${attr}=*${value}*)`;
          case "startsWith":
            return `(${attr}=${value}*)`;
          case "endsWith":
            return `(${attr}=*${value})`;
          case "exists":
            return `(${attr}=*)`;
          case "notExists":
            return `(!(${attr}=*))`;
          default:
            return `(${attr}=${value})`;
        }
      }
    });

    if (conditions.length === 1) {
      return conditions[0];
    }

    return `(${operator}${conditions.join('')})`;
  };

  // Add a new condition to the filter
  const addCondition = () => {
    // Find the first attribute for default
    const defaultAttribute = attributes.length > 0 ? attributes[0].name : "";
    
    const newCondition: FilterCondition = {
      attribute: defaultAttribute,
      operator: "equals",
      value: ""
    };

    setCurrentFilter({
      ...currentFilter,
      conditions: [...currentFilter.conditions, newCondition]
    });
  };

  // Add a new group to the filter
  const addGroup = () => {
    const newGroup: FilterGroup = {
      type: "AND",
      conditions: []
    };

    setCurrentFilter({
      ...currentFilter,
      conditions: [...currentFilter.conditions, newGroup]
    });
  };

  // Update a condition in the filter
  const updateCondition = (index: number, field: keyof FilterCondition, value: string) => {
    const updatedConditions = [...currentFilter.conditions];
    const condition = updatedConditions[index] as FilterCondition;
    
    if ('attribute' in condition) {
      (condition as any)[field] = value;
      setCurrentFilter({
        ...currentFilter,
        conditions: updatedConditions
      });
    }
  };

  // Update a group in the filter
  const updateGroup = (index: number, type: "AND" | "OR") => {
    const updatedConditions = [...currentFilter.conditions];
    const group = updatedConditions[index] as FilterGroup;
    
    if ('type' in group) {
      group.type = type;
      setCurrentFilter({
        ...currentFilter,
        conditions: updatedConditions
      });
    }
  };

  // Remove a condition from the filter
  const removeCondition = (index: number) => {
    const updatedConditions = [...currentFilter.conditions];
    updatedConditions.splice(index, 1);
    
    setCurrentFilter({
      ...currentFilter,
      conditions: updatedConditions
    });
  };

  // Handle saving the filter
  const handleSaveFilter = () => {
    if (!selectedConnection) {
      toast({
        title: "No connection selected",
        description: "Please select an LDAP connection first.",
        variant: "destructive",
      });
      return;
    }

    if (!filterName) {
      toast({
        title: "Missing filter name",
        description: "Please provide a name for the filter.",
        variant: "destructive",
      });
      return;
    }

    const generatedLdapFilter = buildLdapFilter(currentFilter);
    
    const filterData = {
      name: filterName,
      description: filterDescription,
      objectClass: selectedObjectClass,
      filter: currentFilter,
      ldapFilter: generatedLdapFilter
    };

    if (filterToEdit) {
      updateFilterMutation.mutate({ id: filterToEdit.id, data: filterData });
    } else {
      createFilterMutation.mutate(filterData);
    }
  };

  // Handle testing the filter
  const handleTestFilter = () => {
    if (!selectedConnection) {
      toast({
        title: "No connection selected",
        description: "Please select an LDAP connection first.",
        variant: "destructive",
      });
      return;
    }

    const generatedLdapFilter = buildLdapFilter(currentFilter);
    
    testFilterMutation.mutate({
      ldapFilter: generatedLdapFilter,
      objectClass: selectedObjectClass
    });
  };

  // Reset the filter form
  const resetFilterForm = () => {
    setFilterToEdit(null);
    setFilterName("");
    setFilterDescription("");
    setCurrentFilter({
      type: "AND",
      conditions: []
    });
    setLdapFilter("");
    setShowHistory(false);
    setTestResults([]);
  };

  // Handle filter type change
  const handleFilterTypeChange = (type: "AND" | "OR") => {
    setCurrentFilter({
      ...currentFilter,
      type
    });
  };

  // Update LDAP filter when filter conditions change
  useEffect(() => {
    const generatedFilter = buildLdapFilter(currentFilter);
    setLdapFilter(generatedFilter);
  }, [currentFilter]);

  // Columns for the saved filters table
  const filterColumns: Array<{
    header: string;
    accessorKey: keyof LdapFilter | ((row: LdapFilter) => React.ReactNode);
    cell?: (row: LdapFilter) => React.ReactNode;
  }> = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Object Class",
      accessorKey: "objectClass",
    },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Last Modified",
      accessorKey: "modifiedAt",
      cell: (row: LdapFilter) => format(new Date(row.modifiedAt), 'MMM dd, yyyy HH:mm'),
    },
    {
      header: "Version",
      accessorKey: "currentVersion",
    },
    {
      header: "Actions",
      accessorKey: "id", // Use a valid property but render with cell
      cell: (row: LdapFilter) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleSelectFilter(row);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { 
              e.stopPropagation(); 
              setFilterToDelete(row);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // Columns for the revisions table
  const revisionColumns: Array<{
    header: string;
    accessorKey: keyof LdapFilterRevision | ((row: LdapFilterRevision) => React.ReactNode);
    cell?: (row: LdapFilterRevision) => React.ReactNode;
  }> = [
    {
      header: "Version",
      accessorKey: "version",
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      cell: (row: LdapFilterRevision) => format(new Date(row.createdAt), 'MMM dd, yyyy HH:mm'),
    },
    {
      header: "Comment",
      accessorKey: "comment",
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (row: LdapFilterRevision) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setRevisionToRevert(row)}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Revert to this version
        </Button>
      ),
    },
  ];

  // Columns for the test results table
  const testResultColumns: Array<{
    header: string;
    accessorKey: string;
    cell?: (row: any) => React.ReactNode;
  }> = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Distinguished Name",
      accessorKey: "dn",
    },
  ];

  return (
    <DashboardLayout title="LDAP Query Builder" description="Create, manage, and test LDAP filters">
      <div className="mb-6 flex items-center justify-between">
        <div className="max-w-2xl">
          <p className="text-sm text-muted-foreground">
            Build complex LDAP queries with a visual interface. Save filters for later use, test them against your Active Directory, and manage filter versions.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={resetFilterForm} variant="outline">
            New Filter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Connection and Object Class Selection */}
        <Card className="md:col-span-12">
          <CardHeader className="pb-3">
            <CardTitle>Connection Settings</CardTitle>
            <CardDescription>Select a connection and object class for your filter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="connection">LDAP Connection</Label>
                <Select
                  value={selectedConnection?.toString() || ""}
                  onValueChange={(value) => setSelectedConnection(Number(value))}
                >
                  <SelectTrigger id="connection">
                    <SelectValue placeholder="Select a connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id.toString()}>
                        {connection.name} ({connection.server})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="objectClass">Object Class</Label>
                <Select
                  value={selectedObjectClass}
                  onValueChange={setSelectedObjectClass}
                >
                  <SelectTrigger id="objectClass">
                    <SelectValue placeholder="Select object class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="organizationalUnit">Organizational Unit</SelectItem>
                    <SelectItem value="computer">Computer</SelectItem>
                    <SelectItem value="domain">Domain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Builder */}
        <Card className="md:col-span-8">
          <CardHeader className="pb-3">
            <CardTitle>Filter Builder</CardTitle>
            <CardDescription>Build your LDAP filter by adding conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="filterName">Filter Name</Label>
                <Input
                  id="filterName"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Enter a name for this filter"
                />
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
            </div>

            <div className="mb-4">
              <Label>Filter Type</Label>
              <div className="mt-2 flex space-x-2">
                <Button
                  variant={currentFilter.type === "AND" ? "default" : "outline"}
                  onClick={() => handleFilterTypeChange("AND")}
                  size="sm"
                >
                  Match ALL conditions (AND)
                </Button>
                <Button
                  variant={currentFilter.type === "OR" ? "default" : "outline"}
                  onClick={() => handleFilterTypeChange("OR")}
                  size="sm"
                >
                  Match ANY condition (OR)
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {currentFilter.conditions.map((condition, index) => {
                if ('type' in condition) {
                  // This is a nested group (not implementing in this version)
                  return (
                    <div key={index} className="rounded-md border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Label>Group Type</Label>
                          <Select
                            value={condition.type}
                            onValueChange={(value) => updateGroup(index, value as "AND" | "OR")}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">AND</SelectItem>
                              <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Nested groups are not fully implemented in this version.
                      </p>
                    </div>
                  );
                }

                return (
                  <div key={index} className="grid grid-cols-1 gap-2 rounded-md border p-4 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <Label>Attribute</Label>
                      <Select
                        value={condition.attribute}
                        onValueChange={(value) => updateCondition(index, 'attribute', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {attributes.map((attr) => (
                            <SelectItem key={attr.id} value={attr.name}>
                              {attr.displayName || attr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <Label>Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(index, 'operator', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="notEquals">Not equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="startsWith">Starts with</SelectItem>
                          <SelectItem value="endsWith">Ends with</SelectItem>
                          <SelectItem value="exists">Exists</SelectItem>
                          <SelectItem value="notExists">Not exists</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-4">
                      <Label>Value</Label>
                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        placeholder="Value"
                        disabled={["exists", "notExists"].includes(condition.operator)}
                      />
                    </div>
                    <div className="flex items-end md:col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(index)}
                        className="self-end"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="flex space-x-2">
                <Button onClick={addCondition} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Condition
                </Button>
                <Button onClick={addGroup} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Group
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <Label htmlFor="ldapFilter">Generated LDAP Filter</Label>
              <Textarea
                id="ldapFilter"
                value={ldapFilter}
                onChange={(e) => setLdapFilter(e.target.value)}
                rows={2}
                className="font-mono text-sm"
              />
            </div>

            <div className="mt-6 flex space-x-3">
              <Button onClick={handleSaveFilter} disabled={!selectedConnection || !filterName}>
                <Save className="mr-2 h-4 w-4" />
                {filterToEdit ? "Update Filter" : "Save Filter"}
              </Button>
              <Button onClick={handleTestFilter} variant="secondary" disabled={!selectedConnection}>
                <Play className="mr-2 h-4 w-4" />
                Test Filter
              </Button>
              {filterToEdit && (
                <Button 
                  onClick={() => setShowHistory(!showHistory)} 
                  variant="outline"
                >
                  <History className="mr-2 h-4 w-4" />
                  {showHistory ? "Hide History" : "Show History"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Saved Filters and History */}
        <div className="md:col-span-4">
          <Tabs defaultValue="saved">
            <TabsList className="w-full">
              <TabsTrigger value="saved" className="flex-1">Saved Filters</TabsTrigger>
              <TabsTrigger value="testResults" className="flex-1">Test Results</TabsTrigger>
            </TabsList>
            <TabsContent value="saved">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Saved Filters</CardTitle>
                  <CardDescription>Filters saved for this connection</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={savedFilters}
                    columns={filterColumns}
                    isLoading={isLoadingSavedFilters}
                    pagination={{
                      pageIndex,
                      pageSize,
                      pageCount: Math.ceil(savedFilters.length / pageSize),
                      onPageChange: setPageIndex,
                      onPageSizeChange: setPageSize,
                    }}
                  />
                </CardContent>
              </Card>
              
              {showHistory && filterToEdit && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle>Revision History</CardTitle>
                    <CardDescription>Previous versions of this filter</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={filterRevisions}
                      columns={revisionColumns}
                      isLoading={isLoadingRevisions}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="testResults">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Test Results</CardTitle>
                  <CardDescription>
                    {testResults.length > 0 
                      ? `Found ${testResults.length} matching ${selectedObjectClass}s` 
                      : "Run a test to see results"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={testResults}
                    columns={testResultColumns}
                    isLoading={testFilterMutation.isPending}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Alert Dialogs */}
      <AlertDialog open={!!filterToDelete} onOpenChange={() => setFilterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the filter "{filterToDelete?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => filterToDelete && deleteFilterMutation.mutate(filterToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!revisionToRevert} onOpenChange={() => setRevisionToRevert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Filter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revert to version {revisionToRevert?.version}? 
              This will create a new version with the data from the selected revision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (filterToEdit && revisionToRevert) {
                  revertToRevisionMutation.mutate({
                    filterId: filterToEdit.id,
                    revisionId: revisionToRevert.id
                  });
                }
              }}
            >
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash, History, ArrowLeftRight, RefreshCw, Play, Plus, FolderPlus, X, Copy, GripVertical } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Drag and drop imports
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

// Sortable Group component for drag-and-drop
interface SortableGroupProps {
  id: string;
  group: any;
  groupIndex: number;
  filterBuilder: any;
  setFilterBuilder: (value: any) => void;
  ldapAttributes: string[];
  isLoadingAttributes: boolean;
}

const SortableGroup = ({
  id,
  group,
  groupIndex,
  filterBuilder,
  setFilterBuilder,
  ldapAttributes,
  isLoadingAttributes
}: SortableGroupProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-md p-4 mb-4 bg-background"
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <div 
            className="cursor-grab mr-2 p-1 hover:bg-muted rounded" 
            {...attributes} 
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Label className="mr-2">Group Operator:</Label>
          <Select 
            value={group.operator} 
            onValueChange={(value) => {
              const updatedGroups = [...filterBuilder.groups];
              updatedGroups[groupIndex].operator = value;
              setFilterBuilder({
                ...filterBuilder,
                groups: updatedGroups
              });
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">AND</SelectItem>
              <SelectItem value="or">OR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const updatedGroups = [...filterBuilder.groups];
            updatedGroups.splice(groupIndex, 1);
            setFilterBuilder({
              ...filterBuilder,
              groups: updatedGroups
            });
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {group.conditions.map((condition: any, condIndex: number) => (
          <div key={condIndex} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              {ldapAttributes.length > 0 ? (
                <Select
                  value={condition.attribute}
                  onValueChange={(value) => {
                    const updatedGroups = [...filterBuilder.groups];
                    updatedGroups[groupIndex].conditions[condIndex].attribute = value;
                    setFilterBuilder({
                      ...filterBuilder,
                      groups: updatedGroups
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingAttributes ? "Loading attributes..." : "Select attribute"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {ldapAttributes.map((attr) => (
                      <SelectItem key={attr} value={attr}>{attr}</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom attribute...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={isLoadingAttributes ? "Loading attributes..." : "Attribute name"}
                  value={condition.attribute}
                  onChange={(e) => {
                    const updatedGroups = [...filterBuilder.groups];
                    updatedGroups[groupIndex].conditions[condIndex].attribute = e.target.value;
                    setFilterBuilder({
                      ...filterBuilder,
                      groups: updatedGroups
                    });
                  }}
                />
              )}
              {condition.attribute === "custom" && (
                <Input
                  placeholder="Custom attribute name"
                  className="mt-1"
                  value=""
                  onChange={(e) => {
                    const updatedGroups = [...filterBuilder.groups];
                    updatedGroups[groupIndex].conditions[condIndex].attribute = e.target.value;
                    setFilterBuilder({
                      ...filterBuilder,
                      groups: updatedGroups
                    });
                  }}
                />
              )}
            </div>
            <div className="col-span-3">
              <Select
                value={condition.operator}
                onValueChange={(value) => {
                  const updatedGroups = [...filterBuilder.groups];
                  updatedGroups[groupIndex].conditions[condIndex].operator = value;
                  setFilterBuilder({
                    ...filterBuilder,
                    groups: updatedGroups
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="startsWith">Starts With</SelectItem>
                  <SelectItem value="endsWith">Ends With</SelectItem>
                  <SelectItem value="present">Is Present</SelectItem>
                  <SelectItem value="notEquals">Not Equals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-4">
              <Input
                placeholder="Value"
                value={condition.value}
                disabled={condition.operator === 'present'}
                onChange={(e) => {
                  const updatedGroups = [...filterBuilder.groups];
                  updatedGroups[groupIndex].conditions[condIndex].value = e.target.value;
                  setFilterBuilder({
                    ...filterBuilder,
                    groups: updatedGroups
                  });
                }}
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const updatedGroups = [...filterBuilder.groups];
                  updatedGroups[groupIndex].conditions.splice(condIndex, 1);
                  if (updatedGroups[groupIndex].conditions.length === 0) {
                    updatedGroups.splice(groupIndex, 1);
                  }
                  setFilterBuilder({
                    ...filterBuilder,
                    groups: updatedGroups
                  });
                }}
                disabled={group.conditions.length <= 1}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const updatedGroups = [...filterBuilder.groups];
            updatedGroups[groupIndex].conditions.push({ 
              attribute: "", 
              operator: "equals", 
              value: "" 
            });
            setFilterBuilder({
              ...filterBuilder,
              groups: updatedGroups
            });
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </div>
    </div>
  );
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
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [ldapAttributes, setLdapAttributes] = useState<string[]>([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [filterBuilder, setFilterBuilder] = useState<any>({
    operator: "and",
    groups: []
  });
  
  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event for group reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeId = active.id.toString();
      const overId = over.id.toString();
      
      const activeIndex = filterBuilder.groups.findIndex(
        (_: any, i: number) => `group-${i}` === activeId
      );
      const overIndex = filterBuilder.groups.findIndex(
        (_: any, i: number) => `group-${i}` === overId
      );
      
      if (activeIndex !== -1 && overIndex !== -1) {
        const newGroups = arrayMove(
          filterBuilder.groups,
          activeIndex,
          overIndex
        );
        
        setFilterBuilder({
          ...filterBuilder,
          groups: newGroups
        });
      }
    }
  };

  // Query to get LDAP connections
  const { 
    data: connections = [],
    isLoading: connectionsLoading 
  } = useQuery<LdapConnection[]>({
    queryKey: ["/api/ldap-connections"],
    enabled: !!user
  });

  // Query to get LDAP filters for the selected connection
  const { 
    data: filters = [],
    isLoading: filtersLoading 
  } = useQuery<LdapFilter[]>({
    queryKey: ["/api/connections", selectedConnectionId, "ldap-filters"],
    enabled: !!selectedConnectionId,
  });

  // Query to get LDAP filter revisions
  const { 
    data: revisions = [],
    isLoading: revisionsLoading,
    refetch: refetchRevisions
  } = useQuery<LdapFilterRevision[]>({
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
    // Reset filter builder to default state
    setFilterBuilder({
      operator: "and",
      groups: []
    });
  };

  // Select filter
  const handleSelectFilter = (filter: LdapFilter) => {
    setSelectedFilter(filter);
    setFilterName(filter.name);
    setFilterDescription(filter.description || "");
    setFilterQuery(filter.ldapFilter);
    setIsActive(filter.isActive);
    
    // Load filter builder data if available
    if (filter.filter) {
      try {
        const filterData = typeof filter.filter === 'string' 
          ? JSON.parse(filter.filter) 
          : filter.filter;
          
        // Make sure it has valid structure
        if (filterData && filterData.operator) {
          setFilterBuilder(filterData);
        }
      } catch (err) {
        console.error("Failed to parse filter builder data", err);
      }
    }
  };

  // Generate LDAP filter from the builder
  const generateLdapFilter = () => {
    const mainOperatorSymbol = filterBuilder.operator === 'and' ? '&' : '|';
    
    // Generate group conditions
    const groupsLdap = filterBuilder.groups
      .map((group: any) => {
        const groupOperatorSymbol = group.operator === 'and' ? '&' : '|';
        
        const groupConditions = group.conditions
          .filter((c: any) => c.attribute.trim() !== '')
          .map((c: any) => {
            switch (c.operator) {
              case 'equals':
                return `(${c.attribute}=${c.value})`;
              case 'contains':
                return `(${c.attribute}=*${c.value}*)`;
              case 'startsWith':
                return `(${c.attribute}=${c.value}*)`;
              case 'endsWith':
                return `(${c.attribute}=*${c.value})`;
              case 'present':
                return `(${c.attribute}=*)`;
              case 'notEquals':
                return `(!(${c.attribute}=${c.value}))`;
              default:
                return `(${c.attribute}=${c.value})`;
            }
          });
        
        if (groupConditions.length === 0) {
          return '';
        } else if (groupConditions.length === 1) {
          return groupConditions[0];
        } else {
          return `(${groupOperatorSymbol}${groupConditions.join('')})`;
        }
      })
      .filter((ldap: string) => ldap !== '');
    
    if (groupsLdap.length === 0) {
      setFilterQuery('');
    } else if (groupsLdap.length === 1) {
      setFilterQuery(groupsLdap[0]);
    } else {
      setFilterQuery(`(${mainOperatorSymbol}${groupsLdap.join('')})`);
    }
  };

  // Auto-update the LDAP filter when changes are made (if enabled)
  useEffect(() => {
    if (autoUpdateEnabled) {
      generateLdapFilter();
    }
  }, [filterBuilder, autoUpdateEnabled]);
  
  // Load LDAP attributes from the selected connection
  const loadLdapAttributes = async () => {
    if (!selectedConnectionId) return;
    
    try {
      setIsLoadingAttributes(true);
      const res = await apiRequest("GET", `/api/connections/${selectedConnectionId}/schema-attributes?objectClass=${objectClass}`);
      const data = await res.json();
      
      // Set default attributes if none are returned
      if (!data || !data.length) {
        setLdapAttributes([
          'cn', 'sAMAccountName', 'givenName', 'sn', 'mail', 'userPrincipalName', 
          'displayName', 'memberOf', 'objectSid', 'objectGUID', 'distinguishedName',
          'whenCreated', 'whenChanged', 'accountExpires', 'userAccountControl'
        ]);
      } else {
        setLdapAttributes(data);
      }
    } catch (error) {
      console.error("Failed to load LDAP attributes:", error);
      // Set default attributes on error
      setLdapAttributes([
        'cn', 'sAMAccountName', 'givenName', 'sn', 'mail', 'userPrincipalName', 
        'displayName', 'memberOf', 'objectSid', 'objectGUID', 'distinguishedName',
        'whenCreated', 'whenChanged', 'accountExpires', 'userAccountControl'
      ]);
    } finally {
      setIsLoadingAttributes(false);
    }
  };
  
  // Load attributes when connection or object class changes
  useEffect(() => {
    if (selectedConnectionId) {
      loadLdapAttributes();
    }
  }, [selectedConnectionId, objectClass]);

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
                    <TableHead>Version</TableHead>
                    <TableHead>Modified By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>LDAP Filter</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisions.map((rev: LdapFilterRevision) => (
                    <TableRow key={rev.id}>
                      <TableCell>v{rev.id}</TableCell>
                      <TableCell>User #{rev.modifiedBy}</TableCell>
                      <TableCell>{new Date(rev.modifiedAt).toLocaleString()}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{rev.ldapFilter}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => revertToRevisionMutation.mutate(rev.id)}
                          disabled={revertToRevisionMutation.isPending}
                        >
                          {revertToRevisionMutation.isPending ? 
                            <Loader2 className="h-4 w-4 animate-spin" /> : 
                            'Restore'
                          }
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevisionsDialog(false)}>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Test Results</DialogTitle>
            <DialogDescription>
              LDAP filter test results for "{filterQuery}"
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {testResults.length > 0 ? (
              <div>
                <p className="mb-2 text-muted-foreground">Found {testResults.length} results:</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Distinguished Name</TableHead>
                      <TableHead>Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.map((result: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs break-all">{result.dn}</TableCell>
                        <TableCell>{result.cn || result.name || result.displayName || result.sAMAccountName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p>No results found matching this filter.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestResultsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>LDAP Filters</CardTitle>
              <CardDescription>Saved LDAP query filters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Connection</Label>
                  {renderConnectionsDropdown()}
                </div>
                
                {renderFiltersList()}
              </div>
            </CardContent>
          </Card>

          {/* Main content */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>
                {selectedFilter ? `Edit: ${selectedFilter.name}` : "Create New LDAP Filter"}
              </CardTitle>
              <CardDescription>
                Build and test LDAP filters for your Active Directory queries
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-250px)] overflow-y-auto pr-1 scrollbar-custom">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="filterName">Filter Name</Label>
                    <Input
                      id="filterName"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="My LDAP Filter"
                    />
                  </div>
                  <div>
                    <Label htmlFor="objectClass">Object Class</Label>
                    <Select value={objectClass} onValueChange={setObjectClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select object class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                        <SelectItem value="computer">Computer</SelectItem>
                        <SelectItem value="organizationalUnit">Organizational Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="filterDescription">Description</Label>
                  <Textarea
                    id="filterDescription"
                    value={filterDescription}
                    onChange={(e) => setFilterDescription(e.target.value)}
                    placeholder="What does this filter do?"
                    rows={2}
                  />
                </div>

                <Tabs defaultValue="builder">
                  <TabsList>
                    <TabsTrigger value="builder">Visual Builder</TabsTrigger>
                    <TabsTrigger value="raw">Manual LDAP Query</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="raw">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="ldapFilter">LDAP Filter Query</Label>
                        <Textarea
                          id="ldapFilter"
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                          placeholder="(&(objectClass=user)(memberOf=CN=MyGroup,OU=Groups,DC=example,DC=com))"
                          rows={5}
                          className="font-mono"
                        />
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => testFilterMutation.mutate()}
                          disabled={!filterQuery || testFilterMutation.isPending}
                        >
                          {testFilterMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Test Query
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="builder">
                    <div className="space-y-4">
                      {/* Main operator selection */}
                      <div>
                        <Label className="mb-2">Main Operator</Label>
                        <div className="flex items-center">
                          <Select
                            value={filterBuilder.operator}
                            onValueChange={(value) => {
                              setFilterBuilder({
                                ...filterBuilder,
                                operator: value
                              });
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="and">AND</SelectItem>
                              <SelectItem value="or">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Condition groups section */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <Label>Condition Groups</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFilterBuilder({
                                ...filterBuilder,
                                groups: [
                                  ...filterBuilder.groups,
                                  {
                                    operator: "and",
                                    conditions: [
                                      { attribute: "", operator: "equals", value: "" }
                                    ]
                                  }
                                ]
                              });
                            }}
                          >
                            <FolderPlus className="h-4 w-4 mr-2" />
                            Add Group
                          </Button>
                        </div>

                        {filterBuilder.groups && filterBuilder.groups.length > 0 ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext 
                              items={filterBuilder.groups.map((_: any, index: number) => `group-${index}`)}
                              strategy={verticalListSortingStrategy}
                            >
                              {filterBuilder.groups.map((group: any, index: number) => (
                                <SortableGroup
                                  key={index}
                                  id={`group-${index}`}
                                  group={group}
                                  groupIndex={index}
                                  filterBuilder={filterBuilder}
                                  setFilterBuilder={setFilterBuilder}
                                  ldapAttributes={ldapAttributes}
                                  isLoadingAttributes={isLoadingAttributes}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <div className="p-8 text-center border rounded-md bg-background">
                            <p className="text-muted-foreground mb-4">No condition groups added yet</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFilterBuilder({
                                  ...filterBuilder,
                                  groups: [
                                    ...filterBuilder.groups,
                                    {
                                      operator: "and",
                                      conditions: [
                                        { attribute: "", operator: "equals", value: "" }
                                      ]
                                    }
                                  ]
                                });
                              }}
                            >
                              <FolderPlus className="h-4 w-4 mr-2" />
                              Add First Group
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Additional feature 1: Auto-generate filter on changes */}
                      <div className="mt-4 flex items-center space-x-2">
                        <Switch 
                          id="autoUpdate" 
                          checked={autoUpdateEnabled}
                          onCheckedChange={setAutoUpdateEnabled}
                        />
                        <Label htmlFor="autoUpdate">Auto-generate LDAP filter on changes</Label>
                      </div>

                      {/* Generate button (if not auto-update) */}
                      {!autoUpdateEnabled && (
                        <div className="mt-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={generateLdapFilter}
                          >
                            <ArrowLeftRight className="h-4 w-4 mr-2" />
                            Generate LDAP Filter
                          </Button>
                        </div>
                      )}
                      
                      {/* Display LDAP Filter with copy functionality */}
                      {filterQuery && (
                        <div className="mt-4 p-3 border rounded-md bg-muted">
                          <div className="flex justify-between items-center mb-1">
                            <Label className="text-xs">Generated LDAP Filter:</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 py-0"
                              onClick={() => {
                                navigator.clipboard.writeText(filterQuery);
                                toast({
                                  title: "Copied to clipboard",
                                  description: "LDAP query has been copied to your clipboard",
                                  duration: 2000,
                                });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              <span className="text-xs">Copy</span>
                            </Button>
                          </div>
                          <code className="text-xs break-all block p-2 bg-background rounded border">{filterQuery}</code>
                        </div>
                      )}
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
                            setShowRevisionsDialog(true);
                            refetchRevisions();
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
                      onClick={resetForm}
                    >
                      New Filter
                    </Button>
                    
                    <Button
                      variant="default"
                      onClick={handleSaveFilter}
                      disabled={createFilterMutation.isPending || updateFilterMutation.isPending}
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
      
      {renderRevisionsDialog()}
      {renderTestResultsDialog()}
    </DashboardLayout>
  );
};

export default LdapQueryBuilderPage;
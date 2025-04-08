import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { LdapConnection, LdapQuery } from "@shared/schema";
import { LdapQueryBuilderParams } from "@/components/ldap/ldap-query-builder";
import { EnhancedLdapQueryBuilder } from "@/components/ldap/enhanced-ldap-query-builder";
import { LdapCondition, LdapOperator } from "@/lib/ldap-types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, MoreHorizontal, Plus, Code, Save, Play, FileClock } from "lucide-react";
import { format } from "date-fns";

export default function LdapQueryBuilderPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  
  const [queryName, setQueryName] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  
  const [activeQuery, setActiveQuery] = useState<LdapQuery | null>(null);
  
  const [queryBuilderParams, setQueryBuilderParams] = useState<LdapQueryBuilderParams>({
    targetObject: "users",
    filter: {
      operator: LdapOperator.AND,
      conditions: []
    }
  });

  // Fetch all saved queries
  const { data: savedQueries = [], isLoading: isLoadingQueries } = useQuery<LdapQuery[]>({
    queryKey: ["/api/ldap-queries"],
  });

  // Fetch LDAP connections for the query builder
  const { data: connections = [], isLoading: isLoadingConnections } = useQuery<LdapConnection[]>({
    queryKey: ["/api/ldap-connections"],
  });

  // Mutation for creating a new query
  const createQueryMutation = useMutation({
    mutationFn: async (data: { 
      name: string;
      description: string;
      targetObject: string;
      filter: any;
    }) => {
      const response = await apiRequest("POST", "/api/ldap-queries", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ldap-queries"] });
      setShowCreateDialog(false);
      setQueryName("");
      setQueryDescription("");
      toast({
        title: "Query saved",
        description: "The LDAP query has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving query",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for testing a query
  const testQueryMutation = useMutation({
    mutationFn: async (data: {
      connectionId: number;
      targetObject: string;
      filter: any;
      limit?: number;
    }) => {
      const response = await apiRequest("POST", "/api/ldap-queries/test", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setTestResults(data.results);
      setShowTestDialog(true);
      toast({
        title: "Query executed",
        description: `Query returned ${data.count} results.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error testing query",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for updating an existing query
  const updateQueryMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      name: string;
      description: string;
      targetObject: string;
      filter: any;
    }) => {
      const response = await apiRequest("PUT", `/api/ldap-queries/${data.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ldap-queries"] });
      setActiveQuery(null);
      toast({
        title: "Query updated",
        description: "The LDAP query has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating query",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Function to handle query deletion
  const deleteQuery = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/ldap-queries/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/ldap-queries"] });
      toast({
        title: "Query deleted",
        description: "The LDAP query has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting query",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Function to load a query for editing
  const loadQuery = (query: LdapQuery) => {
    setActiveQuery(query);
    setQueryBuilderParams({
      targetObject: query.targetObject as "users" | "groups" | "computers" | "ous",
      filter: query.filterJson as LdapCondition
    });
    setQueryName(query.name);
    setQueryDescription(query.description || "");
  };

  // Function to handle saving a query
  const handleSaveQuery = () => {
    if (activeQuery) {
      updateQueryMutation.mutate({
        id: activeQuery.id,
        name: queryName,
        description: queryDescription,
        targetObject: queryBuilderParams.targetObject,
        filter: queryBuilderParams.filter
      });
    } else {
      setShowCreateDialog(true);
    }
  };

  // Function to handle testing a query
  const handleTestQuery = () => {
    if (connections.length === 0) {
      toast({
        title: "No connections available",
        description: "Please add an LDAP connection first.",
        variant: "destructive",
      });
      return;
    }

    testQueryMutation.mutate({
      connectionId: connections[0].id,
      targetObject: queryBuilderParams.targetObject,
      filter: queryBuilderParams.filter,
      limit: 100
    });
  };

  // Generate columns for the saved queries table
  const queriesColumns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Target",
      accessorKey: "targetObject",
      cell: (row: LdapQuery) => {
        const targets: Record<string, string> = {
          users: "Users",
          groups: "Groups",
          computers: "Computers",
          ous: "Organizational Units",
        };
        return targets[row.targetObject] || row.targetObject;
      },
    },
    {
      header: "Last Updated",
      accessorKey: "updatedAt",
      cell: (row: LdapQuery) => 
        row.updatedAt ? format(new Date(row.updatedAt), "MMM dd, yyyy HH:mm") : "",
    },
    {
      header: "",
      accessorKey: "id",
      cell: (row: LdapQuery) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => loadQuery(row)}>
              <Code className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              testQueryMutation.mutate({
                connectionId: connections.length > 0 ? connections[0].id : 0,
                targetObject: row.targetObject,
                filter: row.filterJson as LdapCondition,
                limit: 100
              });
            }}>
              <Play className="h-4 w-4 mr-2" />
              Test
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteQuery(row.id)}>
              <FileClock className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Generate columns for the test results table dynamically based on the returned attributes
  const getTestResultsColumns = () => {
    if (!testResults || testResults.length === 0) return [];
    
    const firstResult = testResults[0];
    return Object.keys(firstResult).map(key => ({
      header: key,
      accessorKey: key,
      cell: (row: any) => {
        const value = row[key];
        if (value === null || value === undefined) return "-";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        if (Array.isArray(value)) return value.join(", ");
        return String(value);
      }
    }));
  };

  return (
    <DashboardLayout 
      title="LDAP Query Builder" 
      description="Build and save LDAP queries for your directory"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left panel - Saved Queries */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Saved Queries</CardTitle>
                <CardDescription>
                  Reuse and manage your saved LDAP queries
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={() => {
                  setActiveQuery(null);
                  setQueryBuilderParams({
                    targetObject: "users",
                    filter: {
                      operator: LdapOperator.AND,
                      conditions: []
                    }
                  });
                  setQueryName("");
                  setQueryDescription("");
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[calc(100vh-300px)] overflow-auto">
                <DataTable
                  data={savedQueries}
                  columns={queriesColumns}
                  isLoading={isLoadingQueries}
                  searchable
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel - Query Builder */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <CardTitle>
                    {activeQuery ? "Edit Query" : "New Query"}
                  </CardTitle>
                  <CardDescription>
                    {activeQuery ? `Editing: ${activeQuery.name}` : "Create a new LDAP query"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleTestQuery}
                    disabled={isLoadingConnections || connections.length === 0}
                  >
                    {testQueryMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Test Query
                  </Button>
                  <Button
                    onClick={handleSaveQuery}
                    disabled={createQueryMutation.isPending || updateQueryMutation.isPending}
                  >
                    {(createQueryMutation.isPending || updateQueryMutation.isPending) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeQuery ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="queryName">Query Name</Label>
                      <Input
                        id="queryName"
                        value={queryName}
                        onChange={(e) => setQueryName(e.target.value)}
                        placeholder="My Query"
                      />
                    </div>
                    <div>
                      <Label htmlFor="queryDescription">Description</Label>
                      <Input
                        id="queryDescription"
                        value={queryDescription}
                        onChange={(e) => setQueryDescription(e.target.value)}
                        placeholder="What does this query do?"
                      />
                    </div>
                  </div>
                ) : null}
                
                <div className="pt-2">
                  <EnhancedLdapQueryBuilder
                    connections={connections}
                    value={queryBuilderParams}
                    onChange={setQueryBuilderParams}
                    onTest={handleTestQuery}
                    onSave={handleSaveQuery}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Query Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Query</DialogTitle>
            <DialogDescription>
              Give your query a name and description for future reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Query Name</Label>
              <Input
                id="name"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                placeholder="Enter a name for your query"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={queryDescription}
                onChange={(e) => setQueryDescription(e.target.value)}
                placeholder="What does this query do?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!queryName) {
                  toast({
                    title: "Name required",
                    description: "Please enter a name for your query.",
                    variant: "destructive",
                  });
                  return;
                }
                
                createQueryMutation.mutate({
                  name: queryName,
                  description: queryDescription,
                  targetObject: queryBuilderParams.targetObject,
                  filter: queryBuilderParams.filter
                });
              }}
              disabled={createQueryMutation.isPending}
            >
              {createQueryMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Results Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Query Results</DialogTitle>
            <DialogDescription>
              Displaying {testResults?.length || 0} results from the LDAP query.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            {testResults && testResults.length > 0 ? (
              <DataTable
                data={testResults}
                columns={getTestResultsColumns()}
                searchable
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {testQueryMutation.isPending ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    Executing query...
                  </div>
                ) : (
                  "No results found"
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTestDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
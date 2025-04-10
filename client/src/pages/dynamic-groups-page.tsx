import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/layouts/dashboard-layout";
import { PlusCircle, RefreshCw, Trash2, Edit, Play, Clock, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import DynamicGroupRuleModal from "@/components/modals/dynamic-group-rule-modal";

interface DynamicGroupRule {
  id: number;
  name: string;
  description: string | null;
  targetGroup: string;
  enabled: boolean;
  schedule: string;
  createdAt: string;
  updatedAt: string;
  lastRun: string | null;
  lastRunStatus: string | null;
  variablePattern: string | null;
  connections: {
    id: number;
    name: string;
  }[];
}

export default function DynamicGroupsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState("active");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedRuleId, setSelectedRuleId] = React.useState<number | undefined>(undefined);

  const { data: dynamicGroupRules, isLoading } = useQuery({
    queryKey: ["/api/dynamic-group-rules"],
    retry: false,
  });

  const runNowMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/dynamic-group-rules/${id}/run`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rule execution started",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-group-rules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to execute rule: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const response = await apiRequest("PATCH", `/api/dynamic-group-rules/${id}`, { enabled });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rule status updated",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-group-rules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update rule: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/dynamic-group-rules/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Rule deleted successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-group-rules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete rule: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDeleteRule = (id: number) => {
    if (window.confirm("Are you sure you want to delete this rule? This action cannot be undone.")) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleRunNow = (id: number) => {
    runNowMutation.mutate(id);
  };

  const handleToggleRule = (id: number, currentStatus: boolean) => {
    toggleRuleMutation.mutate({ id, enabled: !currentStatus });
  };

  const handleEditRule = (id: number) => {
    setSelectedRuleId(id);
    setModalOpen(true);
  };

  const handleCreateRule = () => {
    setSelectedRuleId(undefined);
    setModalOpen(true);
  };

  // Filter the rules based on the active tab
  const filteredRules = React.useMemo(() => {
    if (!dynamicGroupRules) return [];
    return activeTab === "active"
      ? dynamicGroupRules.filter((rule: DynamicGroupRule) => rule.enabled)
      : dynamicGroupRules.filter((rule: DynamicGroupRule) => !rule.enabled);
  }, [dynamicGroupRules, activeTab]);

  const formatLastRunTime = (lastRun: string | null) => {
    if (!lastRun) return "Never";
    return format(new Date(lastRun), "MMM d, yyyy 'at' h:mm a");
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    let variant: "default" | "destructive" | "outline" | "secondary" | null = null;
    switch (status.toLowerCase()) {
      case "success":
        variant = "default";
        break;
      case "failed":
        variant = "destructive";
        break;
      case "running":
        variant = "secondary";
        break;
      default:
        variant = "outline";
    }
    
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <DashboardLayout 
      title="Dynamic Group Management"
      description="Create and manage rules for dynamic group membership"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/dynamic-group-rules"] })}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleCreateRule}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Rule
          </Button>
        </div>
      </div>
      <Separator className="my-6" />
      
      <div className="space-y-4">
        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="active">Active Rules</TabsTrigger>
              <TabsTrigger value="disabled">Disabled Rules</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="active" className="space-y-4">
            <RulesList 
              rules={filteredRules} 
              isLoading={isLoading} 
              onDelete={handleDeleteRule}
              onRunNow={handleRunNow}
              onToggle={handleToggleRule}
              onEdit={handleEditRule}
              onCreateNew={handleCreateRule}
            />
          </TabsContent>
          
          <TabsContent value="disabled" className="space-y-4">
            <RulesList 
              rules={filteredRules} 
              isLoading={isLoading} 
              onDelete={handleDeleteRule}
              onRunNow={handleRunNow}
              onToggle={handleToggleRule}
              onEdit={handleEditRule}
              onCreateNew={handleCreateRule}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Rule Editor Modal */}
      <DynamicGroupRuleModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        ruleId={selectedRuleId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/dynamic-group-rules"] });
        }}
      />
    </DashboardLayout>
  );
}

interface RulesListProps {
  rules: DynamicGroupRule[];
  isLoading: boolean;
  onDelete: (id: number) => void;
  onRunNow: (id: number) => void;
  onToggle: (id: number, currentStatus: boolean) => void;
  onEdit: (id: number) => void;
  onCreateNew: () => void;
}

function RulesList({ rules, isLoading, onDelete, onRunNow, onToggle, onEdit, onCreateNew }: RulesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!rules.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <p className="text-muted-foreground mb-4 text-center">
            No rules found. Create a new dynamic group rule to get started.
          </p>
          <Button onClick={onCreateNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <Card key={rule.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="mb-1">{rule.name}</CardTitle>
                <CardDescription>{rule.description || "No description provided"}</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => onToggle(rule.id, rule.enabled)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {rule.enabled ? "Disable Rule" : "Enable Rule"}
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => onRunNow(rule.id)}
                      disabled={!rule.enabled}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Run Now
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => onEdit(rule.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Edit Rule
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => onDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Delete Rule
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Target Group</p>
                  <p className="text-sm mt-1 truncate" title={rule.targetGroup}>
                    {rule.targetGroup}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Schedule</p>
                  <div className="flex items-center mt-1">
                    <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{rule.schedule}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Run</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm">{formatLastRunTime(rule.lastRun)}</p>
                    {rule.lastRunStatus && getStatusBadge(rule.lastRunStatus)}
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Connected to</p>
                <ScrollArea className="h-10">
                  <div className="flex flex-wrap gap-2">
                    {rule.connections.map((connection) => (
                      <Badge variant="outline" key={connection.id}>
                        {connection.name}
                      </Badge>
                    ))}
                    {!rule.connections.length && (
                      <p className="text-sm text-muted-foreground">No connections</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              {rule.variablePattern && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Variable Pattern</p>
                  <p className="text-sm font-mono mt-1 bg-muted p-1 rounded">
                    {rule.variablePattern}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
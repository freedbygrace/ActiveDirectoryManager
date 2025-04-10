import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Save, Trash, Code, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import ConditionBuilder from "./condition-builder";

// Define the schema for rule form
const ruleFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  targetGroup: z.string().min(1, "Target group is required"),
  enabled: z.boolean().default(true),
  schedule: z.string().min(1, "Schedule is required"),
  variablePattern: z.string().optional(),
  connectionIds: z.array(z.number()).min(1, "At least one connection is required"),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

interface Condition {
  id: number;
  type: "condition" | "group";
  parentId: number | null;
  operator: string;
  attribute?: string;
  value?: string;
  position: number;
  children?: Condition[];
}

interface Connection {
  id: number;
  name: string;
  server: string;
}

interface DynamicGroupRule {
  id?: number;
  name: string;
  description: string | null;
  targetGroup: string;
  enabled: boolean;
  schedule: string;
  variablePattern: string | null;
  connectionIds: number[];
  conditions: Condition[];
}

interface RuleEditorProps {
  ruleId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function RuleEditor({ ruleId, onSuccess, onCancel }: RuleEditorProps) {
  const { toast } = useToast();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [activeTab, setActiveTab] = useState("general");
  const isEditMode = !!ruleId;

  // Fetch connections for dropdown
  const { data: connections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ["/api/ldap-connections"],
    retry: false,
  });

  // Fetch rule data if editing
  const { data: ruleData, isLoading: isLoadingRule } = useQuery({
    queryKey: ["/api/dynamic-group-rules", ruleId],
    enabled: !!ruleId,
    retry: false,
  });

  // Form setup
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: "",
      description: "",
      targetGroup: "",
      enabled: true,
      schedule: "0 0 * * *", // Daily at midnight
      variablePattern: "",
      connectionIds: [],
    },
  });

  // Update form when rule data is loaded
  useEffect(() => {
    if (ruleData) {
      form.reset({
        name: ruleData.name,
        description: ruleData.description || "",
        targetGroup: ruleData.targetGroup,
        enabled: ruleData.enabled,
        schedule: ruleData.schedule,
        variablePattern: ruleData.variablePattern || "",
        connectionIds: ruleData.connections.map((c: any) => c.id),
      });
      setConditions(ruleData.conditions || []);
    }
  }, [ruleData, form]);

  // Create/Update rule mutation
  const saveMutation = useMutation({
    mutationFn: async (data: DynamicGroupRule) => {
      const url = isEditMode 
        ? `/api/dynamic-group-rules/${ruleId}` 
        : `/api/dynamic-group-rules`;
      const method = isEditMode ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Rule ${isEditMode ? "updated" : "created"} successfully`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dynamic-group-rules"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? "update" : "create"} rule: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: RuleFormValues) => {
    const ruleData: DynamicGroupRule = {
      ...values,
      conditions,
    };
    saveMutation.mutate(ruleData);
  };

  // Update conditions handler
  const handleConditionsUpdate = (updatedConditions: Condition[]) => {
    setConditions(updatedConditions);
  };

  // Loading state
  const isLoading = isLoadingConnections || (isEditMode && isLoadingRule);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="general" className="space-y-4 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Rule Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Basic rule information */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rule Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter rule name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Optional description of what this rule does" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="targetGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Group (DN)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Distinguished Name of the target group" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Members matching the conditions will be added to this group
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="connectionIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>LDAP Connections</FormLabel>
                          <div className="space-y-2">
                            {connections && connections.map((connection: Connection) => (
                              <div key={connection.id} className="flex items-center space-x-2">
                                <Controller
                                  control={form.control}
                                  name="connectionIds"
                                  render={({ field }) => (
                                    <Checkbox
                                      id={`connection-${connection.id}`}
                                      checked={field.value?.includes(connection.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          const newValue = [...(field.value || []), connection.id];
                                          field.onChange(newValue);
                                        } else {
                                          const newValue = field.value?.filter((id) => id !== connection.id);
                                          field.onChange(newValue);
                                        }
                                      }}
                                    />
                                  )}
                                />
                                <Label htmlFor={`connection-${connection.id}`}>
                                  {connection.name} <span className="text-muted-foreground">({connection.server})</span>
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormDescription>
                            Select the LDAP connections this rule should apply to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="schedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule (Cron Format)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            When to run this rule (e.g., "0 0 * * *" for daily at midnight)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="variablePattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variable Pattern (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="{{department}}-Users" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Pattern for dynamic group naming with variable substitution
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Enabled
                            </FormLabel>
                            <FormDescription>
                              Enable or disable this rule from running
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="conditions" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rule Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConditionBuilder 
                    conditions={conditions}
                    onChange={handleConditionsUpdate}
                    connections={connections || []}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>LDAP Filter Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
                    {/* This would show the actual LDAP filter generated from the conditions */}
                    {conditions.length ? (
                      <pre>(&(objectClass=user)(memberOf=CN=Domain Users,CN=Users,DC=example,DC=com))</pre>
                    ) : (
                      <p className="text-muted-foreground">No conditions defined yet. Add conditions to see the preview.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}
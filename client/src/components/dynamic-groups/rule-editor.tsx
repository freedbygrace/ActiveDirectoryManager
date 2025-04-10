import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  Info, 
  Clock, 
  Settings, 
  ListFilter, 
  EyeIcon, 
  CalendarDays,
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';

import { DynamicGroupRule, LdapConnection } from '@shared/schema';
import CronJobBuilder, { ScheduleItem } from './cron-job-builder';
import ConditionBuilder from './condition-builder';
import VariableSelector from './variable-selector';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';

export interface Condition {
  id?: number;
  ruleId?: number;
  parentId?: number | null;
  attribute: string;
  customAttribute?: string;
  operator: string;
  value: string;
  logicalOperator?: string | null;
  isGroup?: boolean;
}

interface RuleEditorProps {
  rule?: DynamicGroupRule;
  onSave: (rule: DynamicGroupRule, schedules: ScheduleItem[]) => void;
  onCancel: () => void;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({ rule, onSave, onCancel }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    targetGroupName: string;
    targetOU: string;
    createGroupIfNotExists: boolean;
    createOUIfNotExists: boolean;
    createGroupForEachAttributeValue: boolean;
    createOUForEachAttributeValue: boolean;
    enabled: boolean;
    variablePattern: string;
    connections: number[];
  }>({
    name: rule?.name || '',
    description: rule?.description || '',
    targetGroupName: rule?.targetGroup ? rule?.targetGroup.split(',')[0].replace('CN=', '') : '',
    targetOU: rule?.targetGroup ? rule?.targetGroup.split(',').slice(1).join(',') : '',
    createGroupIfNotExists: rule?.createGroupIfNotExists || false,
    createOUIfNotExists: rule?.createOUIfNotExists || false,
    createGroupForEachAttributeValue: rule?.createGroupForEachAttributeValue || false,
    createOUForEachAttributeValue: rule?.createOUForEachAttributeValue || false,
    enabled: rule?.enabled ?? true,
    variablePattern: rule?.variablePattern || '',
    connections: rule?.connectionIds || []
  });
  
  // Load LDAP connections
  const { data: ldapConnections = [] } = useQuery<LdapConnection[]>({
    queryKey: ['/api/ldap-connections'],
    staleTime: 60000,
  });

  // Load conditions for the rule if editing
  const { data: conditionsData } = useQuery<Condition[]>({
    queryKey: ['/api/dynamic-group-rules', rule?.id, 'conditions'],
    enabled: !!rule?.id,
    staleTime: 60000,
  });

  // Load schedules for the rule if editing
  const { data: schedulesData } = useQuery<ScheduleItem[]>({
    queryKey: ['/api/dynamic-group-rules', rule?.id, 'schedules'],
    enabled: !!rule?.id,
    staleTime: 60000,
  });

  // Initialize conditions and schedules when data loads
  useEffect(() => {
    if (conditionsData) {
      setConditions(conditionsData);
    }
  }, [conditionsData]);

  useEffect(() => {
    if (schedulesData) {
      setSchedules(schedulesData);
    }
  }, [schedulesData]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle toggle changes
  const handleToggleChange = (field: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle connection selection
  const handleConnectionChange = (connectionIds: number[]) => {
    setFormData(prev => ({ ...prev, connections: connectionIds }));
  };

  // Compute the full target group DN
  // Get the rootDSE string based on the first selected LDAP connection
  const getRootDSE = () => {
    if (!formData.connections || formData.connections.length === 0) {
      return "DC=example,DC=com"; // Default if no connection selected
    }
    
    const selectedConnection = ldapConnections.find(conn => 
      formData.connections.includes(conn.id)
    );
    
    if (!selectedConnection || !selectedConnection.domain) {
      return "DC=example,DC=com"; // Fallback if no domain info
    }
    
    const domainParts = selectedConnection.domain.split('.');
    return domainParts.map(part => `DC=${part}`).join(',');
  };
  
  // Ensure OU path has rootDSE appended
  const ensureRootDSE = (ouPath: string) => {
    if (!ouPath) return '';
    
    // Check if the path already contains DC=
    if (ouPath.includes('DC=')) {
      return ouPath;
    }
    
    // Ensure a comma between the OU path and rootDSE if needed
    const separator = ouPath.endsWith(',') ? '' : ',';
    return `${ouPath}${separator}${getRootDSE()}`;
  };

  const getTargetGroupDN = () => {
    if (!formData.targetGroupName || !formData.targetOU) return '';
    
    // Ensure targetOU has rootDSE
    const fullOU = ensureRootDSE(formData.targetOU);
    return `CN=${formData.targetGroupName},${fullOU}`;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!formData.name) {
      toast({
        title: "Missing Information",
        description: "Please provide a name for the rule",
        variant: "destructive"
      });
      setActiveTab('general');
      return;
    }

    if (!formData.targetGroupName) {
      toast({
        title: "Missing Information",
        description: "Please specify a target AD group name",
        variant: "destructive"
      });
      setActiveTab('general');
      return;
    }

    if (!formData.targetOU) {
      toast({
        title: "Missing Information",
        description: "Please specify the organizational unit for the target group",
        variant: "destructive"
      });
      setActiveTab('general');
      return;
    }

    if (formData.connections.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one LDAP connection",
        variant: "destructive"
      });
      setActiveTab('general');
      return;
    }

    if (conditions.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please define at least one condition",
        variant: "destructive"
      });
      setActiveTab('conditions');
      return;
    }

    if (schedules.length === 0) {
      toast({
        title: "Missing Information", 
        description: "Please define at least one schedule",
        variant: "destructive"
      });
      setActiveTab('schedules');
      return;
    }

    const targetGroupDN = getTargetGroupDN();
    
    const ruleData: DynamicGroupRule = {
      id: rule?.id,
      name: formData.name,
      description: formData.description || null,
      targetGroup: targetGroupDN,
      enabled: formData.enabled,
      createdAt: rule?.createdAt || new Date(),
      updatedAt: new Date(),
      lastRun: rule?.lastRun || null,
      lastRunStatus: rule?.lastRunStatus || null,
      variablePattern: formData.variablePattern || null,
      connectionIds: formData.connections,
      createGroupIfNotExists: formData.createGroupIfNotExists,
      createOUIfNotExists: formData.createOUIfNotExists,
      createGroupForEachAttributeValue: formData.createGroupForEachAttributeValue,
      createOUForEachAttributeValue: formData.createOUForEachAttributeValue
    };

    onSave(ruleData, schedules);
  };

  // Test the rule
  const testRuleMutation = useMutation({
    mutationFn: async () => {
      const targetGroupDN = getTargetGroupDN();
      const res = await apiRequest('POST', '/api/dynamic-group-rules/test', {
        rule: {
          name: formData.name,
          targetGroup: targetGroupDN,
          connectionIds: formData.connections,
          variablePattern: formData.variablePattern || null,
          createGroupIfNotExists: formData.createGroupIfNotExists,
          createOUIfNotExists: formData.createOUIfNotExists,
          createGroupForEachAttributeValue: formData.createGroupForEachAttributeValue,
          createOUForEachAttributeValue: formData.createOUForEachAttributeValue
        },
        conditions
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Results",
        description: `The rule would match ${data.matchCount} objects`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleTest = () => {
    if (formData.connections.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one LDAP connection to test",
        variant: "destructive"
      });
      return;
    }

    if (conditions.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please define at least one condition to test",
        variant: "destructive"
      });
      return;
    }

    testRuleMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 md:w-[500px] mb-8">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="conditions" className="flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            <span className="hidden sm:inline">Conditions</span>
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Schedules</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <EyeIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Rule Settings</CardTitle>
              <CardDescription>Configure the basic settings for your dynamic group rule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>LDAP Connections <span className="text-destructive">*</span></Label>
                <div className="border rounded-md p-4 space-y-2">
                  {ldapConnections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No LDAP connections available. Please create one first.</p>
                  ) : (
                    <div className="space-y-2">
                      {ldapConnections.map((connection) => (
                        <div key={connection.id} className="flex items-center space-x-2">
                          <Switch 
                            id={`connection-${connection.id}`}
                            checked={formData.connections.includes(connection.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleConnectionChange([...formData.connections, connection.id]);
                              } else {
                                handleConnectionChange(formData.connections.filter(id => id !== connection.id));
                              }
                            }}
                          />
                          <Label htmlFor={`connection-${connection.id}`}>
                            {connection.name} ({connection.server})
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select one or more LDAP connections to search for objects
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    placeholder="Enter rule name" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    value={formData.description} 
                    onChange={handleInputChange} 
                    placeholder="Enter rule description" 
                    rows={2} 
                  />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <h3 className="text-md font-medium mb-2">Target AD Group</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="targetOU">Organizational Unit <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input 
                      id="targetOU" 
                      name="targetOU" 
                      value={formData.targetOU} 
                      onChange={handleInputChange} 
                      className="pr-24"
                      placeholder="OU=Groups,DC=example,DC=com" 
                    />
                    <div className="absolute right-1 top-1">
                      <VariableSelector 
                        onSelectVariable={(variable) => {
                          // Direct insertion of variable or prefixed OU segment
                          const currentValue = formData.targetOU || '';
                          // Check if this is a variable or a direct DC value
                          const newValue = variable.startsWith("DC=") || variable.startsWith("OU=") 
                            ? (currentValue && !currentValue.endsWith(",") ? currentValue + "," : currentValue) + variable 
                            : currentValue + variable;
                          setFormData({ ...formData, targetOU: newValue });
                        }}
                        connections={formData.connections}
                        isForOU={true}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The OU where the group belongs (can include variables like {'{attributeName}'})
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="createOUIfNotExists"
                    checked={formData.createOUIfNotExists}
                    onCheckedChange={(checked) => handleToggleChange('createOUIfNotExists', checked)}
                  />
                  <Label htmlFor="createOUIfNotExists">Create OU if it doesn't exist</Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="targetGroupName">Group Name <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <span className="py-2 px-3 bg-muted text-muted-foreground rounded-l-md border">CN=</span>
                    <div className="relative flex-1">
                      <Input 
                        id="targetGroupName" 
                        name="targetGroupName" 
                        value={formData.targetGroupName} 
                        onChange={handleInputChange}
                        className="rounded-l-none pr-24"
                        placeholder="GroupName" 
                      />
                      <div className="absolute right-1 top-1">
                        <VariableSelector 
                          onSelectVariable={(variable) => {
                            const variableText = `{${variable}}`;
                            const currentValue = formData.targetGroupName || '';
                            const newValue = currentValue + variableText;
                            setFormData({ ...formData, targetGroupName: newValue });
                          }}
                          connections={formData.connections}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Name of the group (can include variables like {'{attributeName}'})
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="createGroupIfNotExists"
                    checked={formData.createGroupIfNotExists}
                    onCheckedChange={(checked) => handleToggleChange('createGroupIfNotExists', checked)}
                  />
                  <Label htmlFor="createGroupIfNotExists">Create group if it doesn't exist</Label>
                </div>
              </div>
              
              <div className="mt-4 space-y-2 border rounded-md p-4 bg-muted/30">
                <h4 className="text-sm font-medium">Advanced Options</h4>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="createGroupForEachAttributeValue"
                    checked={formData.createGroupForEachAttributeValue}
                    onCheckedChange={(checked) => handleToggleChange('createGroupForEachAttributeValue', checked)}
                  />
                  <Label htmlFor="createGroupForEachAttributeValue">
                    Automatically create a group for each distinct attribute value
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, the system will automatically create separate groups for each distinct attribute value
                  used in the group name variables
                </p>
                
                <div className="flex items-center space-x-2 mt-4">
                  <Switch 
                    id="createOUForEachAttributeValue"
                    checked={formData.createOUForEachAttributeValue}
                    onCheckedChange={(checked) => handleToggleChange('createOUForEachAttributeValue', checked)}
                  />
                  <Label htmlFor="createOUForEachAttributeValue">
                    Automatically create OUs for each distinct attribute value
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, the system will automatically create separate organizational units for each distinct attribute value
                  used in the OU path variables
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => handleToggleChange('enabled', checked)}
                />
                <Label htmlFor="enabled">Enable Rule</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conditions Tab */}
        <TabsContent value="conditions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Rule Conditions</CardTitle>
              <CardDescription>
                Define the conditions that determine which objects will be included in the dynamic group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConditionBuilder 
                conditions={conditions} 
                onChange={setConditions}
                connections={formData.connections}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Rule Schedules</CardTitle>
              <CardDescription>
                Configure when this rule should run to update the dynamic group membership
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CronJobBuilder 
                schedules={schedules}
                onSchedulesChange={setSchedules}
                ruleId={rule?.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Rule Preview</CardTitle>
              <CardDescription>
                Review your dynamic group rule configuration before saving
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">General Information</h3>
                    <Separator className="my-2" />
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Name:</dt>
                        <dd className="text-sm">{formData.name || 'Not set'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Target Group:</dt>
                        <dd className="text-sm max-w-[250px] truncate" title={getTargetGroupDN()}>
                          {getTargetGroupDN() || 'Not set'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Create group if not exists:</dt>
                        <dd className="text-sm">
                          {formData.createGroupIfNotExists ? 'Yes' : 'No'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Create OU if not exists:</dt>
                        <dd className="text-sm">
                          {formData.createOUIfNotExists ? 'Yes' : 'No'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Create groups per attribute value:</dt>
                        <dd className="text-sm">
                          {formData.createGroupForEachAttributeValue ? 'Yes' : 'No'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Create OUs per attribute value:</dt>
                        <dd className="text-sm">
                          {formData.createOUForEachAttributeValue ? 'Yes' : 'No'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Status:</dt>
                        <dd className="text-sm">
                          {formData.enabled ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Disabled
                            </Badge>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Connections:</dt>
                        <dd className="text-sm">
                          {formData.connections.length === 0 ? (
                            <span className="text-destructive">None selected</span>
                          ) : (
                            <span>{formData.connections.length} connection(s)</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Variable Pattern:</dt>
                        <dd className="text-sm">{formData.variablePattern || 'None'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium">Schedules</h3>
                    <Separator className="my-2" />
                    {schedules.length === 0 ? (
                      <p className="text-sm text-destructive">No schedules defined</p>
                    ) : (
                      <ul className="space-y-2">
                        {schedules.map((schedule, index) => (
                          <li key={index} className="text-sm flex items-center space-x-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {schedule.name}: {schedule.description}
                              {!schedule.enabled && (
                                <Badge variant="outline" className="ml-2 text-xs">Disabled</Badge>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Conditions</h3>
                    <Separator className="my-2" />
                    {conditions.length === 0 ? (
                      <p className="text-sm text-destructive">No conditions defined</p>
                    ) : (
                      <div className="border rounded-md p-3 bg-muted/50">
                        <p className="text-sm font-mono overflow-auto whitespace-pre-wrap">
                          {/* Simplified visualization - in a real implementation, you'd want to render the actual LDAP filter */}
                          {`(& ${conditions.map((c) => 
                            c.isGroup 
                              ? `(${c.logicalOperator === 'AND' ? '&' : '|'} ...)`
                              : `(${c.attribute} ${c.operator} ${c.value})`
                          ).join(' ')})`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium">Description</h3>
                    <Separator className="my-2" />
                    <p className="text-sm">{formData.description || 'No description provided'}</p>
                  </div>

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleTest}
                      disabled={
                        testRuleMutation.isPending || 
                        conditions.length === 0 || 
                        formData.connections.length === 0
                      }
                    >
                      {testRuleMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Test Rule
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {rule ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </div>
  );
};

export default RuleEditor;
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LdapConnection } from "@shared/schema";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import shared types from our shared lib
import { LdapOperator, LdapCondition, LdapAttribute } from "@/lib/ldap-types";

export type LdapQueryBuilderParams = {
  targetObject: "users" | "groups" | "computers" | "ous";
  filter: LdapCondition;
};

// Used for displaying the operators in the UI
const operatorLabels: Record<LdapOperator, string> = {
  [LdapOperator.AND]: "AND (All conditions)",
  [LdapOperator.OR]: "OR (Any condition)",
  [LdapOperator.NOT]: "NOT",
  [LdapOperator.EQUALS]: "Equals",
  [LdapOperator.NOT_EQUALS]: "Does not equal",
  [LdapOperator.STARTS_WITH]: "Starts with",
  [LdapOperator.ENDS_WITH]: "Ends with",
  [LdapOperator.CONTAINS]: "Contains",
  [LdapOperator.GREATER_THAN]: "Greater than",
  [LdapOperator.LESS_THAN]: "Less than",
  [LdapOperator.PRESENT]: "Has value (attribute exists)",
  [LdapOperator.APPROX]: "Approximately equals",
};

// Group operators by type for the UI
const logicalOperators = [LdapOperator.AND, LdapOperator.OR, LdapOperator.NOT];
const comparisonOperators = [
  LdapOperator.EQUALS,
  LdapOperator.NOT_EQUALS,
  LdapOperator.STARTS_WITH,
  LdapOperator.ENDS_WITH,
  LdapOperator.CONTAINS,
  LdapOperator.GREATER_THAN,
  LdapOperator.LESS_THAN,
  LdapOperator.PRESENT,
  LdapOperator.APPROX,
];

interface LdapQueryBuilderProps {
  connections: LdapConnection[];
  value: LdapQueryBuilderParams;
  onChange: (value: LdapQueryBuilderParams) => void;
  onTest?: () => void;
  onSave?: () => void;
}

export function EnhancedLdapQueryBuilder({ 
  connections, 
  value, 
  onChange,
  onTest,
  onSave
}: LdapQueryBuilderProps) {
  const { toast } = useToast();
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(
    connections.length > 0 ? connections[0].id : null
  );

  // Load available attributes based on connection and object type
  const { data: availableAttributes = [], isLoading: isLoadingAttributes } = useQuery<LdapAttribute[]>({
    queryKey: ["/api/ldap-queries/attributes", { connectionId: selectedConnectionId, targetObject: value.targetObject }],
    enabled: !!selectedConnectionId && !!value.targetObject,
  });

  // Group attributes by their type for better organization
  const groupedAttributes = React.useMemo(() => {
    const grouped = {
      string: availableAttributes.filter(attr => !attr.type || attr.type === "string"),
      number: availableAttributes.filter(attr => attr.type === "number"),
      datetime: availableAttributes.filter(attr => attr.type === "datetime"),
      boolean: availableAttributes.filter(attr => attr.type === "boolean"),
    };
    
    return grouped;
  }, [availableAttributes]);

  // Update the selected connection ID if the connections list changes
  useEffect(() => {
    if (connections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId]);

  // Handle changes to the query target object type
  const handleTargetObjectChange = (targetObject: "users" | "groups" | "computers" | "ous") => {
    onChange({
      ...value,
      targetObject,
    });
  };

  // Handle updates to a condition
  const handleConditionChange = (
    condition: LdapCondition,
    path: number[] = []
  ): LdapCondition => {
    if (path.length === 0) {
      return condition;
    }

    const [index, ...restPath] = path;
    const updatedConditions = [...(value.filter.conditions || [])];
    
    if (restPath.length === 0) {
      updatedConditions[index] = condition;
    } else {
      updatedConditions[index] = handleConditionChange(
        updatedConditions[index],
        restPath
      );
    }

    return {
      ...value.filter,
      conditions: updatedConditions,
    };
  };

  // Add a new condition to a logical operator
  const handleAddCondition = (path: number[] = []) => {
    let currentCondition = value.filter;
    let parent = currentCondition;
    
    // Navigate to the target condition
    for (const index of path) {
      if (!currentCondition.conditions) {
        currentCondition.conditions = [];
      }
      parent = currentCondition;
      currentCondition = currentCondition.conditions[index];
    }
    
    // Add a new condition
    if (!parent.conditions) {
      parent.conditions = [];
    }
    
    parent.conditions.push({
      operator: LdapOperator.EQUALS,
      attribute: availableAttributes.length > 0 ? availableAttributes[0].name : undefined,
      value: "",
    });
    
    onChange({ ...value });
  };

  // Remove a condition
  const handleRemoveCondition = (path: number[]) => {
    if (path.length === 0) return;
    
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    
    let currentCondition = value.filter;
    
    // Navigate to the parent condition
    for (const idx of parentPath) {
      if (!currentCondition.conditions) return;
      currentCondition = currentCondition.conditions[idx];
    }
    
    // Remove the condition
    if (currentCondition.conditions) {
      currentCondition.conditions = currentCondition.conditions.filter((_, i) => i !== index);
      onChange({ ...value });
    }
  };

  // Get recommended operators based on attribute type
  const getRecommendedOperators = (attributeName: string | undefined): LdapOperator[] => {
    if (!attributeName) return comparisonOperators;
    
    const attribute = availableAttributes.find(attr => attr.name === attributeName);
    if (!attribute) return comparisonOperators;
    
    // Return appropriate operators based on type
    switch(attribute.type) {
      case "number":
        return [
          LdapOperator.EQUALS,
          LdapOperator.NOT_EQUALS,
          LdapOperator.GREATER_THAN,
          LdapOperator.LESS_THAN,
          LdapOperator.PRESENT
        ];
      case "datetime":
        return [
          LdapOperator.EQUALS,
          LdapOperator.NOT_EQUALS,
          LdapOperator.GREATER_THAN,
          LdapOperator.LESS_THAN,
          LdapOperator.PRESENT
        ];
      case "boolean":
        return [
          LdapOperator.EQUALS,
          LdapOperator.NOT_EQUALS,
          LdapOperator.PRESENT
        ];
      default: // string
        return [
          LdapOperator.EQUALS,
          LdapOperator.NOT_EQUALS,
          LdapOperator.STARTS_WITH,
          LdapOperator.ENDS_WITH,
          LdapOperator.CONTAINS,
          LdapOperator.PRESENT,
          LdapOperator.APPROX
        ];
    }
  };

  // UI component for rendering a single condition
  const ConditionItem = ({ 
    condition, 
    path = [] 
  }: { 
    condition: LdapCondition;
    path: number[];
  }) => {
    const isLogical = logicalOperators.includes(condition.operator);
    const selectedAttribute = availableAttributes.find(attr => attr.name === condition.attribute);
    const recommendedOperators = !isLogical ? getRecommendedOperators(condition.attribute) : [];
    
    return (
      <div className="p-4 border rounded-md mb-2">
        <div className="flex flex-wrap gap-2 mb-2">
          <Select
            value={condition.operator}
            onValueChange={(newValue) => {
              const updatedCondition = { ...condition, operator: newValue as LdapOperator };
              
              // Reset attributes and values when switching between logical and comparison
              const wasLogical = logicalOperators.includes(condition.operator);
              const isNowLogical = logicalOperators.includes(updatedCondition.operator);
              
              if (wasLogical !== isNowLogical) {
                if (isNowLogical) {
                  delete updatedCondition.attribute;
                  delete updatedCondition.value;
                  updatedCondition.conditions = [];
                } else {
                  delete updatedCondition.conditions;
                  updatedCondition.attribute = availableAttributes.length > 0 ? availableAttributes[0].name : undefined;
                  updatedCondition.value = "";
                }
              }
              
              const newFilter = handleConditionChange(updatedCondition, path);
              onChange({ ...value, filter: newFilter });
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="group" disabled className="font-semibold">
                Logical Operators
              </SelectItem>
              {logicalOperators.map((op) => (
                <SelectItem key={op} value={op}>
                  {operatorLabels[op]}
                </SelectItem>
              ))}
              
              {!isLogical && condition.attribute && (
                <SelectItem value="divider" disabled className="font-semibold">
                  Recommended Operators
                </SelectItem>
              )}
              
              {!isLogical && condition.attribute && recommendedOperators.map((op) => (
                <SelectItem key={op} value={op} className="text-primary">
                  {operatorLabels[op]}
                </SelectItem>
              ))}
              
              <SelectItem value="divider2" disabled className="font-semibold">
                All Comparison Operators
              </SelectItem>
              {comparisonOperators.map((op) => (
                <SelectItem key={op} value={op}>
                  {operatorLabels[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {!isLogical && (
            <>
              <Select
                value={condition.attribute}
                onValueChange={(newValue) => {
                  const updatedCondition = { ...condition, attribute: newValue };
                  const newFilter = handleConditionChange(updatedCondition, path);
                  onChange({ ...value, filter: newFilter });
                }}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select attribute" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {isLoadingAttributes ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading attributes...
                    </div>
                  ) : availableAttributes.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No attributes available
                    </SelectItem>
                  ) : (
                    <>
                      {/* String attributes */}
                      {groupedAttributes.string.length > 0 && (
                        <>
                          <SelectItem value="string_group" disabled className="font-semibold">
                            Text Attributes
                          </SelectItem>
                          {groupedAttributes.string.map((attr) => (
                            <SelectItem key={attr.name} value={attr.name}>
                              <div className="flex items-center justify-between w-full">
                                <span>{attr.name}</span>
                                <div className="flex items-center">
                                  {attr.isMultiValued && (
                                    <Badge variant="outline" className="text-xs ml-2">
                                      Multi
                                    </Badge>
                                  )}
                                  {attr.description && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-3 w-3 ml-2 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                          <p className="max-w-[300px]">{attr.description}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {/* Number attributes */}
                      {groupedAttributes.number.length > 0 && (
                        <>
                          <SelectItem value="number_group" disabled className="font-semibold">
                            Number Attributes
                          </SelectItem>
                          {groupedAttributes.number.map((attr) => (
                            <SelectItem key={attr.name} value={attr.name}>
                              <div className="flex items-center justify-between w-full">
                                <span>{attr.name}</span>
                                <div className="flex items-center">
                                  {attr.isMultiValued && (
                                    <Badge variant="outline" className="text-xs ml-2">
                                      Multi
                                    </Badge>
                                  )}
                                  {attr.description && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-3 w-3 ml-2 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                          <p className="max-w-[300px]">{attr.description}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {/* DateTime attributes */}
                      {groupedAttributes.datetime.length > 0 && (
                        <>
                          <SelectItem value="date_group" disabled className="font-semibold">
                            Date/Time Attributes
                          </SelectItem>
                          {groupedAttributes.datetime.map((attr) => (
                            <SelectItem key={attr.name} value={attr.name}>
                              <div className="flex items-center justify-between w-full">
                                <span>{attr.name}</span>
                                <div className="flex items-center">
                                  {attr.isMultiValued && (
                                    <Badge variant="outline" className="text-xs ml-2">
                                      Multi
                                    </Badge>
                                  )}
                                  {attr.description && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-3 w-3 ml-2 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                          <p className="max-w-[300px]">{attr.description}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {/* Boolean attributes */}
                      {groupedAttributes.boolean.length > 0 && (
                        <>
                          <SelectItem value="boolean_group" disabled className="font-semibold">
                            Boolean Attributes
                          </SelectItem>
                          {groupedAttributes.boolean.map((attr) => (
                            <SelectItem key={attr.name} value={attr.name}>
                              <div className="flex items-center justify-between w-full">
                                <span>{attr.name}</span>
                                <div className="flex items-center">
                                  {attr.isMultiValued && (
                                    <Badge variant="outline" className="text-xs ml-2">
                                      Multi
                                    </Badge>
                                  )}
                                  {attr.description && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="h-3 w-3 ml-2 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                          <p className="max-w-[300px]">{attr.description}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
              
              {condition.operator !== LdapOperator.PRESENT && (
                <Input
                  value={condition.value || ""}
                  placeholder={selectedAttribute?.type === "datetime" ? "YYYY-MM-DD" : "Value"}
                  className="flex-1"
                  onChange={(e) => {
                    const updatedCondition = { ...condition, value: e.target.value };
                    const newFilter = handleConditionChange(updatedCondition, path);
                    onChange({ ...value, filter: newFilter });
                  }}
                />
              )}
            </>
          )}
          
          {path.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleRemoveCondition(path)}
            >
              <Trash className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
        
        {isLogical && (
          <div className="pl-4 border-l-2 border-dashed border-muted-foreground/30">
            {condition.conditions?.map((childCondition, index) => (
              <ConditionItem
                key={index}
                condition={childCondition}
                path={[...path, index]}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddCondition(path)}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>LDAP Query Builder</CardTitle>
        <CardDescription>
          Build LDAP queries with a visual interface
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="connection">LDAP Connection</Label>
              <Select
                value={selectedConnectionId?.toString() || ""}
                onValueChange={(value) => setSelectedConnectionId(parseInt(value))}
                disabled={connections.length === 0}
              >
                <SelectTrigger id="connection">
                  <SelectValue placeholder="Select LDAP connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No connections available
                    </SelectItem>
                  ) : (
                    connections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id.toString()}>
                        {connection.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="targetObject">Target Object Type</Label>
              <Select
                value={value.targetObject}
                onValueChange={(value) => 
                  handleTargetObjectChange(value as "users" | "groups" | "computers" | "ous")}
              >
                <SelectTrigger id="targetObject">
                  <SelectValue placeholder="Select object type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="groups">Groups</SelectItem>
                  <SelectItem value="computers">Computers</SelectItem>
                  <SelectItem value="ous">Organizational Units</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label className="mb-2 block">Build Filter</Label>
            <Tabs defaultValue="builder" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="builder">Visual Builder</TabsTrigger>
                <TabsTrigger value="preview">LDAP Filter Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="builder" className="p-0">
                <ConditionItem condition={value.filter} path={[]} />
              </TabsContent>
              <TabsContent value="preview" className="p-0">
                <div className="p-4 bg-muted rounded-md font-mono text-sm overflow-auto">
                  <pre>
                    {JSON.stringify(value.filter, null, 2)}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {availableAttributes.length > 0 && (
            <div>
              <Label className="mb-2 block">Available Attributes</Label>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 border rounded-md">
                {availableAttributes.map((attr) => (
                  <TooltipProvider key={attr.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className={`cursor-pointer ${
                            attr.type === 'number' 
                              ? 'bg-blue-50 dark:bg-blue-950' 
                              : attr.type === 'datetime' 
                                ? 'bg-amber-50 dark:bg-amber-950' 
                                : attr.type === 'boolean' 
                                  ? 'bg-green-50 dark:bg-green-950' 
                                  : ''
                          }`}
                        >
                          {attr.name}
                          {attr.isMultiValued && <span className="ml-1 opacity-70">*</span>}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div>
                          <p className="font-bold">{attr.name}</p>
                          {attr.description && <p>{attr.description}</p>}
                          <p className="text-xs mt-1">Type: {attr.type || 'string'}</p>
                          {attr.isMultiValued && (
                            <p className="text-xs">Multi-valued attribute</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {onTest && (
          <Button 
            variant="outline" 
            onClick={onTest}
          >
            Test Query
          </Button>
        )}
        {onSave && (
          <Button 
            onClick={onSave}
          >
            Save Query
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
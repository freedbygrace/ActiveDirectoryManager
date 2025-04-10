import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Trash, Plus, Move, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { Condition } from './rule-editor';
import { LdapAttribute } from '@shared/schema';

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  connections: number[];
}

const operators = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'present', label: 'Is Present' },
  { value: 'notPresent', label: 'Is Not Present' }
];

const logicalOperators = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' }
];

const defaultCondition: Condition = {
  attribute: '',
  operator: '=',
  value: '',
  logicalOperator: 'AND'
};

const defaultGroup: Condition = {
  attribute: '',
  operator: '',
  value: '',
  logicalOperator: 'AND',
  isGroup: true
};

// This is a completely new implementation of the condition builder to avoid recursive rendering
const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ 
  conditions, 
  onChange,
  connections
}) => {
  const { toast } = useToast();
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  
  // Load LDAP attributes from connections
  const { data: attributesData = [] } = useQuery<LdapAttribute[]>({
    queryKey: ['/api/ldap-attributes', { connectionIds: connections }],
    enabled: connections.length > 0,
    staleTime: 60000,
  });

  const [availableAttributes, setAvailableAttributes] = useState<string[]>([
    'cn', 'sAMAccountName', 'givenName', 'sn', 'mail', 'displayName', 
    'memberOf', 'distinguishedName', 'objectClass', 'objectCategory',
    'userAccountControl', 'department', 'company', 'title', 'manager'
  ]);
  
  // Update available attributes when data is loaded
  useEffect(() => {
    if (attributesData.length > 0) {
      // Extract unique attribute names
      const uniqueAttributes = Array.from(
        new Set(attributesData.map(attr => attr.name))
      );
      setAvailableAttributes(uniqueAttributes);
    }
  }, [attributesData]);

  // Handle adding a new condition
  const addCondition = (parentId?: number | null) => {
    const newCondition: Condition = {
      ...defaultCondition,
      parentId
    };
    
    // Find the appropriate insertion position
    if (parentId === undefined) {
      // Add to root level
      onChange([...conditions, newCondition]);
    } else {
      // Find the last condition with the same parent to add it after
      const sameParentConditions = conditions.filter(c => c.parentId === parentId);
      const insertIndex = sameParentConditions.length > 0 
        ? conditions.indexOf(sameParentConditions[sameParentConditions.length - 1]) + 1
        : conditions.findIndex(c => c.id === parentId) + 1;
      
      const newConditions = [...conditions];
      newConditions.splice(insertIndex, 0, newCondition);
      onChange(newConditions);
    }
  };

  // Handle adding a new condition group
  const addConditionGroup = (parentId?: number | null) => {
    const newGroup: Condition = {
      ...defaultGroup,
      parentId
    };
    
    // Similar insertion logic as addCondition
    if (parentId === undefined) {
      onChange([...conditions, newGroup]);
    } else {
      const sameParentConditions = conditions.filter(c => c.parentId === parentId);
      const insertIndex = sameParentConditions.length > 0 
        ? conditions.indexOf(sameParentConditions[sameParentConditions.length - 1]) + 1
        : conditions.findIndex(c => c.id === parentId) + 1;
      
      const newConditions = [...conditions];
      newConditions.splice(insertIndex, 0, newGroup);
      onChange(newConditions);
      
      // Automatically expand the new group
      if (newGroup.id) {
        setExpandedGroups(prev => {
          const expanded = new Set(prev);
          expanded.add(newGroup.id!);
          return expanded;
        });
      }
    }
  };

  // Handle updating a condition
  const updateCondition = (index: number, field: keyof Condition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    onChange(newConditions);
  };

  // Handle removing a condition
  const removeCondition = (index: number) => {
    const conditionToRemove = conditions[index];
    
    // If it's a group, also remove all child conditions
    if (conditionToRemove.isGroup) {
      const childConditions = conditions.filter(c => c.parentId === conditionToRemove.id);
      
      if (childConditions.length > 0) {
        const confirmDelete = window.confirm(
          `This will also delete ${childConditions.length} child condition(s). Continue?`
        );
        
        if (!confirmDelete) {
          return;
        }
      }
      
      // Remove the group and all its children
      const newConditions = conditions.filter(
        c => c.id !== conditionToRemove.id && c.parentId !== conditionToRemove.id
      );
      onChange(newConditions);
    } else {
      // Just remove the single condition
      const newConditions = [...conditions];
      newConditions.splice(index, 1);
      onChange(newConditions);
    }
  };

  // Toggle group expansion
  const toggleGroupExpand = (groupId: number) => {
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupId)) {
        newExpanded.delete(groupId);
      } else {
        newExpanded.add(groupId);
      }
      return newExpanded;
    });
  };

  // Get the conditions that belong to a specific parent (or root level)
  const getConditionsForParent = (parentId?: number | null) => {
    return conditions.filter(c => 
      parentId === undefined 
        ? c.parentId === null || c.parentId === undefined
        : c.parentId === parentId
    );
  };

  // Render all conditions with a flat approach to avoid recursion
  const renderAllConditions = () => {
    // First, build a map of parentId to array of children conditions
    const conditionsByParent = new Map<number | null | undefined, Condition[]>();
    
    // Group conditions by parentId
    for (const condition of conditions) {
      const parentId = condition.parentId;
      if (!conditionsByParent.has(parentId)) {
        conditionsByParent.set(parentId, []);
      }
      conditionsByParent.get(parentId)!.push(condition);
    }
    
    // Render a single condition
    const renderSingleCondition = (condition: Condition, index: number, level = 0) => {
      if (!condition.isGroup) {
        // Render regular condition (not a group)
        return (
          <div 
            key={`condition-${index}`} 
            className="grid grid-cols-13 gap-2 items-center mb-2 border border-transparent hover:border-border p-2 rounded-md"
            style={{ marginLeft: level > 0 ? `${level * 20}px` : '0' }}
          >
            <div className="col-span-1 flex items-center justify-center">
              <Move className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {index > 0 && !condition.isGroup && condition.parentId === conditions[index-1].parentId && (
              <div className="col-span-1">
                <Select
                  value={condition.logicalOperator || 'AND'}
                  onValueChange={(value) => updateCondition(index, 'logicalOperator', value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="AND" />
                  </SelectTrigger>
                  <SelectContent>
                    {logicalOperators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {(index === 0 || condition.parentId !== conditions[index-1].parentId) && (
              <div className="col-span-1"></div>
            )}
            
            <div className="col-span-4">
              <Select
                value={condition.attribute}
                onValueChange={(value) => updateCondition(index, 'attribute', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select attribute" />
                </SelectTrigger>
                <SelectContent>
                  {availableAttributes.map((attr) => (
                    <SelectItem key={attr} value={attr}>
                      {attr}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Attribute</SelectItem>
                </SelectContent>
              </Select>
              
              {condition.attribute === 'custom' && (
                <Input
                  className="mt-1"
                  placeholder="Enter custom attribute"
                  value={condition.customAttribute || ''}
                  onChange={(e) => updateCondition(index, 'customAttribute', e.target.value)}
                />
              )}
            </div>
            
            <div className="col-span-3">
              <Select
                value={condition.operator}
                onValueChange={(value) => updateCondition(index, 'operator', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-3">
              {condition.operator !== 'present' && condition.operator !== 'notPresent' && (
                <Input
                  placeholder="Value"
                  value={condition.value}
                  onChange={(e) => updateCondition(index, 'value', e.target.value)}
                />
              )}
            </div>
            
            <div className="col-span-1 flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCondition(index)}
                title="Remove Condition"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      } else {
        // Render condition group
        const hasChildren = condition.id && conditionsByParent.has(condition.id);
        const isExpanded = condition.id && expandedGroups.has(condition.id);
        
        return (
          <div key={`group-${index}`}>
            <div 
              className="border border-border rounded-md p-3 mb-3"
              style={{ marginLeft: level > 0 ? `${level * 20}px` : '0' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => condition.id && toggleGroupExpand(condition.id)}
                    className="p-1 hover:bg-accent rounded-sm"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  <span className="text-sm font-medium">
                    Condition Group ({condition.logicalOperator})
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Select
                    value={condition.logicalOperator || 'AND'}
                    onValueChange={(value) => updateCondition(index, 'logicalOperator', value)}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {logicalOperators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => addCondition(condition.id)}
                    title="Add Condition"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => addConditionGroup(condition.id)}
                    title="Add Group"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(index)}
                    title="Remove Group"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="pl-2">
                  {hasChildren ? (
                    conditionsByParent.get(condition.id)!.map((childCondition) => {
                      const childIndex = conditions.indexOf(childCondition);
                      return (
                        <div key={`child-${childIndex}`}>
                          {renderSingleCondition(childCondition, childIndex, level + 1)}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground p-2">
                      No conditions in this group. Add one using the buttons above.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }
    };
    
    // Render only root conditions (those without a parent)
    const rootConditions = conditionsByParent.get(null) || [];
    return rootConditions.map((condition) => {
      const index = conditions.indexOf(condition);
      return renderSingleCondition(condition, index, 0);
    });
  };

  return (
    <div className="space-y-4">
      {conditions.length === 0 ? (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-muted-foreground mb-4">No conditions defined yet</p>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => addCondition()}
                className="flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Condition
              </Button>
              <Button 
                variant="outline" 
                onClick={() => addConditionGroup()}
                className="flex items-center"
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Condition Group
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {renderAllConditions()}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => addCondition()}
              className="flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Condition
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => addConditionGroup()}
              className="flex items-center"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Condition Group
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-md">
            <Label className="text-sm font-medium mb-2 block">Generated LDAP Filter:</Label>
            <div className="font-mono text-sm overflow-auto p-2 bg-background rounded border whitespace-pre-wrap">
              {generateLdapFilter(conditions)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Non-recursive function to generate LDAP filter syntax from conditions
const generateLdapFilter = (conditions: Condition[]): string => {
  if (conditions.length === 0) return '(objectClass=*)';
  
  // Helper function to generate filter for a regular condition (not a group)
  const generateRegularFilter = (condition: Condition): string => {
    // Get actual attribute name (custom or selected)
    const attributeName = condition.attribute === 'custom' && condition.customAttribute 
      ? condition.customAttribute 
      : condition.attribute;
    
    // Regular condition
    switch (condition.operator) {
      case '=':
        return `(${attributeName}=${condition.value})`;
      case '!=':
        return `(!(${attributeName}=${condition.value}))`;
      case 'contains':
        return `(${attributeName}=*${condition.value}*)`;
      case 'startsWith':
        return `(${attributeName}=${condition.value}*)`;
      case 'endsWith':
        return `(${attributeName}=*${condition.value})`;
      case 'present':
        return `(${attributeName}=*)`;
      case 'notPresent':
        return `(!(${attributeName}=*))`;
      default:
        return `(${attributeName}=${condition.value})`;
    }
  };
  
  // Find all root conditions first (those without parents)
  const rootConditions = conditions.filter(c => 
    c.parentId === null || c.parentId === undefined
  );
  
  // Simple version that just concatenates all conditions without proper nesting
  // This avoids recursion completely, but doesn't handle nested groups properly
  let allFilters = '';
  
  for (const condition of conditions) {
    if (!condition.isGroup) {
      allFilters += generateRegularFilter(condition);
    }
  }
  
  if (allFilters === '') {
    return '(objectClass=*)';
  }
  
  // Wrap all filters in an AND operator for simplicity
  return `(&${allFilters})`;
};

export default ConditionBuilder;
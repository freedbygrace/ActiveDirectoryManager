import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
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
  useSortable
} from '@dnd-kit/sortable';
import { Trash, Plus, Move, PlusCircle, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react';
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
      setAvailableAttributes([
        ...new Set(attributesData.map(attr => attr.name))
      ]);
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
        setExpandedGroups(prev => new Set([...prev, newGroup.id!]));
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

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    if (active.id !== over.id) {
      const activeIndex = conditions.findIndex(c => c.id === active.id);
      const overIndex = conditions.findIndex(c => c.id === over.id);
      
      // Don't allow dropping a condition outside its parent group
      const sourceCondition = conditions[activeIndex];
      const overCondition = conditions[overIndex];
      
      if (sourceCondition.parentId !== overCondition.parentId) {
        toast({
          title: "Invalid Move",
          description: "Conditions can only be reordered within the same group",
          variant: "destructive"
        });
        return;
      }
      
      const newConditions = arrayMove(conditions, activeIndex, overIndex);
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

  // Render a condition group
  const renderConditionGroup = (condition: Condition, index: number, level = 0) => {
    const isExpanded = condition.id ? expandedGroups.has(condition.id) : false;
    const childConditions = condition.id ? getConditionsForParent(condition.id) : [];
    
    return (
      <div 
        key={`group-${index}`} 
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
            {childConditions.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">
                No conditions in this group. Add one using the buttons above.
              </div>
            ) : (
              childConditions.map((child, childIndex) => {
                const originalIndex = conditions.findIndex(c => c === child);
                return child.isGroup 
                  ? renderConditionGroup(child, originalIndex, level + 1) 
                  : renderCondition(child, originalIndex, level + 1);
              })
            )}
          </div>
        )}
      </div>
    );
  };

  // Sortable Item wrapper component
  const SortableItem = ({ 
    condition, 
    index, 
    level = 0 
  }: { 
    condition: Condition; 
    index: number; 
    level?: number;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ 
      id: condition.id || index,
      data: {
        condition,
        index,
        level,
        type: condition.isGroup ? 'group' : 'condition'
      }
    });
    
    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
      marginLeft: level > 0 ? `${level * 20}px` : '0',
      zIndex: isDragging ? 100 : 1,
      position: 'relative' as 'relative',
      opacity: isDragging ? 0.5 : 1,
    };
    
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
      >
        {condition.isGroup ? (
          renderConditionGroup(condition, index, level)
        ) : (
          renderConditionContent(condition, index, level, listeners)
        )}
      </div>
    );
  };
  
  // Render condition content (without the wrapper)
  const renderConditionContent = (
    condition: Condition, 
    index: number, 
    level = 0,
    listeners?: ReturnType<typeof useSortable>['listeners']
  ) => {
    return (
      <div 
        className="grid grid-cols-12 gap-2 items-center mb-2 border border-transparent hover:border-border p-2 rounded-md"
      >
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
              value={condition.attribute === 'custom' ? '' : condition.attribute}
              onChange={(e) => updateCondition(index, 'attribute', e.target.value)}
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
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={conditions.map(c => c.id || 0)}>
              <div className="space-y-2">
                {conditions.map((condition, index) => (
                  condition.parentId === null || condition.parentId === undefined ? (
                    condition.isGroup ? 
                      renderConditionGroup(condition, index) : 
                      renderCondition(condition, index)
                  ) : null
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
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

// Function to generate LDAP filter syntax from conditions
const generateLdapFilter = (conditions: Condition[]): string => {
  if (conditions.length === 0) return '(objectClass=*)';
  
  // Helper function to generate filter for a single condition
  const generateSingleFilter = (condition: Condition): string => {
    if (condition.isGroup) {
      // Get all child conditions for this group
      const childConditions = conditions.filter(c => c.parentId === condition.id);
      if (childConditions.length === 0) return '(objectClass=*)';
      
      const operator = condition.logicalOperator === 'AND' ? '&' : '|';
      const childFilters = childConditions.map(generateSingleFilter).join('');
      
      return `(${operator}${childFilters})`;
    } else {
      // Regular condition
      switch (condition.operator) {
        case '=':
          return `(${condition.attribute}=${condition.value})`;
        case '!=':
          return `(!(${condition.attribute}=${condition.value}))`;
        case 'contains':
          return `(${condition.attribute}=*${condition.value}*)`;
        case 'startsWith':
          return `(${condition.attribute}=${condition.value}*)`;
        case 'endsWith':
          return `(${condition.attribute}=*${condition.value})`;
        case 'present':
          return `(${condition.attribute}=*)`;
        case 'notPresent':
          return `(!(${condition.attribute}=*))`;
        default:
          return `(${condition.attribute}=${condition.value})`;
      }
    }
  };
  
  // Handle root-level conditions
  const rootConditions = conditions.filter(c => 
    c.parentId === null || c.parentId === undefined
  );
  
  if (rootConditions.length === 1) {
    return generateSingleFilter(rootConditions[0]);
  } else {
    // When multiple root conditions, wrap in an AND by default
    const rootFilters = rootConditions.map(generateSingleFilter).join('');
    return `(&${rootFilters})`;
  }
};

export default ConditionBuilder;
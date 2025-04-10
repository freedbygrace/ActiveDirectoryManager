import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash, ArrowRightLeft, MoveVertical, Group, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface LdapAttribute {
  id: number;
  name: string;
  displayName: string | null;
  description: string | null;
  type: string | null;
  multiValued: boolean;
  objectClass: string;
}

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  connections: Connection[];
}

const conditionOperators = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "present", label: "Is Present" },
  { value: "notPresent", label: "Is Not Present" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" },
];

const groupOperators = [
  { value: "and", label: "AND" },
  { value: "or", label: "OR" },
  { value: "not", label: "NOT" },
];

export default function ConditionBuilder({ conditions, onChange, connections }: ConditionBuilderProps) {
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [nextId, setNextId] = useState<number>(1);

  // Ensure we have unique IDs for new conditions
  useEffect(() => {
    if (conditions.length > 0) {
      const maxId = Math.max(...conditions.map(c => c.id)) + 1;
      setNextId(maxId);
    }
  }, [conditions]);

  // Fetch LDAP attributes for the selected connection
  const { data: attributes, isLoading: isLoadingAttributes } = useQuery({
    queryKey: ["/api/ldap-attributes", selectedConnectionId],
    enabled: !!selectedConnectionId,
    retry: false,
  });

  // DnD setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Handle reordering logic here
      const updatedConditions = [...conditions];
      // Implement sorting logic
      onChange(updatedConditions);
    }
  };

  // Add a new condition to the root level
  const addCondition = () => {
    const newCondition: Condition = {
      id: nextId,
      type: "condition",
      parentId: null,
      operator: "equals",
      attribute: "",
      value: "",
      position: conditions.length,
    };
    
    onChange([...conditions, newCondition]);
    setNextId(nextId + 1);
  };

  // Add a new condition group to the root level
  const addGroup = () => {
    const newGroup: Condition = {
      id: nextId,
      type: "group",
      parentId: null,
      operator: "and",
      position: conditions.length,
      children: [],
    };
    
    onChange([...conditions, newGroup]);
    setNextId(nextId + 1);
  };

  // Update a condition
  const updateCondition = (id: number, updates: Partial<Condition>) => {
    const updatedConditions = conditions.map(condition => {
      if (condition.id === id) {
        return { ...condition, ...updates };
      }
      return condition;
    });
    
    onChange(updatedConditions);
  };

  // Delete a condition
  const deleteCondition = (id: number) => {
    const filteredConditions = conditions.filter(condition => condition.id !== id);
    onChange(filteredConditions);
  };

  // Add a nested condition inside a group
  const addNestedCondition = (parentId: number) => {
    const updatedConditions = [...conditions];
    const parentIndex = updatedConditions.findIndex(c => c.id === parentId);
    
    if (parentIndex !== -1 && updatedConditions[parentIndex].type === "group") {
      const parent = updatedConditions[parentIndex];
      const children = parent.children || [];
      
      const newCondition: Condition = {
        id: nextId,
        type: "condition",
        parentId: parentId,
        operator: "equals",
        attribute: "",
        value: "",
        position: children.length,
      };
      
      updatedConditions[parentIndex] = {
        ...parent,
        children: [...children, newCondition],
      };
      
      onChange(updatedConditions);
      setNextId(nextId + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 mb-6">
        <Label htmlFor="connection-select" className="min-w-36">Select LDAP Connection:</Label>
        <Select
          value={selectedConnectionId?.toString() || ""}
          onValueChange={(value) => setSelectedConnectionId(parseInt(value, 10))}
        >
          <SelectTrigger id="connection-select" className="w-[260px]">
            <SelectValue placeholder="Select a connection" />
          </SelectTrigger>
          <SelectContent>
            {connections.map((connection) => (
              <SelectItem key={connection.id} value={connection.id.toString()}>
                {connection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Button onClick={addCondition} variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Condition
        </Button>
        <Button onClick={addGroup} variant="outline" size="sm">
          <Layers className="mr-1 h-4 w-4" />
          Add Group
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={conditions.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {conditions.length === 0 ? (
              <div className="border border-dashed rounded-lg p-6 text-center">
                <p className="text-muted-foreground">No conditions defined. Add a condition or group to get started.</p>
              </div>
            ) : (
              conditions.map(condition => (
                <ConditionItem
                  key={condition.id}
                  condition={condition}
                  attributes={attributes || []}
                  isLoadingAttributes={isLoadingAttributes}
                  onUpdate={(updates) => updateCondition(condition.id, updates)}
                  onDelete={() => deleteCondition(condition.id)}
                  onAddNested={
                    condition.type === "group" 
                      ? () => addNestedCondition(condition.id) 
                      : undefined
                  }
                  selectedConnectionId={selectedConnectionId}
                />
              ))
            )}
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeId ? (
            <div className="bg-background border rounded-lg p-4 shadow-lg">
              Dragging Item {activeId}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface ConditionItemProps {
  condition: Condition;
  attributes: LdapAttribute[];
  isLoadingAttributes: boolean;
  onUpdate: (updates: Partial<Condition>) => void;
  onDelete: () => void;
  onAddNested?: () => void;
  selectedConnectionId: number | null;
}

function ConditionItem({ 
  condition, 
  attributes, 
  isLoadingAttributes, 
  onUpdate, 
  onDelete,
  onAddNested,
  selectedConnectionId
}: ConditionItemProps) {
  const {
    attributes: sortableAttributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: condition.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (condition.type === "group") {
    return (
      <div ref={setNodeRef} style={style} className="relative">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="cursor-move" {...sortableAttributes} {...listeners}>
                  <MoveVertical className="h-3 w-3 mr-1" />
                  Drag
                </Badge>
                
                <Label>Group Operator:</Label>
                <Select
                  value={condition.operator}
                  onValueChange={(value) => onUpdate({ operator: value })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOperators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={onAddNested}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete}>
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            
            <div className="pl-6 border-l-2 border-primary/20 mt-4 space-y-3">
              {condition.children && condition.children.length > 0 ? (
                condition.children.map((child) => (
                  <NestedConditionItem
                    key={child.id}
                    condition={child}
                    attributes={attributes}
                    isLoadingAttributes={isLoadingAttributes}
                    onUpdate={(updates) => {
                      const updatedChildren = condition.children?.map((c) => {
                        if (c.id === child.id) {
                          return { ...c, ...updates };
                        }
                        return c;
                      });
                      onUpdate({ children: updatedChildren });
                    }}
                    onDelete={() => {
                      const updatedChildren = condition.children?.filter((c) => c.id !== child.id);
                      onUpdate({ children: updatedChildren });
                    }}
                    selectedConnectionId={selectedConnectionId}
                  />
                ))
              ) : (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  <p>No conditions in this group.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={onAddNested}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Condition
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="outline" className="cursor-move" {...sortableAttributes} {...listeners}>
              <MoveVertical className="h-3 w-3 mr-1" />
              Drag
            </Badge>
            
            <div className="flex-1 min-w-52">
              <Label htmlFor={`attribute-${condition.id}`} className="mb-1 block text-xs">
                Attribute
              </Label>
              {isLoadingAttributes ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Loading attributes...</span>
                </div>
              ) : !selectedConnectionId ? (
                <Input
                  id={`attribute-${condition.id}`}
                  value={condition.attribute || ""}
                  onChange={(e) => onUpdate({ attribute: e.target.value })}
                  placeholder="Select a connection first"
                  className="w-full"
                />
              ) : (
                <Select
                  value={condition.attribute || ""}
                  onValueChange={(value) => onUpdate({ attribute: value })}
                >
                  <SelectTrigger id={`attribute-${condition.id}`} className="w-full">
                    <SelectValue placeholder="Select attribute" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.map((attr) => (
                      <SelectItem key={attr.id} value={attr.name}>
                        {attr.displayName || attr.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom attribute...</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="w-36">
              <Label htmlFor={`operator-${condition.id}`} className="mb-1 block text-xs">
                Operator
              </Label>
              <Select
                value={condition.operator}
                onValueChange={(value) => onUpdate({ operator: value })}
              >
                <SelectTrigger id={`operator-${condition.id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditionOperators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-52">
              <Label htmlFor={`value-${condition.id}`} className="mb-1 block text-xs">
                Value
              </Label>
              <Input
                id={`value-${condition.id}`}
                value={condition.value || ""}
                onChange={(e) => onUpdate({ value: e.target.value })}
                placeholder="Value"
                className="w-full"
                disabled={["present", "notPresent"].includes(condition.operator)}
              />
            </div>
            
            <Button variant="ghost" size="icon" onClick={onDelete} className="self-end mb-0.5">
              <Trash className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface NestedConditionItemProps {
  condition: Condition;
  attributes: LdapAttribute[];
  isLoadingAttributes: boolean;
  onUpdate: (updates: Partial<Condition>) => void;
  onDelete: () => void;
  selectedConnectionId: number | null;
}

function NestedConditionItem({ 
  condition, 
  attributes, 
  isLoadingAttributes, 
  onUpdate, 
  onDelete,
  selectedConnectionId
}: NestedConditionItemProps) {
  return (
    <Card className="border-muted">
      <CardContent className="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-40">
            <Label htmlFor={`nested-attribute-${condition.id}`} className="mb-1 block text-xs">
              Attribute
            </Label>
            {isLoadingAttributes ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : !selectedConnectionId ? (
              <Input
                id={`nested-attribute-${condition.id}`}
                value={condition.attribute || ""}
                onChange={(e) => onUpdate({ attribute: e.target.value })}
                placeholder="Select a connection first"
                className="w-full"
              />
            ) : (
              <Select
                value={condition.attribute || ""}
                onValueChange={(value) => onUpdate({ attribute: value })}
              >
                <SelectTrigger id={`nested-attribute-${condition.id}`} className="w-full">
                  <SelectValue placeholder="Select attribute" />
                </SelectTrigger>
                <SelectContent>
                  {attributes.map((attr) => (
                    <SelectItem key={attr.id} value={attr.name}>
                      {attr.displayName || attr.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom attribute...</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="w-32">
            <Label htmlFor={`nested-operator-${condition.id}`} className="mb-1 block text-xs">
              Operator
            </Label>
            <Select
              value={condition.operator}
              onValueChange={(value) => onUpdate({ operator: value })}
            >
              <SelectTrigger id={`nested-operator-${condition.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conditionOperators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-40">
            <Label htmlFor={`nested-value-${condition.id}`} className="mb-1 block text-xs">
              Value
            </Label>
            <Input
              id={`nested-value-${condition.id}`}
              value={condition.value || ""}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="Value"
              className="w-full"
              disabled={["present", "notPresent"].includes(condition.operator)}
            />
          </div>
          
          <Button variant="ghost" size="icon" onClick={onDelete} className="self-end mb-0.5">
            <Trash className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
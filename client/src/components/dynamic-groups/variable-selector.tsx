import React, { useState, useRef, useEffect } from 'react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { PlusCircle, Database, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from '@tanstack/react-query';
import { LdapConnection } from '@shared/schema';

interface VariableSelectorProps {
  onSelectVariable: (variable: string) => void;
  connections: number[];
  isForOU?: boolean;
}

// Common LDAP attributes that might be useful as variables
const COMMON_ATTRIBUTES = [
  { value: 'sAMAccountName', label: 'sAMAccountName', description: 'Account name (username)' },
  { value: 'givenName', label: 'givenName', description: 'First name' },
  { value: 'sn', label: 'sn', description: 'Last name (surname)' },
  { value: 'displayName', label: 'displayName', description: 'Display name' },
  { value: 'mail', label: 'mail', description: 'Email address' },
  { value: 'department', label: 'department', description: 'Department' },
  { value: 'company', label: 'company', description: 'Company' },
  { value: 'title', label: 'title', description: 'Job title' },
  { value: 'manager', label: 'manager', description: 'Manager DN' },
  { value: 'employeeID', label: 'employeeID', description: 'Employee ID' },
  { value: 'memberOf', label: 'memberOf', description: 'Group memberships' },
  { value: 'objectSid', label: 'objectSid', description: 'Security identifier' },
  { value: 'whenCreated', label: 'whenCreated', description: 'Creation date' },
  { value: 'physicalDeliveryOfficeName', label: 'physicalDeliveryOfficeName', description: 'Office' },
  { value: 'streetAddress', label: 'streetAddress', description: 'Street address' },
  { value: 'l', label: 'l', description: 'City' },
  { value: 'st', label: 'st', description: 'State/province' },
  { value: 'postalCode', label: 'postalCode', description: 'Postal code' },
  { value: 'c', label: 'c', description: 'Country code' },
  { value: 'telephoneNumber', label: 'telephoneNumber', description: 'Phone number' },
  { value: 'mobile', label: 'mobile', description: 'Mobile number' },
  { value: 'ipPhone', label: 'ipPhone', description: 'IP phone' },
];

const VariableSelector: React.FC<VariableSelectorProps> = ({ onSelectVariable, connections, isForOU = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customAttribute, setCustomAttribute] = useState('');
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Get LDAP connection details to determine domain name for rootDSE
  const { data: ldapConnections = [] } = useQuery<LdapConnection[]>({
    queryKey: ['/api/ldap-connections'],
    staleTime: 60000,
  });

  // Find the first selected connection to get domain info
  const selectedConnection = ldapConnections.find(conn => connections.includes(conn.id));
  
  // Generate rootDSE string based on selected connection's domain
  const getRootDSE = () => {
    if (!selectedConnection || !selectedConnection.domain) {
      return "DC=example,DC=com";
    }
    
    const domainParts = selectedConnection.domain.split('.');
    return domainParts.map(part => `DC=${part}`).join(',');
  };
  
  const addRootDSE = () => {
    const rootDSE = getRootDSE();
    onSelectVariable(rootDSE);
    setIsOpen(false);
  };
  
  const handleSelect = (attribute: string) => {
    if (isForOU) {
      // Format OU path with proper prefixes
      const formattedVar = `OU={${attribute}}`;
      onSelectVariable(formattedVar);
    } else {
      // Format for group name with CN prefix
      const formattedVar = `CN={${attribute}}`;
      onSelectVariable(formattedVar);
    }
    setIsOpen(false);
  };

  const handleAddCustomAttribute = () => {
    if (!customAttribute.trim()) {
      toast({
        title: "Invalid attribute",
        description: "Please enter an attribute name",
        variant: "destructive"
      });
      return;
    }

    if (isForOU) {
      // Format custom attribute as OU path segment
      const formattedVar = `OU={${customAttribute.trim()}}`;
      onSelectVariable(formattedVar);
    } else {
      // Format custom attribute for group name with CN prefix
      const formattedVar = `CN={${customAttribute.trim()}}`;
      onSelectVariable(formattedVar);
    }
    setCustomAttribute('');
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          type="button"
          className="ml-2 h-8 gap-1"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Add Variable</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search attributes..." />
          
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No attributes found</CommandEmpty>
            
            {isForOU && (
              <CommandGroup heading="Domain Options">
                <CommandItem
                  value="rootDSE"
                  onSelect={addRootDSE}
                  className="flex items-center"
                >
                  <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">Add RootDSE</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConnection?.domain ? 
                        `Adds ${getRootDSE()} from ${selectedConnection.name}` : 
                        'Adds DC=example,DC=com (no connection selected)'}
                    </p>
                  </div>
                </CommandItem>
              </CommandGroup>
            )}
            
            <CommandGroup heading="Custom Attribute">
              <div className="flex items-center px-2 py-1.5">
                <Input
                  ref={inputRef}
                  value={customAttribute}
                  onChange={(e) => setCustomAttribute(e.target.value)}
                  placeholder="Enter attribute name"
                  className="flex-1 h-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddCustomAttribute}
                  className="ml-1"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CommandGroup>
            
            <CommandGroup heading="Common Attributes">
              {COMMON_ATTRIBUTES.map((attribute) => (
                <CommandItem
                  key={attribute.value}
                  value={attribute.value}
                  onSelect={() => handleSelect(attribute.value)}
                  className="flex items-center"
                >
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{attribute.label}</p>
                    <p className="text-xs text-muted-foreground">{attribute.description}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default VariableSelector;
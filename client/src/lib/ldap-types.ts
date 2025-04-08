// LDAP query types
export enum LdapOperator {
  // Logical operators
  AND = "and",
  OR = "or",
  NOT = "not",
  
  // Comparison operators
  EQUALS = "equals",
  NOT_EQUALS = "notEquals",
  STARTS_WITH = "startsWith",
  ENDS_WITH = "endsWith",
  CONTAINS = "contains",
  GREATER_THAN = "greaterThan",
  LESS_THAN = "lessThan",
  PRESENT = "present", // attribute exists
  APPROX = "approx", // approximately equals
}

// Type definition for an LDAP condition
export interface LdapCondition {
  operator: LdapOperator;
  attribute?: string; // Not required for logical operators (AND, OR, NOT)
  value?: string; // Not required for some operators (PRESENT, logical operators)
  conditions?: LdapCondition[]; // For nested conditions with logical operators
}

// Type definition for an LDAP attribute
export interface LdapAttribute {
  name: string;
  type: string;
  description?: string;
  syntax?: string;
  isMultiValued?: boolean;
  isMandatory?: boolean;
}
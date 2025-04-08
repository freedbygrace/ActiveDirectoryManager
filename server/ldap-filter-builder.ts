import { z } from "zod";

// Define the operator types for LDAP filters
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

// Define the condition schema for LDAP filter conditions
export type LdapCondition = {
  operator: LdapOperator;
  attribute?: string; // Not required for logical operators (AND, OR, NOT)
  value?: string; // Not required for some operators (PRESENT, logical operators)
  conditions?: LdapCondition[]; // For nested conditions with logical operators
};

export const ldapConditionSchema: z.ZodType<LdapCondition> = z.object({
  operator: z.nativeEnum(LdapOperator),
  attribute: z.string().optional(), // Not required for logical operators (AND, OR, NOT)
  value: z.string().optional(), // Not required for some operators (PRESENT, logical operators)
  conditions: z.array(z.lazy(() => ldapConditionSchema)).optional(), // For nested conditions with logical operators
});

// Define the query builder schema
export const ldapQueryBuilderSchema = z.object({
  targetObject: z.enum(["users", "groups", "computers", "ous"]),
  filter: ldapConditionSchema,
});

// Type definitions for the query builder
export type LdapQueryBuilder = z.infer<typeof ldapQueryBuilderSchema>;

/**
 * Convert a condition object to a valid LDAP filter string
 */
export function buildLdapFilter(condition: LdapCondition): string {
  // Handle logical operators
  if (condition.operator === LdapOperator.AND && condition.conditions) {
    const subConditions = condition.conditions.map(buildLdapFilter).join("");
    return `(&${subConditions})`;
  }

  if (condition.operator === LdapOperator.OR && condition.conditions) {
    const subConditions = condition.conditions.map(buildLdapFilter).join("");
    return `(|${subConditions})`;
  }

  if (condition.operator === LdapOperator.NOT && condition.conditions && condition.conditions.length > 0) {
    return `(!${buildLdapFilter(condition.conditions[0])})`;
  }

  // Handle comparison operators
  if (!condition.attribute) {
    throw new Error(`Attribute is required for operator ${condition.operator}`);
  }

  switch (condition.operator) {
    case LdapOperator.EQUALS:
      return `(${condition.attribute}=${escapeFilterValue(condition.value || "")})`;
    case LdapOperator.NOT_EQUALS:
      return `(!(${condition.attribute}=${escapeFilterValue(condition.value || "")}))`;
    case LdapOperator.STARTS_WITH:
      return `(${condition.attribute}=${escapeFilterValue(condition.value || "")}*)`;
    case LdapOperator.ENDS_WITH:
      return `(${condition.attribute}=*${escapeFilterValue(condition.value || "")})`;
    case LdapOperator.CONTAINS:
      return `(${condition.attribute}=*${escapeFilterValue(condition.value || "")}*)`;
    case LdapOperator.GREATER_THAN:
      return `(${condition.attribute}>${escapeFilterValue(condition.value || "")})`;
    case LdapOperator.LESS_THAN:
      return `(${condition.attribute}<${escapeFilterValue(condition.value || "")})`;
    case LdapOperator.PRESENT:
      return `(${condition.attribute}=*)`;
    case LdapOperator.APPROX:
      return `(${condition.attribute}~=${escapeFilterValue(condition.value || "")})`;
    default:
      throw new Error(`Unsupported operator: ${condition.operator}`);
  }
}

/**
 * Get common LDAP object classes for different target object types
 */
export function getObjectClassFilter(targetObject: string): string {
  switch (targetObject) {
    case "users":
      return "(&(objectClass=user)(!(objectClass=computer)))";
    case "groups":
      return "(objectClass=group)";
    case "computers":
      return "(objectClass=computer)";
    case "ous":
      return "(objectClass=organizationalUnit)";
    default:
      return "(objectClass=*)";
  }
}

/**
 * Generate a combined LDAP filter by joining the user-defined filter with the appropriate object class filter
 */
export function generateLdapFilter(queryBuilder: LdapQueryBuilder): string {
  const objectClassFilter = getObjectClassFilter(queryBuilder.targetObject);
  const userFilter = buildLdapFilter(queryBuilder.filter);
  
  // Combine the two filters with AND
  return `(&${objectClassFilter}${userFilter})`;
}

/**
 * Escape special characters in LDAP filter values according to RFC 4515
 */
function escapeFilterValue(value: string): string {
  return value
    .replace(/\\/g, "\\5c") // Must be first to avoid double escaping
    .replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29")
    .replace(/\0/g, "\\00")
    .replace(/\//g, "\\2f");
}

/**
 * Validate a query builder object and ensure it has the required properties
 */
export function validateQueryBuilder(queryBuilder: unknown): LdapQueryBuilder {
  return ldapQueryBuilderSchema.parse(queryBuilder);
}

/**
 * Get human-readable text representation of an LDAP filter condition
 */
export function getHumanReadableFilter(condition: LdapCondition, indent = 0): string {
  const spaces = " ".repeat(indent);
  
  switch (condition.operator) {
    case LdapOperator.AND:
      return `${spaces}ALL of the following conditions:\n` + 
        (condition.conditions?.map(c => getHumanReadableFilter(c, indent + 2)).join("\n") || "");
    
    case LdapOperator.OR:
      return `${spaces}ANY of the following conditions:\n` + 
        (condition.conditions?.map(c => getHumanReadableFilter(c, indent + 2)).join("\n") || "");
    
    case LdapOperator.NOT:
      return `${spaces}NOT the following condition:\n` + 
        (condition.conditions && condition.conditions.length > 0 
          ? getHumanReadableFilter(condition.conditions[0], indent + 2) 
          : "");
    
    case LdapOperator.EQUALS:
      return `${spaces}${condition.attribute} equals "${condition.value}"`;
    
    case LdapOperator.NOT_EQUALS:
      return `${spaces}${condition.attribute} does not equal "${condition.value}"`;
    
    case LdapOperator.STARTS_WITH:
      return `${spaces}${condition.attribute} starts with "${condition.value}"`;
    
    case LdapOperator.ENDS_WITH:
      return `${spaces}${condition.attribute} ends with "${condition.value}"`;
    
    case LdapOperator.CONTAINS:
      return `${spaces}${condition.attribute} contains "${condition.value}"`;
    
    case LdapOperator.GREATER_THAN:
      return `${spaces}${condition.attribute} is greater than "${condition.value}"`;
    
    case LdapOperator.LESS_THAN:
      return `${spaces}${condition.attribute} is less than "${condition.value}"`;
    
    case LdapOperator.PRESENT:
      return `${spaces}${condition.attribute} exists`;
    
    case LdapOperator.APPROX:
      return `${spaces}${condition.attribute} is approximately equal to "${condition.value}"`;
    
    default:
      return `${spaces}Unknown condition`;
  }
}